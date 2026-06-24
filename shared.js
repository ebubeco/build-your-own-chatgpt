(function() {
  'use strict';

  var NAV_ITEMS = [
    { href: '/compare.html',       label: 'Compare' },
    { href: '/which-ai.html',      label: 'Which AI?' },
    { href: '/compatibility.html', label: 'Compatibility' },
    { href: '/commands.html',      label: 'Commands' },
    { href: '/cost.html',          label: 'Cost' },
    { href: '/upgrade.html',       label: 'Upgrade' },
    { href: '/career.html',        label: 'Career' },
    { href: '/use-cases.html',     label: 'Use Cases' },
    { href: '/evaluators.html',    label: 'Evaluators' },
    { href: '/compendium.html',    label: 'All Models' }
  ];

  function getParam(key) { return new URLSearchParams(location.search).get(key); }

  var _cache = {};
  async function loadData(file) {
    if (_cache[file]) return _cache[file];
    _cache[file] = await fetch('data/' + file).then(function(r) { return r.json(); });
    return _cache[file];
  }

  function track(event, props) {
    if (window.plausible) window.plausible(event, { props: props || {} });
  }

  function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(function() {
      if (btn) {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function() { btn.textContent = orig; }, 2000);
      }
    });
  }

  var TOOLTIP_KEYS = {
    'vram': 'Video RAM — memory on your GPU. 8GB+ VRAM runs 7B models; 12GB+ runs 14B models.',
    'quantization': 'Compresses the model to use less memory. Q4_K_M is recommended (best quality/size trade-off).',
    'context': 'How many tokens the model remembers at once. 8K = ~6,000 words; 32K = ~24,000 words.',
    'token': 'A piece of text the model reads/writes. 1 token ≈ 0.75 words in English.',
    'tps': 'Tokens Per Second — how fast the model generates text. 30+ TPS feels instant.',
    'ollama': 'Free, open-source tool to run AI models locally. Works on Mac, Windows, Linux.',
    'openwebui': 'ChatGPT-like interface for local models. Runs in your browser via Docker.',
    'modelfile': 'A configuration file for Ollama that sets parameters, system prompts, and model settings.',
    'rag': 'Retrieval-Augmented Generation — lets the model search your documents before answering.',
    'gguf': 'The file format for quantized models. GGUF files contain the compressed model weights.',
    'lmstudio': 'A desktop app for running AI models locally with a graphical interface. Great for beginners.',
    'parameters': 'The model\'s "size" — 7B means 7 billion parameters. Bigger = smarter but slower.',
    'rpd': 'Requests Per Day — how many times you can use a free API in 24 hours before hitting limits.',
    'stt': 'Speech to Text — converts audio or video speech into written text. Used for transcription.',
    'tts': 'Text to Speech — converts written text into spoken audio. Used for voiceovers and accessibility.'
  };

  function initTooltips() {
    document.querySelectorAll('[data-tooltip-key]').forEach(function(el) {
      var key = el.getAttribute('data-tooltip-key');
      if (TOOLTIP_KEYS[key]) el.setAttribute('data-tooltip', TOOLTIP_KEYS[key]);
    });
  }

  function initDevMode() {
    if (getParam('dev') === 'true') {
      document.querySelectorAll('[data-dev-only]')
        .forEach(function(el) { el.style.display = ''; });
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    initTooltips();
    initDevMode();
  });

  window.shared = {
    getParam: getParam,
    loadData: loadData,
    track: track,
    copyText: copyText,
    TOOLTIP_KEYS: TOOLTIP_KEYS,
    initTooltips: initTooltips
  };
})();
