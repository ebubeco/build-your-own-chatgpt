(function() {
  'use strict';

  const ICONS = {
    'laptop-old': '💻',
    'laptop': '🖥️',
    'monitor': '🖥️',
    'gpu-budget': '🎮',
    'gpu-power': '🚀',
    'apple': '🍎',
    'help': '🔍',
    'check': '✅',
    'cross': '❌',
    'warning': '⚠️',
    'info': '💡',
    'star': '⭐',
    'chat': '💬',
    'writing': '✍️',
    'coding': '💻',
    'reasoning': '🧠',
    'agents': '🤖'
  };

  let modelsData, gpusData, setupsData, glossaryData;
  let selectedTier = null;
  let selectedGoal = null;
  let beginnerMode = true;
  let showDevCode = false;
  let isAppleSilicon = false;

  async function loadData() {
    const [m, g, s, gl] = await Promise.all([
      fetch('data/models.json').then(r => r.json()),
      fetch('data/gpus.json').then(r => r.json()),
      fetch('data/setups.json').then(r => r.json()),
      fetch('data/glossary.json').then(r => r.json())
    ]);
    modelsData = m;
    gpusData = g;
    setupsData = s;
    glossaryData = gl;
  }

  function detectGPU() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return null;
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    return renderer;
  }

  function detectUnifiedMemory() {
    if (navigator.deviceMemory) return navigator.deviceMemory * 1024;
    return null;
  }

  function detectVRAM() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 0;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return 0;
    const dbgRenderInfo = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    const isNvidia = dbgRenderInfo && dbgRenderInfo.includes('NVIDIA');
    if (!isNvidia) return 0;
    const pixels = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, pixels);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));
    const width = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    gl.deleteTexture(pixels);
    let vramGB = 0;
    if (width >= 16384) vramGB = 24;
    else if (width >= 8192) vramGB = 12;
    else if (width >= 4096) vramGB = 8;
    else if (width >= 2048) vramGB = 4;
    return vramGB;
  }

  function detectSystemRAM() {
    if (navigator.deviceMemory) return navigator.deviceMemory;
    return null;
  }

  function getTierFromVRAM(vramGB) {
    if (vramGB >= 16) return 'power-gpu';
    if (vramGB >= 4) return 'budget-gpu';
    return 'cpu-only';
  }

  function matchGPUName(name) {
    if (!name) return null;
    const gpuMap = gpusData.gpuMap;
    if (name.includes('Apple') || name.includes('M1') || name.includes('M2') || name.includes('M3') || name.includes('M4')) {
      const mem = detectUnifiedMemory();
      if (mem >= 64) return { tier: 'silicon-64-plus', vramGB: mem, name: 'Apple Silicon (64GB+)' };
      if (mem >= 24) return { tier: 'silicon-24-48gb', vramGB: mem, name: 'Apple Silicon (24-48GB)' };
      return { tier: 'silicon-8-16gb', vramGB: mem || 16, name: 'Apple Silicon (8-16GB)' };
    }
    for (const [key, val] of Object.entries(gpuMap)) {
      if (name.includes(key.replace('NVIDIA ', '').replace('AMD ', ''))) {
        return { key, ...val };
      }
    }
    return null;
  }

  function getTierFromGPU(gpuName, vramGB) {
    const match = matchGPUName(gpuName);
    if (match) return match.tier;
    return getTierFromVRAM(vramGB);
  }

  function getRecommendationsForTier(tier) {
    if (!modelsData || !modelsData.models) return [];
    return modelsData.models.filter(m => m.tier === tier);
  }

  function getSetupsForTier(tier) {
    if (!setupsData || !setupsData.setups) return [];
    return setupsData.setups
      .filter(s => s.tier === tier)
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 3);
  }

  function getTierInfo(tierId) {
    if (!modelsData || !modelsData.tiers) return null;
    return modelsData.tiers.find(t => t.id === tierId);
  }

  function calcReadinessScore(tier) {
    const scores = { 'no-gpu': 4, 'cpu-only': 6, 'budget-gpu': 8, 'power-gpu': 10, 'silicon-8-16gb': 7, 'silicon-24-48gb': 9, 'silicon-64-plus': 10 };
    return scores[tier] || 5;
  }

  function getReadinessBreakdown(tier) {
    const caps = {
      'no-gpu': { chat: 6, writing: 5, coding: 3, reasoning: 4, agents: 2 },
      'cpu-only': { chat: 8, writing: 8, coding: 7, reasoning: 6, agents: 5 },
      'budget-gpu': { chat: 10, writing: 9, coding: 9, reasoning: 8, agents: 8 },
      'power-gpu': { chat: 10, writing: 10, coding: 10, reasoning: 10, agents: 10 },
      'silicon-8-16gb': { chat: 9, writing: 8, coding: 8, reasoning: 7, agents: 7 },
      'silicon-24-48gb': { chat: 10, writing: 10, coding: 9, reasoning: 9, agents: 9 },
      'silicon-64-plus': { chat: 10, writing: 10, coding: 10, reasoning: 10, agents: 10 }
    };
    return caps[tier] || caps['cpu-only'];
  }

  function getRatingClass(rating) {
    if (rating >= 8) return 'rating-high';
    if (rating >= 6) return 'rating-mid';
    return 'rating-low';
  }

  const QUANT_LEVELS = {
    'Q2_K': { quality: 95, size: 'smallest', desc: 'Smallest file. Noticeably lower quality. Good for testing.' },
    'Q3_K_M': { quality: 85, size: 'very small', desc: 'Very small. Some quality loss. Barely noticeable in most tasks.' },
    'Q4_K_M': { quality: 75, size: 'balanced', desc: 'Balanced size and quality. The recommended default. Works on most GPUs.' },
    'Q5_K_M': { quality: 65, size: 'larger', desc: 'Larger file. Better math accuracy. Only if you have spare VRAM.' },
    'Q6_K': { quality: 55, size: 'large', desc: 'Near full quality. Uses more VRAM. Only for high-end GPUs.' },
    'Q8_0': { quality: 0, size: 'full', desc: 'Full quality, no quantization. Uses maximum VRAM. Rarely needed.' },
    'F16': { quality: 0, size: 'full', desc: 'Full 16-bit precision. Highest quality. Uses maximum VRAM.' }
  };

  function getQuantizationTooltip(quant) {
    const info = QUANT_LEVELS[quant] || QUANT_LEVELS['Q4_K_M'];
    return `${quant}: ${info.size} file, preserves ~${info.quality}% quality. ${info.desc}`;
  }

  function getWhyExplanation(model, tier, goal) {
    const explanations = {
      'chat': `This model handles everyday conversation well on your hardware. It picks up context across long chats and stays coherent.`,
      'coding': `This model was trained or fine-tuned on code. It understands syntax, suggests implementations, and explains code better for your setup.`,
      'writing': `This model has good context length for long documents, articles, and research. It maintains writing quality across ${(model.contextLength/1024).toFixed(0)}K token spans.`,
      'documents': `This model has ${(model.contextLength/1024).toFixed(0)}K context - enough to load and analyze entire PDFs, transcripts, or codebases in one prompt.`,
      'all': `This model runs well on your hardware tier. It's versatile enough to handle chat, coding, writing, and document analysis.`
    };
    if (!goal || goal === 'all') {
      return explanations['all'];
    }
    return explanations[goal] || explanations['all'];
  }

  function getModelCapability(tier, modelB) {
    const limits = {
      'no-gpu': 1,
      'cpu-only': 3,
      'budget-gpu': 7,
      'power-gpu': 14,
      'silicon-8-16gb': 7,
      'silicon-24-48gb': 14,
      'silicon-64-plus': 72
    };
    const limit = limits[tier] || 7;
    if (modelB <= limit) return 'fast';
    if (modelB <= limit * 2) return 'slow';
    return 'not';
  }

  function wrapInGlossary(text) {
    if (!text) return '';
    if (!beginnerMode || !glossaryData) return text;
    const words = text.split(/(\s+)/);
    return words.map(word => {
      if (/^\s+$/.test(word)) return word;
      const matched = glossaryData.terms.find(t =>
        t.term.toLowerCase() === word.toLowerCase() ||
        (t.aliases && t.aliases.some(a => a.toLowerCase() === word.toLowerCase()))
      );
      if (!matched) return word;
      return `<span class="glossary-tip">${word}<span class="glossary-popup">${matched.simpleDefinition}</span></span>`;
    }).join('');
  }

  function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      const original = btn.innerHTML;
      btn.innerHTML = '✅ Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.remove('copied');
      }, 2000);
    });
  }

  function icon(key) { return ICONS[key] || '📦'; }

  function renderHWSelector() {
    const container = document.getElementById('hw-options');
    if (!container) return;
    container.innerHTML = gpusData.manualOptions.map(opt => `
      <button class="hw-card" data-tier="${opt.tier}" data-id="${opt.id}" onclick="selectHW('${opt.id}', '${opt.tier}')">
        <span class="hw-card-icon">${icon(opt.icon)}</span>
        <span class="hw-card-title">${opt.label}</span>
        <span class="hw-card-desc">${opt.description}</span>
      </button>
    `).join('');
  }

  function encodeState() {
    const params = new URLSearchParams();
    if (selectedGoal) params.set('goal', selectedGoal);
    if (selectedTier) params.set('tier', selectedTier);
    return params.toString();
  }

  function decodeState() {
    const params = new URLSearchParams(window.location.search);
    return {
      goal: params.get('goal'),
      tier: params.get('tier')
    };
  }

  function updateURL() {
    const qs = encodeState();
    const newURL = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newURL);
  }

  function shareResult() {
    updateURL();
    const url = window.location.href;
    const btn = document.getElementById('share-btn');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        btn.textContent = 'Link copied!';
        setTimeout(() => { btn.textContent = 'Share results'; }, 2000);
      });
    }
  }

  function detectAppleSilicon() {
    const ua = navigator.userAgent;
    return ua.includes('Mac') && (ua.includes('Apple') || typeof navigator.platform !== 'undefined' && navigator.platform.includes('Mac'));
  }

  window.selectGoal = function(goal) {
    selectedGoal = goal;
    document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
    const card = document.querySelector(`.goal-card[data-goal="${goal}"]`);
    if (card) card.classList.add('selected');

    if (goal === 'all') {
      const showAllRow = document.getElementById('show-all-row');
      if (showAllRow) showAllRow.style.display = 'block';
      const hwSection = document.getElementById('hw-section');
      if (hwSection) {
        hwSection.classList.remove('hidden');
        hwSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    const hwSection = document.getElementById('hw-section');
    if (hwSection) {
      hwSection.classList.remove('hidden');
      hwSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  window.showAllModelsDirect = function() {
    selectedGoal = null;
    document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
    const hwSection = document.getElementById('hw-section');
    if (hwSection) hwSection.classList.remove('hidden');
    selectTierAll();
  };

  window.toggleDevCode = function() {
    showDevCode = !showDevCode;
    document.querySelectorAll('.install-box').forEach(box => {
      const code = box.querySelector('.dev-code-toggle');
      if (code) code.style.display = showDevCode ? 'block' : 'none';
    });
    const btn = document.getElementById('dev-toggle-btn');
    if (btn) btn.textContent = showDevCode ? 'Hide install code' : 'Show install code (developers)';
  };

  window.shareResult = shareResult;

  function renderResults(tier) {
    if (!modelsData || !modelsData.tiers) {
      console.warn('Data not loaded yet');
      return;
    }
    const tierInfo = getTierInfo(tier);
    if (!tierInfo) {
      console.warn('Unknown tier:', tier);
      return;
    }
    const models = getRecommendationsForTier(tier);
    const setups = getSetupsForTier(tier);
    const score = calcReadinessScore(tier);
    const breakdown = getReadinessBreakdown(tier);
    const section = document.getElementById('results-section');
    if (!section) return;

    const scoreColor = score >= 8 ? 'var(--green)' : score >= 6 ? 'var(--amber)' : 'var(--red)';
    const scoreBg = score >= 8 ? 'var(--green-light)' : score >= 6 ? 'var(--amber-light)' : 'var(--red-light)';

    let modelsHTML = models.map(m => {
      const ratings = Object.entries(m.practicalRating)
        .filter(([k, v]) => v > 0)
        .map(([k, v]) => `<span class="rating-item"><span class="rating-dot ${getRatingClass(v)}"></span>${k}: ${v}/10</span>`)
        .join('');

      const bStr = m.size.match(/(\d+\.?\d*)/);
      const bSize = bStr ? parseFloat(bStr[1]) : 7;
      const cap = getModelCapability(tier, bSize);
      const capBadge = cap === 'fast' ? '<span class="badge b-green">Can run</span>' :
                       cap === 'slow' ? '<span class="badge b-amber">Can run slowly</span>' :
                       '<span class="badge b-red">Not recommended</span>';

      const quantLabel = m.recommendedQuant || 'Q4_K_M';
      const quantTip = getQuantizationTooltip(quantLabel);

      const whyText = getWhyExplanation(m, tier, selectedGoal);

      return `
      <div class="model-card fade-in">
        <div class="model-card-header">
          <div>
            <span class="model-name">${wrapInGlossary(m.name.replace(/\s*\d+(\.\d+)?B\s*$/i, '').trim())}</span>
            <span class="model-size badge b-primary">${m.size}</span>
          </div>
          ${capBadge}
        </div>
        <p class="model-desc">${wrapInGlossary(m.description)}</p>
        <div class="model-meta">
          <span class="badge b-primary">📦 ${m.modelSizeGB}GB</span>
          <span class="badge b-purple">💾 ${m.vramGB}GB VRAM</span>
          <span class="badge b-green">📏 ${(m.contextLength/1024).toFixed(0)}K context</span>
          <span class="badge b-purple quant-badge" title="${quantTip}">⚡ ${quantLabel}</span>
        </div>
        <div class="model-ratings">${ratings}</div>
        ${whyText ? `<div class="model-why"><strong>Why this?</strong> ${whyText}</div>` : ''}
        ${renderInstallBox(m)}
      </div>`;
    }).join('');

    let setupsHTML = setups.length > 0 ? `
      <div class="section" style="margin-top:0.5rem">
        <p class="section-label">From the community</p>
        <h2 style="margin-bottom:0.5rem">Proven setups for your hardware</h2>
        <p class="setups-note">These work - tested by real people on real machines.</p>
        ${setups.map(s => `
          <div class="setup-card">
            <div class="setup-header">
              <span class="setup-name">${s.model} + ${s.tool}</span>
              <span class="badge b-green">${Math.round(s.successRate * 100)}% success</span>
            </div>
            ${s.ui !== 'Ollama CLI (terminal)' && s.ui !== 'Ollama CLI' ? `<span class="badge b-primary" style="margin-bottom:0.4rem;display:inline-block">${s.ui}</span>` : ''}
            <div class="setup-meta">${s.userCount.toLocaleString()} people · ${s.avgRating}/5 stars</div>
            ${s.knownIssues.length > 0 ? `<div class="setup-issue">⚠️ ${s.knownIssues[0]}</div>` : ''}
            ${s.successStory ? `<div class="setup-success-story">"${s.successStory}"</div>` : ''}
            <ul class="setup-steps">
              ${s.setupSteps.map(step => `<li>${step}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>` : '';

    const fastModels = models.filter(m => {
      const bStr = m.size.match(/(\d+\.?\d*)/);
      const bSize = bStr ? parseFloat(bStr[1]) : 7;
      return getModelCapability(tier, bSize) === 'fast';
    });
    const slowModels = models.filter(m => {
      const bStr = m.size.match(/(\d+\.?\d*)/);
      const bSize = bStr ? parseFloat(bStr[1]) : 7;
      return getModelCapability(tier, bSize) === 'slow';
    });

    section.innerHTML = `
      <div class="fade-in">
        <div class="results-toolbar">
          <button id="share-btn" class="btn-share" onclick="shareResult()">Share results</button>
          <button id="dev-toggle-btn" class="btn-dev-toggle" onclick="toggleDevCode()">Show install code (developers)</button>
        </div>

        <div class="score-card">
          <div class="score-top">
            <div>
              <div class="score-label">Your AI Readiness</div>
              <div class="score-number" style="color:#e85d04">${score}<span style="font-size:1.5rem;color:var(--text-tertiary)">/10</span></div>
              <div class="score-subtitle">
                ${score <= 4 ? 'Local AI will be slow on this setup - but it\'s possible.' :
                  score <= 7 ? 'Solid setup for local AI. Smaller models will fly, bigger ones need patience.' :
                  'You\'ve got a great machine for this. Enjoy.'}
              </div>
            </div>
            <div class="score-grid">
              ${Object.entries(breakdown).map(([key, val]) => `
                <div class="score-item">
                  <span class="score-item-label">${key}</span>
                  <div class="score-bar"><div class="score-bar-fill" style="width:${val * 10}%;background:${getRatingClass(val) === 'rating-high' ? '#1a8a45' : getRatingClass(val) === 'rating-mid' ? '#b36b00' : '#cc2222'}"></div></div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        ${models.length > 0 ? `
        <div class="capability-card">
          <div class="cap-header">
            <h3 style="margin:0">What can run on your setup</h3>
          </div>
          <div class="cap-columns">
            <div class="cap-col cap-fast">
              <div class="cap-col-label">Can run</div>
              <div class="cap-col-count">${fastModels.length} models</div>
              ${fastModels.slice(0, 3).map(m => `<div class="cap-model">${m.name.replace(/\s*\d+(\.\d+)?B\s*$/i, '').trim()} ${m.size}</div>`).join('')}
              ${fastModels.length > 3 ? `<div class="cap-more">+${fastModels.length - 3} more</div>` : ''}
            </div>
            <div class="cap-col cap-slow">
              <div class="cap-col-label">Can run slowly</div>
              <div class="cap-col-count">${slowModels.length} models</div>
              ${slowModels.slice(0, 3).map(m => `<div class="cap-model">${m.name.replace(/\s*\d+(\.\d+)?B\s*$/i, '').trim()} ${m.size}</div>`).join('')}
              ${slowModels.length > 3 ? `<div class="cap-more">+${slowModels.length - 3} more</div>` : ''}
            </div>
            <div class="cap-col cap-not">
              <div class="cap-col-label">Not recommended</div>
              <div class="cap-col-count">${models.length === 0 ? '0 models' : 'Higher tiers only'}</div>
              <div class="cap-model" style="color:var(--text-tertiary)">Upgrade hardware to unlock more</div>
            </div>
          </div>
        </div>` : ''}

        ${score <= 4 ? `
        <div class="opt-out-card">
          <div class="opt-out-title">Honestly, local AI might not be the move</div>
          <p class="opt-out-desc">Based on your hardware, running local AI will be slow and limited. Here are free alternatives that work better:</p>
          <div class="opt-out-alternatives">
            <a href="https://chat.openai.com" target="_blank" class="btn-secondary">ChatGPT Free</a>
            <a href="https://claude.ai" target="_blank" class="btn-secondary">Claude Free</a>
            <a href="https://gemini.google.com" target="_blank" class="btn-secondary">Gemini Free</a>
          </div>
          <p style="font-size:0.8rem;color:var(--text-tertiary);margin-top:0.75rem">You can still try our smallest models - they work on any hardware, just slower.</p>
        </div>` : ''}

        <div class="models-header">
          <h2 style="margin-bottom:0">Models for your setup</h2>
          <span class="models-count">${models.length} recommendations</span>
        </div>
        <p class="section-desc">${tierInfo.description}</p>
        <div class="models-list">${modelsHTML}</div>
        ${setupsHTML}
      </div>`;

    section.classList.remove('hidden');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderInstallBox(model) {
    return `
    <div class="install-box">
      <div class="install-label">1. Install Ollama</div>
      <a href="https://ollama.com/download" target="_blank" class="btn-secondary" style="display:inline-block;margin-bottom:0.75rem">
        📥 Download Ollama (free)
      </a>
      <div class="install-label">2. Run this command</div>
      <div class="install-command">${model.installCommand}</div>
      <button class="copy-btn" onclick="copyToClipboard('${model.installCommand}', this)">📋 Copy command</button>
      <div class="dev-code-toggle" style="display:none">
        <div class="install-label" style="margin-top:0.75rem">Alternative: Llamafile</div>
        <div class="install-command">${model.alternativeCommand || 'curl -L https://github.com/Mozilla-Ocho/llamafile/releases/latest/download/' + model.name.split(' ')[0].toLowerCase() + '-*.llamafile -o ' + model.name.split(' ')[0].toLowerCase() + '.llamafile && chmod +x ' + model.name.split(' ')[0].toLowerCase() + '.llamafile && ./' + model.name.split(' ')[0].toLowerCase() + '.llamafile'}</div>
        <button class="copy-btn" onclick="copyToClipboard('${model.alternativeCommand || ''}', this)">📋 Copy command</button>
      </div>
    </div>`;
  }

  window.selectHW = function(id, tier) {
    selectedTier = tier;
    document.querySelectorAll('.hw-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`[data-id="${id}"]`).classList.add('selected');
    updateURL();
    renderResults(tier);
  };

  window.copyToClipboard = copyToClipboard;

  window.toggleBeginnerMode = function(checkbox) {
    beginnerMode = checkbox.checked;
    if (selectedTier) renderResults(selectedTier);
  };

  window.selectTierAll = function() {
    const resultsSection = document.getElementById('results-section');
    if (!resultsSection) return;
    selectedTier = null;
    const allModels = modelsData.models;
    const breakdown = { chat: 8, writing: 7, coding: 6, reasoning: 6, agents: 5 };

    resultsSection.innerHTML = `
      <div class="results-toolbar">
        <button id="share-btn" class="btn-share" onclick="shareResult()">Share results</button>
        <button id="dev-toggle-btn" class="btn-dev-toggle" onclick="toggleDevCode()">Show install code (developers)</button>
      </div>
      <div class="score-card">
        <div class="score-top">
          <div>
            <div class="score-label">Browse all models</div>
            <div class="score-number" style="color:var(--text-secondary)">${allModels.length}<span style="font-size:1.5rem;color:var(--text-tertiary)"> models</span></div>
            <div class="score-subtitle">Select your hardware above for personalized picks and your AI readiness score.</div>
          </div>
          <div class="score-grid">
            ${Object.entries(breakdown).map(([key, val]) => `
              <div class="score-item">
                <span class="score-item-label">${key}</span>
                <div class="score-bar"><div class="score-bar-fill" style="width:${val * 10}%;background:#1a8a45"></div></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="models-header">
        <h2 style="margin-bottom:0">All available models</h2>
        <span class="models-count">${allModels.length} total</span>
      </div>
      <p class="section-desc">Sorted by hardware tier. Pick your setup above for recommendations that actually work on your machine.</p>
      <div class="models-list">
      ${modelsData.tiers.map(tier => {
        const tierModels = allModels.filter(m => m.tier === tier.id);
        if (!tierModels.length) return '';
        return `
        <div class="section" style="margin-top:0.5rem">
          <p class="section-label" style="font-size:0.65rem">${tier.name}</p>
          <p style="font-size:0.8rem;color:var(--text-tertiary);margin-bottom:0.75rem">${tier.description}</p>
          ${tierModels.map(m => {
            const nameWithoutSize = m.name.replace(/\s*\d+(\.\d+)?B\s*$/i, '').trim();
            const ratings = Object.entries(m.practicalRating)
              .filter(([k, v]) => v > 0)
              .map(([k, v]) => `<span class="rating-item"><span class="rating-dot ${getRatingClass(v)}"></span>${k}: ${v}/10</span>`)
              .join('');
            const bStr = m.size.match(/(\d+\.?\d*)/);
            const bSize = bStr ? parseFloat(bStr[1]) : 7;
            const cap = getModelCapability(tier.id, bSize);
            const capBadge = cap === 'fast' ? '<span class="badge b-green">Can run</span>' :
                             cap === 'slow' ? '<span class="badge b-amber">Can run slowly</span>' :
                             '<span class="badge b-red">Not recommended</span>';
            const quantLabel = m.recommendedQuant || 'Q4_K_M';
            return `
            <div class="model-card">
              <div class="model-card-header">
                <div>
                  <span class="model-name">${wrapInGlossary(nameWithoutSize)}</span>
                  <span class="model-size badge b-primary">${m.size}</span>
                </div>
                ${capBadge}
              </div>
              <p class="model-desc">${wrapInGlossary(m.description)}</p>
              <div class="model-meta">
                <span class="badge b-primary">📦 ${m.modelSizeGB}GB</span>
                <span class="badge b-purple">💾 ${m.vramGB}GB VRAM</span>
                <span class="badge b-green">📏 ${(m.contextLength/1024).toFixed(0)}K context</span>
                <span class="badge b-purple quant-badge" title="${getQuantizationTooltip(quantLabel)}">⚡ ${quantLabel}</span>
              </div>
              ${ratings ? `<div class="model-ratings">${ratings}</div>` : ''}
              ${renderInstallBox(m)}
            </div>`;
          }).join('')}
        </div>`;
      }).join('')}
      </div>`;
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  async function init() {
    await loadData();
    renderHWSelector();
    isAppleSilicon = detectAppleSilicon();

    const state = decodeState();
    if (state.goal) {
      selectedGoal = state.goal;
      const goalCard = document.querySelector(`.goal-card[data-goal="${state.goal}"]`);
      if (goalCard) goalCard.classList.add('selected');
      const hwSection = document.getElementById('hw-section');
      if (hwSection) hwSection.classList.remove('hidden');
    }
    if (state.tier) {
      selectedTier = state.tier;
      const hwSection = document.getElementById('hw-section');
      if (hwSection) hwSection.classList.remove('hidden');
      const opt = gpusData.manualOptions.find(o => o.tier === state.tier);
      if (opt) {
        const card = document.querySelector(`[data-id="${opt.id}"]`);
        if (card) card.classList.add('selected');
      }
      renderResults(state.tier);
    }

    if (!state.tier) {
      const gpuName = detectGPU();
      const vramGB = detectVRAM();
      const banner = document.getElementById('detected-banner');
      if (gpuName && banner) {
        const match = matchGPUName(gpuName);
        if (match) {
          banner.classList.remove('hidden');
          const isSilicon = match.tier && match.tier.startsWith('silicon-');
          const memLabel = isSilicon ? `${Math.round(match.vramGB / 1024)}GB unified` : `${match.vramGB}GB VRAM`;
          banner.innerHTML = `🖥️ Detected: <strong>${match.name}</strong> (${memLabel}) - selecting automatically...`;
          setTimeout(() => {
            const opt = gpusData.manualOptions.find(o => o.id === match.tier);
            if (opt) {
              const card = document.querySelector(`[data-id="${opt.id}"]`);
              if (card) {
                card.click();
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }, 800);
        }
      }
    }
  }

  window.selectTool = function(tool) {
    document.querySelectorAll('.tool-option').forEach(o => o.classList.remove('selected'));
    const el = document.querySelector(`.tool-option[data-tool="${tool}"]`);
    if (el) el.classList.add('selected');
  };

  window.showGuide = function(guide) {
    const tabs = document.querySelectorAll('.guide-tab');
    const contents = document.querySelectorAll('.guide-content');
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.style.display = 'none');
    const targetTab = document.querySelector(`.guide-tab[onclick="showGuide('${guide}')"]`);
    if (targetTab) targetTab.classList.add('active');
    const targetContent = document.getElementById(`guide-${guide}`);
    if (targetContent) targetContent.style.display = 'block';
  };

  document.addEventListener('DOMContentLoaded', init);
})();