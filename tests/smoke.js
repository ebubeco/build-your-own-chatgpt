// Smoke test for the hardware/goal recommendation wizard.
//
// Walks every combination of goal (5 scorable goals) x hardware tier (6) =
// 30 combinations and asserts a readiness score actually renders for each
// one, with no "Unknown tier" warning and no uncaught page error. Also
// separately verifies the 6th goal card ("I Don't Know" / data-goal=
// "unknown") doesn't crash -- it intentionally stays on the goal step
// instead of advancing to hardware selection (see selectGoal() in app.js),
// so it's checked with its own assertion rather than forced into the
// goal+hardware->score shape the other 5 goals follow.
//
// This exists because of a real incident: a tier-naming mismatch between
// gpus.json (the hardware-picker UI) and models_compendium.json (the
// recommendation data) silently broke 3 of 6 hardware options -- clicking
// Mid-range GPU, Power GPU, or Apple Silicon produced no result and no
// visible error, just a console.warn nobody was watching. It was only
// found by a manual "test everything" pass. This script exists so the next
// regression like it fails a PR check in seconds instead of shipping.
//
// Usage: node tests/smoke.js
// Exit code 0 = every check passed. Exit code 1 = at least one failed.

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 3344; // dedicated port so this never collides with a dev server
const BASE_URL = `http://localhost:${PORT}`;
const SERVER_SCRIPT = path.join(__dirname, '..', 'server.js');

const GOALS = ['chat', 'coding', 'writing', 'documents', 'agents'];
const HARDWARE = [
  'old-laptop',
  'modern-laptop-no-gpu',
  'budget-gpu',
  'mid-gpu',
  'high-end-gpu',
  'apple-silicon'
];

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    function attempt() {
      http.get(url, (res) => {
        res.resume();
        resolve();
      }).on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error('Server did not become ready within ' + timeoutMs + 'ms'));
        } else {
          setTimeout(attempt, 150);
        }
      });
    }
    attempt();
  });
}

async function testCombo(browser, goal, hardwareId) {
  // A fresh browser context per combo (not just a fresh page/navigation)
  // guarantees genuinely isolated localStorage, JS execution state, and
  // console listeners -- reusing one page across all 30+ iterations let a
  // warning from one combo bleed into the next combo's result, which
  // produced false failures on combos that were actually fine.
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleWarnings = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'warning' || msg.type() === 'error') {
      consoleWarnings.push(msg.text());
    }
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    // 'domcontentloaded' instead of 'load': the page pulls in several
    // cross-origin resources (Google Fonts, Plausible, Umami, Vercel
    // Insights, Supabase) that are irrelevant to the wizard itself and can
    // hang rather than fail fast in a restricted network environment --
    // waiting for the full 'load' event intermittently stalled this test
    // for 30s+ after enough page loads. The wizard only needs the
    // same-origin HTML/app.js to be parsed and ready.
    await page.goto(BASE_URL + '/index.html', { waitUntil: 'domcontentloaded' });

    await page.click(`.goal-card[data-goal="${goal}"]`);
    await page.waitForTimeout(300);

    const hwCard = page.locator(`.hw-card[data-id="${hardwareId}"]`);
    await hwCard.waitFor({ state: 'visible', timeout: 5000 });

    // The wizard also runs its own GPU auto-detect on every page load
    // (independent of anything this test clicks) and, in headless Chromium
    // with no real GPU adapter, it reliably falls back to a "mid-gpu" match
    // -- logging its own "Unknown tier" warning well before this test's
    // deliberate click ever happens. Clear the capture buffers right before
    // the deliberate click so only warnings/errors caused BY that click are
    // attributed to this combo's result.
    consoleWarnings.length = 0;
    pageErrors.length = 0;

    await hwCard.click();
    await page.waitForTimeout(500);

    const scoreLocator = page.locator('.score-number');
    const scoreCount = await scoreLocator.count();
    const scoreText = scoreCount > 0 ? (await scoreLocator.first().textContent() || '').trim() : null;

    const unknownTierWarning = consoleWarnings.find((w) => w.indexOf('Unknown tier') > -1);
    const scoreValid = !!scoreText && /^\d+\/10$/.test(scoreText);

    const ok = scoreValid && !unknownTierWarning && pageErrors.length === 0;

    return {
      goal,
      hardwareId,
      ok,
      scoreText,
      unknownTierWarning: unknownTierWarning || null,
      pageErrors
    };
  } finally {
    await context.close();
  }
}

