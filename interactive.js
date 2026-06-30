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

  function init() {
    try { setupScrollProgress(); } catch (e) { /* noop */ }
    try { setupScrollReveal(); } catch (e) { /* noop */ }
    try { setupCounters(); } catch (e) { /* noop */ }
    try { setupSpotlight(); } catch (e) { /* noop */ }
    try { setupChatTyping(); } catch (e) { /* noop */ }
    try { setupHowItWorksLine(); } catch (e) { /* noop */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
