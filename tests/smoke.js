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

// Navigate with a few retries. The dev server is local and static, but under
// resource pressure (many rapid browser contexts, a loaded CI runner) a single
// page.goto can occasionally exceed its timeout. That's transient -- retrying
// the navigation clears it. A real regression still surfaces later as a
// missing score or an "Unknown tier" warning, neither of which is retried
// here, so this only papers over flakiness, not actual failures.
async function gotoWithRetry(page, url, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
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
    await gotoWithRetry(page, BASE_URL + '/index.html');

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
    await gotoWithRetry(page, BASE_URL + '/index.html');

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

// The seven interactive tool pages the wizard smoke test never touched. Each
// one fetches a data file and renders from it, so the same "a data/tier change
// silently breaks the page" class of bug can hit them too -- and until now CI
// would stay green while it did. For the pages that render on load we assert
// the expected content appeared; for the search-driven pages we type a query
// and assert the model dropdown populated (which exercises the fetch + render).
const TOOL_PAGES = [
  { name: 'compendium',    url: '/compendium.html',    ready: (p) => p.locator('.comp-card').count().then((n) => ({ ok: n >= 10, detail: n + ' model cards' })) },
  { name: 'career',        url: '/career.html',        ready: (p) => p.locator('.cr-card').count().then((n) => ({ ok: n >= 5, detail: n + ' role cards' })) },
  { name: 'use-cases',     url: '/use-cases.html',     ready: (p) => p.locator('.uc-card').count().then((n) => ({ ok: n >= 3, detail: n + ' use-case cards' })) },
  { name: 'cost',          url: '/cost.html',          ready: (p) => p.locator('#calc-btn').count().then((n) => ({ ok: n === 1, detail: 'calculator ' + (n ? 'ready' : 'missing') })) },
  { name: 'compare',       url: '/compare.html',       search: { input: '#msearch', q: 'qwen', results: '#mdrop [data-pick]' } },
  { name: 'commands',      url: '/commands.html',      search: { input: '#mdl-search', q: 'qwen', results: '#mdl-drop [data-id]' } },
  { name: 'compatibility', url: '/compatibility.html', search: { input: '#model-search', q: 'qwen', results: '#model-dropdown [data-id]' } }
];

// Console errors from the external analytics/font/Supabase hosts are expected
// noise in a sandbox (DNS blocked) and say nothing about the page's own code.
// Only same-origin / app-logic errors should fail a check.
function isExternalNoise(msg) {
  return /plausible|umami|vercel|insights|supabase|gstatic|googleapis|ERR_NAME_NOT_RESOLVED|ERR_ABORTED|ERR_INTERNET_DISCONNECTED|_vercel\/insights/i.test(msg);
}

async function testToolPage(browser, tp) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    // Include the resource URL: a failed external script/beacon logs a generic
    // "Failed to load resource: 404/net::ERR_..." whose message text has no host
    // in it -- the host only shows up in the location, so the noise filter needs
    // to see it (e.g. /_vercel/insights/script.js, which only exists on Vercel).
    const loc = (msg.location && msg.location().url) || '';
    consoleErrors.push(msg.text() + (loc ? ' @ ' + loc : ''));
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  try {
    await gotoWithRetry(page, BASE_URL + tp.url);
    await page.waitForTimeout(500); // let the data fetch + initial render settle

    let rendered = false;
    let detail = '';
    if (tp.search) {
      const inp = page.locator(tp.search.input);
      await inp.waitFor({ state: 'visible', timeout: 5000 });
      await inp.fill(tp.search.q);
      await page.waitForTimeout(400);
      const n = await page.locator(tp.search.results).count();
      rendered = n > 0;
      detail = n + ' search results';
    } else {
      const r = await tp.ready(page);
      rendered = r.ok;
      detail = r.detail;
    }

    const realConsole = consoleErrors.filter((e) => !isExternalNoise(e));
    const realPageErrors = pageErrors.filter((e) => !isExternalNoise(e));
    const ok = rendered && realPageErrors.length === 0 && realConsole.length === 0;
    return { name: tp.name, ok, detail, consoleErrors: realConsole, pageErrors: realPageErrors };
  } catch (e) {
    return { name: tp.name, ok: false, detail: 'threw: ' + e.message, consoleErrors, pageErrors };
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

    console.log('');
    for (const tp of TOOL_PAGES) {
      const r = await testToolPage(browser, tp);
      results.push({
        goal: 'tool:' + r.name,
        hardwareId: 'n/a',
        ok: r.ok,
        scoreText: r.detail,
        unknownTierWarning: r.consoleErrors && r.consoleErrors.length ? r.consoleErrors[0] : null,
        pageErrors: r.pageErrors || []
      });
      console.log(`[${r.ok ? 'PASS' : 'FAIL'}] tool=${r.name.padEnd(16)} ${r.detail}`);
    }

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