async function testUnknownGoal(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    // 'domcontentloaded' instead of 'load': the page pulls in several
    // cross-origin resources (Google Fonts, Plausible, Umami, Vercel
    // Insights, Supabase) that are irrelevant to the wizard itself and can
    // hang rather than fail fast in a restricted network environment --
    // waiting for the full 'load' event intermittently stalled this test
    // for 30s+ after enough page loads. The wizard only needs the
    // same-origin HTML/app.js to be parsed and ready.
    await page.goto(BASE_URL + '/index.html', { waitUntil: 'domcontentloaded' });

    await page.click('.goal-card[data-goal="unknown"]');
    await page.waitForTimeout(300);

    const bodyClass = await page.evaluate(() => document.body.className);
    const staysOnGoalStep = bodyClass.indexOf('wizard-step-goal') > -1;

    return {
      label: 'goal=unknown ("I Don\'t Know")',
      ok: staysOnGoalStep && pageErrors.length === 0,
      bodyClass,
      pageErrors
    };
  } finally {
    await context.close();
  }
}

async function main() {
  console.log('Starting local server on port ' + PORT + ' ...');
  const serverEnv = Object.assign({}, process.env, { PORT: String(PORT) });
  const server = spawn(process.execPath, [SERVER_SCRIPT], { env: serverEnv, stdio: 'pipe' });

  let serverOutput = '';
  server.stdout.on('data', (d) => { serverOutput += d.toString(); });
  server.stderr.on('data', (d) => { serverOutput += d.toString(); });

  server.on('error', (err) => {
    console.error('Failed to start server.js:', err.message);
    process.exit(1);
  });

  try {
    await waitForServer(BASE_URL + '/index.html', 15000);
  } catch (err) {
    console.error(err.message);
    console.error('--- server output ---');
    console.error(serverOutput);
    server.kill();
    process.exit(1);
  }

  console.log('Server ready. Launching browser...\n');
  let browser;
  try {
    browser = await chromium.launch();

    const results = [];
    for (const goal of GOALS) {
      for (const hardwareId of HARDWARE) {
        const result = await testCombo(browser, goal, hardwareId);
        results.push(result);
        const status = result.ok ? 'PASS' : 'FAIL';
        console.log(
          `[${status}] goal=${goal.padEnd(10)} hardware=${hardwareId.padEnd(22)} score=${result.scoreText || 'MISSING'}`
        );
      }
    }

    const unknownResult = await testUnknownGoal(browser);
    results.push({
      goal: unknownResult.label,
      hardwareId: 'n/a',
      ok: unknownResult.ok,
      scoreText: unknownResult.ok ? '(correctly stays on goal step)' : null,
      unknownTierWarning: null,
      pageErrors: unknownResult.pageErrors
    });
    console.log(
      `[${unknownResult.ok ? 'PASS' : 'FAIL'}] ${unknownResult.label.padEnd(33)} bodyClass=${unknownResult.bodyClass}`
    );

    const failures = results.filter((r) => !r.ok);

    console.log('');
    console.log(`${results.length - failures.length}/${results.length} checks passed.`);

    if (failures.length > 0) {
      console.log('\nFAILURES:');
      for (const f of failures) {
        console.log(`\n- goal=${f.goal} hardware=${f.hardwareId}`);
        console.log(`  score: ${f.scoreText || 'MISSING'}`);
        if (f.unknownTierWarning) console.log(`  warning: ${f.unknownTierWarning}`);
        if (f.pageErrors.length) console.log(`  page errors: ${JSON.stringify(f.pageErrors)}`);
      }
      process.exitCode = 1;
    } else {
      process.exitCode = 0;
    }
  } finally {
    // Always tear down, even if a test throws mid-loop -- an earlier version
    // of this script left an orphaned server process holding the port open
    // on crash, which then silently interfered with the next run.
    if (browser) await browser.close().catch(() => {});
    server.kill();
  }
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exitCode = 1;
});
