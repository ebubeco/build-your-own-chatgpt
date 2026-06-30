/* Interactive enhancements — scroll reveal, cursor spotlight, animated counters,
   chat-typing, scroll progress bar, connecting-line fill. All progressive
   enhancement: content is visible without JS; all motion respects
   prefers-reduced-motion; cursor effects skipped on touch devices. */
(function () {
  'use strict';
  if (window.__byocInteractive) return;
  window.__byocInteractive = true;

  var motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = !window.matchMedia('(hover: none)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- 1. Top scroll progress bar ---------- */
  function setupScrollProgress() {
    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docH > 0 ? (window.scrollY / docH) * 100 : 0;
      bar.style.transform = 'scaleX(' + (pct / 100) + ')';
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ---------- 2. Scroll-reveal sections ---------- */
  function setupScrollReveal() {
    if (!motionOk || !hasIO) return;
    var sel = '.section, .goal-card, .hw-card, .career-card, .step-card, .model-card, .tool-card, .cloud-card';
    var els = document.querySelectorAll(sel);
    els.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          // small stagger by element index within its parent
          var sibs = e.target.parentElement ? Array.prototype.indexOf.call(e.target.parentElement.children, e.target) : 0;
          e.target.style.transitionDelay = Math.min(sibs * 60, 360) + 'ms';
          e.target.classList.add('reveal-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 3. Animated number counter on hero stats ---------- */
  function setupCounters() {
    if (!motionOk || !hasIO) return;
    var stats = document.querySelectorAll('.hero-stat-num');
    if (!stats.length) return;

    function parse(text) {
      // Match optional $, integer, optional + or %, etc.
      var m = text.match(/^(\$)?(\d+(?:\.\d+)?)(.*)$/);
      if (!m) return null;
      return { prefix: m[1] || '', target: parseFloat(m[2]), suffix: m[3] || '' };
    }

    stats.forEach(function (el) {
      var orig = el.textContent.trim();
      var p = parse(orig);
      if (!p) return;
      el.dataset.target = orig;
      // Set the initial visible value to zero (preserve prefix/suffix)
      el.textContent = p.prefix + '0' + p.suffix;
    });

    function animate(el) {
      var p = parse(el.dataset.target || el.textContent);
      if (!p) return;
      var duration = 1200;
      var start = performance.now();
      function tick(now) {
        var t = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        var v = p.target * eased;
        var rounded = p.target >= 10 ? Math.round(v) : (Math.round(v * 10) / 10);
        el.textContent = p.prefix + rounded + p.suffix;
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = p.prefix + p.target + p.suffix;
      }
      requestAnimationFrame(tick);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    stats.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 4. Cursor spotlight on cards ---------- */
  function setupSpotlight() {
    if (!motionOk || !canHover) return;
    var sel = '.goal-card, .hw-card, .career-card, .step-card';
    var els = document.querySelectorAll(sel);
    els.forEach(function (el) { el.classList.add('has-spotlight'); });
    var pending = false;
    var lastX = 0, lastY = 0;
    function update() {
      pending = false;
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        // skip when far offscreen
        if (r.bottom < -50 || r.top > window.innerHeight + 50) return;
        el.style.setProperty('--mx', (lastX - r.left) + 'px');
        el.style.setProperty('--my', (lastY - r.top) + 'px');
      });
    }
    document.addEventListener('mousemove', function (e) {
      lastX = e.clientX; lastY = e.clientY;
      if (!pending) { pending = true; requestAnimationFrame(update); }
    }, { passive: true });
  }

  /* ---------- 5. Chat-mockup typing animation ---------- */
  function setupChatTyping() {
    if (!motionOk) return;
    // The first AI bubble (not the typing-dots placeholder)
    var aiMsg = document.querySelector('.chat-mock-body .cm-ai:not(.cm-typing)');
    if (!aiMsg) return;
    var fullText = aiMsg.textContent.trim();
    if (!fullText) return;
    // Preserve original for screen readers / if anything resets
    aiMsg.setAttribute('data-full', fullText);
    aiMsg.textContent = '';
    aiMsg.classList.add('typing-cursor');

    function startTyping() {
      var i = 0;
      function step() {
        i++;
        aiMsg.textContent = fullText.slice(0, i);
        if (i < fullText.length) {
          var ch = fullText.charAt(i - 1);
          var delay = 16 + Math.random() * 22;
          if (ch === '.' || ch === ',') delay += 90;
          setTimeout(step, delay);
        } else {
          setTimeout(function () { aiMsg.classList.remove('typing-cursor'); }, 320);
        }
      }
      step();
    }

    // Wait until visible (or start after a short delay if no IO)
    if (hasIO) {
      var seen = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !seen) {
            seen = true;
            setTimeout(startTyping, 450);
            io.unobserve(aiMsg);
          }
        });
      }, { threshold: 0.3 });
      io.observe(aiMsg);
    } else {
      setTimeout(startTyping, 700);
    }
  }

  /* ---------- 6. Scroll-fill connecting line in "How it works" ---------- */
  function setupHowItWorksLine() {
    if (!motionOk || !hasIO) return;
    var grid = document.querySelector('.how-it-works .steps-grid');
    if (!grid) return;
    grid.classList.add('line-pending');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { grid.classList.add('line-fill'); io.unobserve(grid); }
      });
    }, { threshold: 0.25 });
    io.observe(grid);
  }

  /* ---------- 7. Hero 3D mouse-parallax on the chat mockup ---------- */
  function setupHeroParallax() {
    if (!motionOk || !canHover) return;
    var hero = document.querySelector('.hero-visual');
    var mock = document.querySelector('.chat-mock');
    if (!hero || !mock) return;
    mock.classList.add('is-parallax');
    var pending = false;
    var tx = 0, ty = 0;
    function update() {
      pending = false;
      mock.style.setProperty('--rx', tx.toFixed(2));
      mock.style.setProperty('--ry', ty.toFixed(2));
    }
    // Listen on the whole hero/header area so users get feedback even when their
    // mouse is over the headline, not the mock itself
    var anchor = document.querySelector('.header') || hero;
    anchor.addEventListener('mousemove', function (e) {
      var r = anchor.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;   // 0..1
      var y = (e.clientY - r.top) / r.height;   // 0..1
      tx = (x - 0.5) * -10;   // rotateY range ±5deg
      ty = (y - 0.5) *  8;    // rotateX range ±4deg
      if (!pending) { pending = true; requestAnimationFrame(update); }
    }, { passive: true });
    anchor.addEventListener('mouseleave', function () {
      tx = 0; ty = 0;
      mock.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
      requestAnimationFrame(update);
      setTimeout(function () { mock.style.transition = ''; }, 520);
    });
  }

  /* ---------- 8. Magnetic primary CTAs (event-delegated so app.js-rendered
                  buttons that appear after the wizard advance also work) ---- */
  function setupMagneticButtons() {
    if (!motionOk || !canHover) return;
    var SELECTOR = '.btn-primary, .up-btn, .cost-btn, .chk-btn, .cta-btn, .compare-btn, .wa-btn, .uc-btn, .btn-share';
    var STRENGTH = 0.22;
    var MAX = 8;
    var raf = null;
    var pendingEl = null;
    var pendingDx = 0, pendingDy = 0;

    function flush() {
      if (pendingEl) {
        pendingEl.style.setProperty('--mag-x', pendingDx.toFixed(1) + 'px');
        pendingEl.style.setProperty('--mag-y', pendingDy.toFixed(1) + 'px');
      }
      raf = null;
    }

    document.addEventListener('mousemove', function (e) {
      var el = e.target.closest && e.target.closest(SELECTOR);
      if (!el) return;
      if (!el.classList.contains('is-magnet')) el.classList.add('is-magnet');
      var r = el.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) * STRENGTH;
      var dy = (e.clientY - (r.top  + r.height / 2)) * STRENGTH;
      pendingDx = Math.max(-MAX, Math.min(MAX, dx));
      pendingDy = Math.max(-MAX, Math.min(MAX, dy));
      pendingEl = el;
      if (!raf) raf = requestAnimationFrame(flush);
    }, { passive: true });

    document.addEventListener('mouseout', function (e) {
      var el = e.target.closest && e.target.closest(SELECTOR);
      if (!el) return;
      // only reset when the cursor truly leaves the button (relatedTarget is outside)
      if (el.contains(e.relatedTarget)) return;
      el.style.setProperty('--mag-x', '0px');
      el.style.setProperty('--mag-y', '0px');
    }, { passive: true });
  }

  /* ---------- 9. Live terminal demo ---------- */
  function setupTerminalDemo() {
    var body = document.getElementById('term-body');
    if (!body) return;
    // Static fallback for motion-reduce users — show the final state
    var finalHTML =
      '<span class="term-line"><span class="term-prompt">$</span> <span class="term-cmd">ollama run qwen2.5:7b</span></span>' +
      '<span class="term-line term-out">pulling manifest…</span>' +
      '<span class="term-line term-out">success</span>' +
      '<span class="term-line term-out"></span>' +
      '<span class="term-line term-out-accent">&gt;&gt;&gt; Hello! I&rsquo;m running entirely on your machine — what can I help you build?</span>';
    if (!motionOk || !hasIO) { body.innerHTML = finalHTML; return; }

    var seq = [
      { type: 'cmd',   text: 'ollama run qwen2.5:7b', preDelay: 350 },
      { type: 'wait',  delay: 420 },
      { type: 'out',   text: 'pulling manifest…',     preDelay: 80 },
      { type: 'wait',  delay: 520 },
      { type: 'out',   text: 'success',               preDelay: 60 },
      { type: 'wait',  delay: 380 },
      { type: 'blank' },
      { type: 'ai',    text: '>>> Hello! I’m running entirely on your machine — what can I help you build?', preDelay: 220 }
    ];

    function start() {
      body.innerHTML = '';
      var line = document.createElement('span');
      line.className = 'term-line';
      var prompt = document.createElement('span');
      prompt.className = 'term-prompt';
      prompt.textContent = '$ ';
      line.appendChild(prompt);
      var cmd = document.createElement('span');
      cmd.className = 'term-cmd';
      line.appendChild(cmd);
      var caret = document.createElement('span');
      caret.className = 'term-caret';
      line.appendChild(caret);
      body.appendChild(line);

      var step = 0;
      function run() {
        if (step >= seq.length) {
          caret.remove();
          return;
        }
        var s = seq[step];
        if (s.type === 'cmd') {
          setTimeout(function () {
            typeInto(cmd, s.text, function () { step++; run(); });
          }, s.preDelay || 0);
        } else if (s.type === 'out' || s.type === 'ai') {
          setTimeout(function () {
            caret.remove();
            var l = document.createElement('span');
            l.className = 'term-line ' + (s.type === 'ai' ? 'term-out-accent' : 'term-out');
            body.appendChild(l);
            typeInto(l, s.text, function () {
              caret = document.createElement('span');
              caret.className = 'term-caret';
              if (step < seq.length - 1) body.appendChild(caret);
              step++; run();
            }, s.type === 'ai' ? 18 : 12);
          }, s.preDelay || 0);
        } else if (s.type === 'blank') {
          var b = document.createElement('span');
          b.className = 'term-line';
          b.innerHTML = '&nbsp;';
          body.appendChild(b);
          step++; run();
        } else if (s.type === 'wait') {
          setTimeout(function () { step++; run(); }, s.delay);
        }
      }
      run();
    }

    function typeInto(el, text, done, baseDelay) {
      baseDelay = baseDelay || 22;
      var i = 0;
      function tick() {
        i++;
        el.textContent = text.slice(0, i);
        if (i < text.length) {
          var ch = text.charAt(i - 1);
          var d = baseDelay + Math.random() * 22;
          if (ch === ' ') d += 8;
          if (ch === '.' || ch === ',' || ch === '!') d += 80;
          setTimeout(tick, d);
        } else {
          done && done();
        }
      }
      tick();
    }

    var seen = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !seen) {
          seen = true;
          start();
          io.unobserve(body);
        }
      });
    }, { threshold: 0.4 });
    io.observe(body);
    // Fallback: also show final state immediately if user prefers reduced motion later
    body.setAttribute('data-fallback', finalHTML);
  }

  /* ---------- 10. Command palette (⌘K / Ctrl+K) ---------- */
  function setupCommandPalette() {
    // Items are page nav + actions; cheap and zero deps
    var COMMANDS = [
      // Navigation
      { group: 'Navigate', label: 'Home — Build wizard',          href: '/',                 icon: 'home' },
      { group: 'Navigate', label: 'Compare models side-by-side',  href: '/compare.html',     icon: 'compare' },
      { group: 'Navigate', label: 'Which AI? — Local vs cloud',   href: '/which-ai.html',    icon: 'split' },
      { group: 'Navigate', label: 'Use cases by goal',            href: '/use-cases.html',   icon: 'tag' },
      { group: 'Navigate', label: 'Starter pack',                 href: '/starter-pack.html', icon: 'pack' },
      { group: 'Navigate', label: 'Career recommendations',       href: '/career.html',      icon: 'briefcase' },
      { group: 'Navigate', label: 'Model compendium (53+ models)',href: '/compendium.html',  icon: 'grid' },
      { group: 'Navigate', label: 'Evaluators stack',             href: '/evaluators.html',  icon: 'check' },
      { group: 'Navigate', label: 'Cost calculator',              href: '/cost.html',        icon: 'dollar' },
      { group: 'Navigate', label: 'Hardware upgrade advisor',     href: '/upgrade.html',     icon: 'rocket' },
      { group: 'Navigate', label: 'Model compatibility checker',  href: '/compatibility.html', icon: 'cpu' },
      { group: 'Navigate', label: 'Ollama commands cheat-sheet',  href: '/commands.html',    icon: 'terminal' },
      // Actions
      { group: 'Actions', label: 'Toggle light / dark theme',     action: 'toggle-theme',    icon: 'theme', hint: 'T' },
      { group: 'Actions', label: 'Start the wizard over',         action: 'reset-wizard',    icon: 'refresh' },
      { group: 'Actions', label: 'Open GitHub repository',        href: 'https://github.com/ebubeco/build-your-own-chatgpt', icon: 'github', external: true }
    ];

    var ICONS = {
      home:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/></svg>',
      compare:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="7" height="14" rx="1"/><rect x="14" y="5" width="7" height="14" rx="1"/></svg>',
      split:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v8"/><path d="M6 21V11h12v10"/></svg>',
      tag:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12 12 4H4v8l8 8 8-8Z"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/></svg>',
      pack:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 14 9 5 9-5"/><path d="m3 11 9 5 9-5"/></svg>',
      briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
      grid:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
      check:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      dollar:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      rocket:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/></svg>',
      cpu:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>',
      terminal:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
      theme:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
      refresh:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
      github:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
      search:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    };

    var backdrop = document.createElement('div');
    backdrop.className = 'cmdk-backdrop';
    var modal = document.createElement('div');
    modal.className = 'cmdk-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Command palette');
    modal.innerHTML =
      '<div class="cmdk-search">' +
        '<span class="cmdk-search-icon">' + ICONS.search + '</span>' +
        '<input class="cmdk-input" placeholder="Type a page or action…" autocomplete="off" spellcheck="false" />' +
        '<span class="cmdk-esc">esc</span>' +
      '</div>' +
      '<div class="cmdk-list" role="listbox"></div>';
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    var input = modal.querySelector('.cmdk-input');
    var list  = modal.querySelector('.cmdk-list');
    var visible = COMMANDS.slice();
    var activeIndex = 0;
    var isOpen = false;

    function render() {
      var q = input.value.trim().toLowerCase();
      visible = q
        ? COMMANDS.filter(function (c) { return c.label.toLowerCase().indexOf(q) > -1 || c.group.toLowerCase().indexOf(q) > -1; })
        : COMMANDS.slice();
      activeIndex = 0;
      if (!visible.length) {
        list.innerHTML = '<div class="cmdk-empty">No matches for &ldquo;' + escapeHTML(q) + '&rdquo;.</div>';
        return;
      }
      var html = '';
      var lastGroup = null;
      visible.forEach(function (c, i) {
        if (c.group !== lastGroup) {
          html += '<div class="cmdk-group">' + c.group + '</div>';
          lastGroup = c.group;
        }
        html += '<div class="cmdk-item' + (i === 0 ? ' is-active' : '') + '" role="option" data-i="' + i + '">' +
                  '<span class="cmdk-item-icon">' + (ICONS[c.icon] || '') + '</span>' +
                  '<span class="cmdk-item-label">' + escapeHTML(c.label) + '</span>' +
                  (c.hint ? '<span class="cmdk-item-hint">' + c.hint + '</span>' : '') +
                '</div>';
      });
      list.innerHTML = html;
      Array.prototype.forEach.call(list.querySelectorAll('.cmdk-item'), function (el) {
        el.addEventListener('mousemove', function () { setActive(parseInt(el.dataset.i, 10)); });
        el.addEventListener('click', function () { execute(visible[parseInt(el.dataset.i, 10)]); });
      });
    }
    function setActive(i) {
      var items = list.querySelectorAll('.cmdk-item');
      if (!items.length) return;
      activeIndex = (i + items.length) % items.length;
      items.forEach(function (el, idx) { el.classList.toggle('is-active', idx === activeIndex); });
      var el = items[activeIndex];
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }
    function execute(c) {
      close();
      if (!c) return;
      if (c.action === 'toggle-theme') {
        var html = document.documentElement;
        var cur = html.getAttribute('data-theme');
        var next = cur === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
      } else if (c.action === 'reset-wizard') {
        try { localStorage.removeItem('byoc_recommendation'); } catch (e) {}
        location.href = '/';
      } else if (c.href) {
        if (c.external) window.open(c.href, '_blank', 'noopener'); else location.href = c.href;
      }
    }
    function open() {
      if (isOpen) return;
      isOpen = true;
      backdrop.classList.add('is-open');
      modal.classList.add('is-open');
      input.value = '';
      render();
      setTimeout(function () { input.focus(); }, 30);
      hideHint();
    }
    function close() {
      if (!isOpen) return;
      isOpen = false;
      backdrop.classList.remove('is-open');
      modal.classList.remove('is-open');
    }
    function escapeHTML(s) {
      return String(s).replace(/[&<>"']/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]; });
    }

    input.addEventListener('input', render);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      var isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        isOpen ? close() : open();
        return;
      }
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(activeIndex - 1); }
      else if (e.key === 'Enter')     { e.preventDefault(); execute(visible[activeIndex]); }
    });

    // small ⌘K hint chip, appears once after 4s, dismisses on open or after 8s
    var hint = document.createElement('div');
    hint.className = 'cmdk-hint';
    var isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    hint.innerHTML = 'Press <kbd>' + (isMac ? '⌘' : 'Ctrl') + '</kbd><kbd>K</kbd> for the command palette';
    document.body.appendChild(hint);
    var hideTimer = null;
    function showHint() { hint.classList.add('is-visible'); hideTimer = setTimeout(hideHint, 8000); }
    function hideHint() { hint.classList.remove('is-visible'); if (hideTimer) clearTimeout(hideTimer); }
    setTimeout(showHint, 4000);
  }

  function init() {
    try { setupScrollProgress(); } catch (e) { /* noop */ }
    try { setupScrollReveal(); } catch (e) { /* noop */ }
    try { setupCounters(); } catch (e) { /* noop */ }
    try { setupSpotlight(); } catch (e) { /* noop */ }
    try { setupChatTyping(); } catch (e) { /* noop */ }
    try { setupHowItWorksLine(); } catch (e) { /* noop */ }
    try { setupHeroParallax(); } catch (e) { /* noop */ }
    try { setupMagneticButtons(); } catch (e) { /* noop */ }
    try { setupTerminalDemo(); } catch (e) { /* noop */ }
    try { setupCommandPalette(); } catch (e) { /* noop */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
