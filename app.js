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
  let beginnerMode = true;

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
    for (const [key, val] of Object.entries(gpuMap)) {
      if (name.includes(key.replace('NVIDIA ', '').replace('AMD ', '').replace('Apple ', ''))) {
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
    return modelsData.models.filter(m => m.tier === tier);
  }

  function getSetupsForTier(tier) {
    return setupsData.setups
      .filter(s => s.tier === tier)
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 3);
  }

  function getTierInfo(tierId) {
    return modelsData.tiers.find(t => t.id === tierId);
  }

  function calcReadinessScore(tier) {
    const scores = { 'no-gpu': 4, 'cpu-only': 6, 'budget-gpu': 8, 'power-gpu': 10 };
    return scores[tier] || 5;
  }

  function getReadinessBreakdown(tier) {
    const caps = {
      'no-gpu': { chat: 6, writing: 5, coding: 3, reasoning: 4, agents: 2 },
      'cpu-only': { chat: 8, writing: 8, coding: 7, reasoning: 6, agents: 5 },
      'budget-gpu': { chat: 10, writing: 9, coding: 9, reasoning: 8, agents: 8 },
      'power-gpu': { chat: 10, writing: 10, coding: 10, reasoning: 10, agents: 10 }
    };
    return caps[tier] || caps['cpu-only'];
  }

  function getRatingClass(rating) {
    if (rating >= 8) return 'rating-high';
    if (rating >= 6) return 'rating-mid';
    return 'rating-low';
  }

  function wrapInGlossary(text) {
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

  function renderResults(tier) {
    const tierInfo = getTierInfo(tier);
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

      return `
      <div class="model-card fade-in">
        <div class="model-card-header">
          <div>
            <span class="model-name">${wrapInGlossary(m.name.replace(/\s*\d+(\.\d+)?B\s*$/i, '').trim())}</span>
            <span class="model-size badge b-primary">${m.size}</span>
          </div>
          <span class="badge b-green">${m.setupComplexity === 'easiest' ? 'Easiest' : m.setupComplexity === 'easy' ? 'Easy' : 'Medium'}</span>
        </div>
        <p class="model-desc">${wrapInGlossary(m.description)}</p>
        <div class="model-meta">
          <span class="badge b-primary">📦 ${m.modelSizeGB}GB</span>
          <span class="badge b-purple">💾 ${m.vramGB}GB VRAM</span>
          <span class="badge b-green">📏 ${(m.contextLength/1024).toFixed(0)}K context</span>
        </div>
        <div class="model-ratings">${ratings}</div>
        ${renderInstallBox(m)}
      </div>`;
    }).join('');

    let setupsHTML = setups.length > 0 ? `
      <div class="section" style="margin-top:0.5rem">
        <p class="section-label">From the community</p>
        <h2 style="margin-bottom:0.5rem">Proven setups for your hardware</h2>
        <p class="setups-note">These work — tested by real people on real machines.</p>
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

    section.innerHTML = `
      <div class="fade-in">
        <div class="score-card">
          <div class="score-top">
            <div>
              <div class="score-label">Your AI Readiness</div>
              <div class="score-number" style="color:#e85d04">${score}<span style="font-size:1.5rem;color:var(--text-tertiary)">/10</span></div>
              <div class="score-subtitle">
                ${score <= 4 ? 'Local AI will be slow on this setup — but it\'s possible.' :
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

        ${score <= 4 ? `
        <div class="opt-out-card">
          <div class="opt-out-title">Honestly, local AI might not be the move</div>
          <p class="opt-out-desc">Based on your hardware, running local AI will be slow and limited. Here are free alternatives that work better:</p>
          <div class="opt-out-alternatives">
            <a href="https://chat.openai.com" target="_blank" class="btn-secondary">ChatGPT Free</a>
            <a href="https://claude.ai" target="_blank" class="btn-secondary">Claude Free</a>
            <a href="https://gemini.google.com" target="_blank" class="btn-secondary">Gemini Free</a>
          </div>
          <p style="font-size:0.8rem;color:var(--text-tertiary);margin-top:0.75rem">You can still try our smallest models — they work on any hardware, just slower.</p>
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
    </div>`;
  }

  window.selectHW = function(id, tier) {
    selectedTier = tier;
    document.querySelectorAll('.hw-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`[data-id="${id}"]`).classList.add('selected');
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
    const allModels = modelsData.models;
    const breakdown = { chat: 8, writing: 7, coding: 6, reasoning: 6, agents: 5 };

    resultsSection.innerHTML = `
      <div class="score-card">
        <div class="score-top">
          <div>
            <div class="score-label">Browse all models</div>
            <div class="score-number" style="color:var(--text-secondary)">${Object.keys(allModels).length}<span style="font-size:1.5rem;color:var(--text-tertiary)"> models</span></div>
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
            return `
            <div class="model-card">
              <div class="model-card-header">
                <div>
                  <span class="model-name">${wrapInGlossary(nameWithoutSize)}</span>
                  <span class="model-size badge b-primary">${m.size}</span>
                </div>
                <span class="badge b-green">${m.setupComplexity === 'easiest' ? 'Easiest' : m.setupComplexity === 'easy' ? 'Easy' : 'Medium'}</span>
              </div>
              <p class="model-desc">${wrapInGlossary(m.description)}</p>
              <div class="model-meta">
                <span class="badge b-primary">📦 ${m.modelSizeGB}GB</span>
                <span class="badge b-purple">💾 ${m.vramGB}GB VRAM</span>
                <span class="badge b-green">📏 ${(m.contextLength/1024).toFixed(0)}K context</span>
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
    const gpuName = detectGPU();
    const vramGB = detectVRAM();
    const banner = document.getElementById('detected-banner');
    if (gpuName && banner) {
      const match = matchGPUName(gpuName);
      if (match) {
        banner.classList.remove('hidden');
        banner.innerHTML = `🖥️ Detected: <strong>${match.name}</strong> (${match.vramGB}GB VRAM) — selecting automatically...`;
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