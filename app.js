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

  let modelsData, gpusData, setupsData, glossaryData, appConfig, cloudProvidersData;
  let selectedTier = null;
  let selectedGoal = null;
  let selectedCareer = null;
  let beginnerMode = true;
  let showDevCode = false;
  let isAppleSilicon = false;
  let currentResult = null;
  let goalInferred = false;
  let hardwareInferred = false;
  let careerInferred = false;
  let autoDetectCancelled = false;

  let CAREER_MAP = {};

  function track(name, props) {
    if (typeof window.__analytics !== 'undefined') {
      window.__analytics.trackEvent(name, props);
    }
  }

  async function loadData() {
    const [m, g, s, gl, conf, cp, r] = await Promise.all([
      fetch('data/models_compendium.json').then(r => r.json()),
      fetch('data/gpus.json').then(r => r.json()),
      fetch('data/setups.json').then(r => r.json()),
      fetch('data/glossary.json').then(r => r.json()),
      fetch('data/config.json').then(r => r.json()),
      fetch('data/cloud_providers.json').then(r => r.json()),
      fetch('data/roles.json').then(r => r.json())
    ]);
    modelsData = m;
    gpusData = g;
    setupsData = s;
    glossaryData = gl;
    appConfig = conf;
    cloudProvidersData = cp;
    CAREER_MAP = {};
    if (r && r.roles) {
      r.roles.forEach(role => {
        CAREER_MAP[role.id] = {
          label: role.label,
          icon: role.icon,
          desc: role.desc,
          matchedModels: role.matchedModels,
          priorities: role.priorities
        };
      });
    }
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

  async function detectWebGPU() {
    if (!navigator.gpu) return null;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return null;
      const info = adapter.info;
      return info.vendor + ' ' + info.architecture + ' (' + info.description + ')';
    } catch {
      return null;
    }
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
    // Kept for potential future use; navigator.deviceMemory returns GBs
    if (navigator.deviceMemory) return navigator.deviceMemory;
    return null;
  }

  function getTierFromVRAM(vramGB) {
    if (vramGB >= 16) return 'high-end-gpu';
    if (vramGB >= 8) return 'mid-gpu';
    if (vramGB >= 4) return 'budget-gpu';
    return 'no-gpu';
  }

  function matchGPUName(name) {
    if (!name) return null;
    const gpuMap = gpusData.gpuMap;
    if (name.includes('Apple') || name.includes('M1') || name.includes('M2') || name.includes('M3') || name.includes('M4')) {
      const mem = detectUnifiedMemory();
      return { tier: 'apple', vramGB: mem || 16, name: 'Apple Silicon (' + (mem || 16) + 'GB)', ram: mem || 16 };
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

  async function detectHardware() {
    let gpuName = await detectWebGPU();
    if (!gpuName) gpuName = detectGPU();
    if (!gpuName) return null;
    const vramGB = detectVRAM();
    const match = matchGPUName(gpuName);
    if (!match) return { gpu: gpuName, vram: vramGB, tier: getTierFromVRAM(vramGB) };
    const isSilicon = match.tier === 'apple';
    const memLabel = isSilicon ? ((match.ram || match.vramGB) + 'GB unified') : (match.vramGB + 'GB VRAM');
    const name = (gpuName.includes('Apple') || gpuName.includes('M1') || gpuName.includes('M2') || gpuName.includes('M3') || gpuName.includes('M4')) ? (match.name || 'Apple Silicon') : (match.name || gpuName);
    return { gpu: name, vram: memLabel, tier: match.tier, vramGB: match.vramGB };
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
    return appConfig.readinessScores[tier] || 5;
  }

  function getReadinessBreakdown(tier) {
    return appConfig.readinessBreakdowns[tier] || appConfig.readinessBreakdowns['no-gpu'];
  }

  function getRatingClass(rating) {
    if (rating >= 8) return 'rating-high';
    if (rating >= 6) return 'rating-mid';
    return 'rating-low';
  }

  function getQuantizationTooltip(quant) {
    const info = appConfig.QUANT_LEVELS[quant] || appConfig.QUANT_LEVELS['Q4_K_M'];
    return `${quant}: ${info.size} file, preserves ~${info.quality}% quality. ${info.desc}`;
  }

  function getWhyExplanation(model, tier, goal) {
    const expl = appConfig.explanations[goal] || appConfig.explanations['all'];
    return expl.replace('{context}', (model.contextLength/1024).toFixed(0));
  }

  function getModelCapability(tier, modelB) {
    const limit = appConfig.capabilityLimits[tier] || 7;
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
    const modelKey = currentResult ? currentResult.modelName : 'unknown';
    track('command_copied', { model: modelKey });
    track('recommendation_accepted', { model: modelKey, tier: selectedTier, goal: selectedGoal });
    if (!text) {
      btn.innerHTML = '⚠️ No command';
      setTimeout(() => { btn.innerHTML = '📋 Copy command'; }, 2000);
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = original;
          btn.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        fallbackCopy(text, btn);
      });
    } else {
      fallbackCopy(text, btn);
    }
  }

  function fallbackCopy(text, btn, successText, resetText) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      const original = btn.innerHTML;
      btn.innerHTML = successText || '✅ Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.remove('copied');
      }, 2000);
    } catch (e) {
      const original = btn.innerHTML;
      btn.innerHTML = '❌ Failed - select text manually';
      setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.remove('copied');
      }, 3000);
    }
    document.body.removeChild(textarea);
  }

  function icon(key) { return ICONS[key] || '📦'; }

  function renderHWSelector() {
    const container = document.getElementById('hw-options');
    if (!container) return;
    const tpl = document.getElementById('hw-card-template');
    if (!tpl) return;
    
    container.innerHTML = '';
    gpusData.manualOptions.forEach(opt => {
      const clone = tpl.content.cloneNode(true);
      const btn = clone.querySelector('.hw-card');
      btn.dataset.tier = opt.tier;
      btn.dataset.id = opt.id;
      btn.querySelector('.hw-icon').textContent = icon(opt.icon);
      btn.querySelector('.hw-title').textContent = opt.label;
      btn.querySelector('.hw-desc').textContent = opt.description;
      container.appendChild(clone);
    });
  }

  function renderCareerSelector() {
    const container = document.getElementById('career-options');
    if (!container) return;
    container.innerHTML = '';
    Object.entries(CAREER_MAP).forEach(([key, val]) => {
      const btn = document.createElement('button');
      btn.className = 'career-card';
      btn.dataset.career = key;
      btn.innerHTML = `<span class="career-icon">${val.icon}</span><span class="career-title">${val.label}</span><span class="career-desc">${val.desc}</span>`;
      btn.addEventListener('click', () => selectCareer(key));
      container.appendChild(btn);
    });
  }

  function selectCareer(career, inferred = false) {
    selectedCareer = career;
    careerInferred = inferred;
    track('career_selected', { career, inferred });
    document.querySelectorAll('.career-card').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-pressed', 'false');
    });
    const card = document.querySelector(`.career-card[data-career="${career}"]`);
    if (card) {
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
    }

    var resultsSection = document.getElementById('results-section');
    var hasResults = resultsSection && resultsSection.innerHTML && resultsSection.innerHTML.trim().length > 0;
    var hwSection = document.getElementById('hw-section');
    if (hwSection && !hasResults) {
      hwSection.classList.remove('hidden');
      hwSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function encodeState() {
    const params = new URLSearchParams();
    if (selectedGoal) params.set('goal', selectedGoal);
    if (selectedCareer) params.set('career', selectedCareer);
    if (selectedTier) params.set('tier', selectedTier);
    return params.toString();
  }

  function decodeState() {
    const params = new URLSearchParams(window.location.search);
    return {
      goal: params.get('goal'),
      career: params.get('career'),
      tier: params.get('tier')
    };
  }

  function updateURL() {
    const qs = encodeState();
    const newURL = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newURL);
  }

  function generateShareText() {
    if (!currentResult) return window.location.href;
    const r = currentResult;
    const lines = [
      `My AI setup (build-your-own-chatgpt.vercel.app)`,
      ``,
      `Hardware score: ${r.score}/10`,
      ``,
      `Can run:`,
      ...r.canRun.map(item => `✓ ${item}`),
      ``,
      `Setup: ${r.modelName} via ${r.tool}`,
      `Command: ${r.command}`,
      ``,
      window.location.href
    ];
    return lines.join('\n');
  }

  function shareResult(btn, action) {
    updateURL();

    if (action === 'link') {
      track('share_clicked', { method: 'copy_link' });
      const url = window.location.href;
      const copyToClip = (str) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(str).then(() => {
            btn.textContent = 'Link copied!';
            setTimeout(() => { btn.textContent = 'Copy result link'; }, 2000);
          }).catch(() => fallbackCopy(str, btn, 'Link copied!', 'Copy result link'));
        } else {
          fallbackCopy(str, btn, 'Link copied!', 'Copy result link');
        }
      };
      copyToClip(url);
      return;
    }

    const text = generateShareText();
    if (navigator.share) {
      track('share_clicked', { method: 'native_share' });
      navigator.share({ title: 'My AI Setup', text }).catch(() => {});
      return;
    }
    const copyToClip = (str) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(str).then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Share text'; }, 2000);
        }).catch(() => fallbackCopy(str, btn));
      } else {
        fallbackCopy(str, btn);
      }
    };
    copyToClip(text);
  }

  function detectAppleSilicon() {
    const ua = navigator.userAgent;
    return ua.includes('Mac') && (ua.includes('Apple') || typeof navigator.platform !== 'undefined' && navigator.platform.includes('Mac'));
  }

  function selectGoal(goal, inferred = false) {
    selectedGoal = goal;
    goalInferred = inferred;
    track('goal_selected', { goal, inferred });
    document.querySelectorAll('.goal-card').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-pressed', 'false');
    });
    const card = document.querySelector(`.goal-card[data-goal="${goal}"]`);
    if (card) {
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
    }

    const hwSection = document.getElementById('hw-section');

    if (goal === 'unknown') {
      if (hwSection) hwSection.classList.add('hidden');
      return;
    }

    if (hwSection) hwSection.classList.remove('hidden');
  }

  function showAllModelsDirect() {
    selectedGoal = null;
    document.querySelectorAll('.goal-card').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-pressed', 'false');
    });
    const hwSection = document.getElementById('hw-section');
    if (hwSection) hwSection.classList.remove('hidden');
    selectTierAll();
  }

  function generateSetupText(modelName, alternativeNames, tier, goal) {
    var goalLabel = goal ? goal.charAt(0).toUpperCase() + goal.slice(1) : 'General';
    var tierLabel = tier || 'Unknown';
    var lines = [
      'My Local AI Setup',
      '',
      'Goal:',
      goalLabel,
      '',
      'Hardware:',
      tierLabel,
      '',
      'Recommended:',
      modelName || 'Unknown',
      '',
    ];
    if (alternativeNames && alternativeNames.length > 0) {
      lines.push('Alternatives:');
      alternativeNames.forEach(function(name) { lines.push(name); });
      lines.push('');
    }
    lines.push('Generated with Build Your Own ChatGPT');
    lines.push('https://build-your-own-chatgpt.vercel.app/');
    return lines.join('\n');
  }

  function toggleDevCode() {
    showDevCode = !showDevCode;
    document.querySelectorAll('.install-box').forEach(box => {
      const code = box.querySelector('.dev-code-toggle');
      if (code) code.style.display = showDevCode ? 'block' : 'none';
    });
    const btn = document.getElementById('dev-toggle-btn');
    if (btn) btn.textContent = showDevCode ? 'Hide install code' : 'Show install code (developers)';
  }

  function pickRecommendations(models, goal, tier) {
    if (!models || models.length === 0) return { primary: null, alternatives: [] };

    const goalMap = { 'chat': 'chat', 'coding': 'coding', 'writing': 'writing', 'documents': 'writing', 'agents': 'agents', 'all': 'chat' };
    const primaryGoal = goalMap[goal] || 'chat';

    const scored = models.map(m => {
      const bStr = m.size.match(/(\d+\.?\d*)/);
      const bSize = bStr ? parseFloat(bStr[1]) : 7;
      const cap = getModelCapability(tier, bSize);
      let score = 0;
      if (m.bestFor && m.bestFor.includes(primaryGoal)) score += 30;
      if (m.practicalRating && m.practicalRating[primaryGoal]) score += m.practicalRating[primaryGoal] * 4;
      if (m.beginnerFriendly) score += 10;
      if (cap === 'fast') score += 20;
      else if (cap === 'slow') score += 5;
      else score -= 50;
      if (selectedCareer && CAREER_MAP[selectedCareer]) {
        const careerInfo = CAREER_MAP[selectedCareer];
        if (careerInfo.matchedModels.includes(m.id)) score += 25;
        const overlap = careerInfo.priorities.filter(p => m.bestFor && m.bestFor.includes(p)).length;
        score += overlap * 5;
      }
      if (typeof window.__analytics !== 'undefined') {
        var successRate = window.__analytics.getModelSuccessRate(m.name);
        if (successRate && successRate.total >= 3) {
          score += Math.round(successRate.successRate / 10);
        }
      }
      return { model: m, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const primary = scored[0]?.model || null;

    const codingAlt = scored.find(x => x.model.bestFor && x.model.bestFor.includes('coding') && x.model.id !== primary?.id);
    const qualityAlt = scored.find(x => x.model.bestFor && x.model.id !== primary?.id && x.model.id !== codingAlt?.model?.id);

    const alternatives = [];
    if (codingAlt) alternatives.push({ ...codingAlt.model, bestForLabel: 'Best for coding' });
    if (qualityAlt) alternatives.push({ ...qualityAlt.model, bestForLabel: 'Best for quality' });

    return { primary, alternatives: alternatives.slice(0, 2) };
  }

  function getConfidence(model, tier, goal, career) {
    const bStr = model.size.match(/(\d+\.?\d*)/);
    const bSize = bStr ? parseFloat(bStr[1]) : 7;
    const cap = getModelCapability(tier, bSize);
    const tierLimits = { 'no-gpu': 1, 'budget-gpu': 4, 'mid-gpu': 12, 'high-end-gpu': 27, 'apple': 72 };
    const limit = tierLimits[tier] || 2;
    const primaryGoal = { chat: 'chat', coding: 'coding', writing: 'writing', documents: 'writing', agents: 'agents', all: 'chat' }[goal] || 'chat';
    const rating = (model.practicalRating && model.practicalRating[primaryGoal]) || 5;
    const hasCareerMatch = career && CAREER_MAP[career] && CAREER_MAP[career].matchedModels.includes(model.id);

    if (cap === 'fast' && bSize <= limit && model.beginnerFriendly && rating >= 8 && hasCareerMatch) return { level: 'Very High', color: 'var(--green)' };
    if (cap === 'fast' && bSize <= limit && model.beginnerFriendly && rating >= 8) return { level: 'High', color: 'var(--green)' };
    if (cap === 'fast' && bSize <= limit) return { level: 'Medium-High', color: 'var(--green)' };
    if (cap === 'fast' && bSize <= limit * 1.5) return { level: 'Medium', color: 'var(--amber)' };
    if (cap === 'slow') return { level: 'Low', color: 'var(--red)' };
    return { level: 'Very Low', color: 'var(--red)' };
  }

  function getRecConfidence(model, tier, goal) {
    let value = 99;
    var reasons = [];
    const bStr = model ? model.size.match(/(\d+\.?\d*)/) : null;
    const bSize = bStr ? parseFloat(bStr[1]) : 7;
    const tierLimits = { 'no-gpu': 1, 'budget-gpu': 4, 'mid-gpu': 12, 'high-end-gpu': 27, 'apple': 72 };
    const limit = tierLimits[tier] || 2;

    if (bSize > limit * 0.9) { value -= 10; reasons.push('Near minimum hardware limits'); }
    else { reasons.push('Fits your hardware comfortably'); }

    const cap = model ? getModelCapability(tier, bSize) : 'slow';
    if (cap === 'slow') { value -= 10; reasons.push('Performance may be limited'); }
    else if (cap === 'medium') { value -= 5; reasons.push('Moderate performance expected'); }
    else { reasons.push('Good performance on your hardware'); }

    if (model && !model.beginnerFriendly) { value -= 5; }

    const inferredCount = [goalInferred, hardwareInferred, careerInferred].filter(Boolean).length;
    if (inferredCount > 0) value -= inferredCount * 3;

    if (model && model.practicalRating) {
      const primaryGoal = { chat: 'chat', coding: 'coding', writing: 'writing', documents: 'writing', agents: 'agents', all: 'chat' }[goal] || 'chat';
      const rating = model.practicalRating[primaryGoal] || 0;
      if (rating >= 9) reasons.push('Excellent for your goal');
      else if (rating >= 7) reasons.push('Strong match for your goal');
      else reasons.push('Adequate for your goal');
    }

    if (reasons.length > 3) reasons = reasons.slice(0, 3);
    value = Math.max(60, Math.min(99, value));

    var label = 'Possible Match';
    if (value >= 95) label = 'Excellent Match';
    else if (value >= 85) label = 'Strong Match';
    else if (value >= 75) label = 'Good Match';

    var estimated = inferredCount > 0;
    var color = 'var(--green)';
    if (value < 75) color = 'var(--amber)';
    if (value < 65) color = 'var(--red)';
    if (estimated) color = 'var(--amber)';

    return { value: value, label: label, color: color, reasons: reasons, estimated: estimated };
  }

  const BEST_FOR_LABELS = {
    'chat': 'Personal ChatGPT replacement',
    'coding': 'Coding help',
    'writing': 'Writing and research',
    'research': 'Research and analysis',
    'agents': 'AI agents',
    'reasoning': 'Reasoning tasks',
    'learning': 'Learning and experiments',
    'general': 'General use',
    'experiments': 'Experiments'
  };

  function getExpectations(model) {
    const bStr = model.size.match(/(\d+\.?\d*)/);
    const bSize = bStr ? parseFloat(bStr[1]) : 7;
    const startupTime = bSize <= 3 ? '10-15 seconds' : bSize <= 7 ? '20-30 seconds' : '30-45 seconds';
    const responseSpeed = bSize <= 3 ? 'Fast' : bSize <= 7 ? 'Fast (chat), Moderate (long docs)' : 'Moderate';
    const difficulty = model.beginnerFriendly ? 'Easy' : 'Moderate';
    const setupTime = model.setupComplexity === 'easy' ? '5 minutes' : '10 minutes';
    return { startupTime, responseSpeed, storage: `${model.modelSizeGB}GB`, difficulty, setupTime, privacy: { label: '🔒 Fully Local', detail: 'Your data never leaves your device. No account required.' }, internetRequired: { label: 'No', detail: 'Runs fully on your device after setup.' } };
  }

  function getWhyNotOthers(primary, tier, goal, allModels) {
    const goalMap = { 'chat': 'chat', 'coding': 'coding', 'writing': 'writing', 'documents': 'writing', 'agents': 'agents', 'all': 'chat' };
    const primaryGoal = goalMap[goal] || 'chat';
    const tierLimits = { 'no-gpu': 1, 'budget-gpu': 4, 'mid-gpu': 12, 'high-end-gpu': 27, 'apple': 72 };
    const modelLimit = tierLimits[tier] || 2;
    const tierVramMap = { 'no-gpu': 0, 'budget-gpu': 6, 'mid-gpu': 12, 'high-end-gpu': 24, 'apple': 48 };
    const vramLimit = tierVramMap[tier] || 0;

    const others = allModels.filter(m => m.tier === tier && m.id !== primary.id);
    if (!others.length) return [];

    const results = [];

    for (const m of others) {
      const bStr = m.size.match(/(\d+\.?\d*)/);
      const bSize = bStr ? parseFloat(bStr[1]) : 7;
      const cap = getModelCapability(tier, bSize);
      let reason = '';

      if (vramLimit > 0 && m.vramGB > vramLimit * 1.2) {
        reason = `Needs ${m.vramGB}GB VRAM — more than available on your system`;
      } else if (m.bestFor && !m.bestFor.includes(primaryGoal) && m.bestFor.length > 0) {
        const othersList = m.bestFor.filter(b => b !== primaryGoal).map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(', ');
        reason = `Optimized for ${othersList}, not ${primaryGoal}`;
      } else if (cap !== 'fast') {
        reason = `Will run slowly on your hardware — better for higher-spec systems`;
      } else if (bSize > modelLimit) {
        reason = `${bSize}B model may be sluggish on your configuration`;
      } else if (!m.beginnerFriendly && primary.beginnerFriendly) {
        reason = `More complex setup — ${primary.name} is easier to start with`;
      } else {
        const priRating = (primary.practicalRating && primary.practicalRating[primaryGoal]) || 0;
        const thisRating = (m.practicalRating && m.practicalRating[primaryGoal]) || 0;
        if (thisRating < priRating) {
          reason = `Lower ${primaryGoal} quality rating (${thisRating}/10 vs ${priRating}/10)`;
        } else {
          reason = `Good model, but ${primary.name} is a better fit for ${primaryGoal}`;
        }
      }

      results.push({ model: m, reason });
      if (results.length >= 3) break;
    }

    return results;
  }

  function getUpgradeInfo(tier) {
    const map = {
      'no-gpu': {
        to: 'budget-gpu',
        label: 'Add a budget GPU (GTX 1660, used RTX 3060)',
        fromScore: 4,
        toScore: 6,
        unlocks: ['GPU-accelerated models', 'Better chat & writing', 'Coding basics'],
        models: ['Qwen2.5:7B', 'Phi-4-mini'],
        note: 'Even a small GPU makes a big difference'
      },
      'budget-gpu': {
        to: 'mid-gpu',
        label: 'Upgrade to an 8-12GB GPU (RTX 3060 12GB, RTX 4060)',
        fromScore: 6,
        toScore: 8,
        unlocks: ['Comfortable 7B-12B model support', 'Real-time chat', 'Coding assistant'],
        models: ['Qwen2.5:7B', 'Gemma 4 12B', 'Llama 3.1 8B'],
        note: 'A used RTX 3060 12GB costs ~$200 and is the best value for local AI'
      },
      'mid-gpu': {
        to: 'high-end-gpu',
        label: 'Upgrade to a 16GB+ GPU (RTX 4070 Ti Super, used RTX 3090)',
        fromScore: 8,
        toScore: 10,
        unlocks: ['Run 14B-30B models', 'Better coding & reasoning', 'Larger context'],
        models: ['Qwen3:14B', 'Qwen3.5:27B', 'DeepSeek R1 32B'],
        note: 'A used RTX 3090 (24GB) is the best upgrade for high-end local AI'
      },
      'apple': {
        to: 'apple-higher',
        label: 'Upgrade to a Mac with more unified memory',
        fromScore: 7,
        toScore: 9,
        unlocks: ['Run larger models with Metal acceleration', 'Better multi-tasking', 'Larger context windows'],
        models: ['Qwen3:14B', 'Qwen3.5:27B'],
        note: 'More unified memory unlocks much larger models on Apple Silicon'
      }
    };
    if (tier === 'high-end-gpu') return { maxed: true };
    return map[tier] || null;
  }

  function getWhyPoints(model, tier, goal) {
    const points = [];
    const bStr = model.size.match(/(\d+\.?\d*)/);
    const bSize = bStr ? parseFloat(bStr[1]) : 7;
    const cap = getModelCapability(tier, bSize);
    const tierLimits = { 'no-gpu': 1, 'budget-gpu': 4, 'mid-gpu': 12, 'high-end-gpu': 27, 'apple': 72 };
    const limit = tierLimits[tier] || 2;

    if (bSize <= limit) points.push(`Runs comfortably on your hardware`);
    else if (bSize <= limit * 1.5) points.push(`Slightly larger than ideal but works`);
    if (cap === 'fast') points.push(`Fast inference speed`);
    if (model.beginnerFriendly) points.push(`Easy to set up`);
    if (model.bestFor && model.bestFor.includes(goal)) points.push(`Specifically good for ${goal}`);
    else points.push(`Good all-around model`);

    if (selectedCareer && CAREER_MAP[selectedCareer]) {
      const careerInfo = CAREER_MAP[selectedCareer];
      if (careerInfo.matchedModels.includes(model.id)) {
        points.push(`Popular choice among ${careerInfo.label}s`);
      }
      const overlap = careerInfo.priorities.filter(p => model.bestFor && model.bestFor.includes(p)).length;
      if (overlap > 0) points.push(`Aligns with ${careerInfo.label} workflow`);
    }

    const primaryGoal = { chat: 'chat', coding: 'coding', writing: 'writing', documents: 'writing', agents: 'agents', all: 'chat' }[goal] || 'chat';
    if (model.practicalRating && model.practicalRating[primaryGoal] >= 8) points.push(`${primaryGoal.charAt(0).toUpperCase() + primaryGoal.slice(1)} quality: excellent`);
    if (model.toolRecommendation === 'Ollama') points.push(`Simple one-command install`);
    points.push(`Runs completely offline`);

    return points;
  }

  function getCapabilityItems(breakdown, tier, goal) {
    const items = { can: [], slow: [], not: [] };
    const goalMap = { 'chat': 'chat', 'coding': 'coding', 'writing': 'writing', 'documents': 'writing', 'agents': 'agents', 'all': null };
    const primaryGoal = goalMap[goal];

    if (breakdown.chat >= 6) items.can.push({ icon: '💬', label: 'Private ChatGPT', note: breakdown.chat >= 8 ? 'Excellent' : 'Good' });
    else if (breakdown.chat >= 4) items.slow.push({ icon: '💬', label: 'Simple Chat', note: 'Limited but works' });

    if (primaryGoal === 'coding' || goal === 'all') {
      if (breakdown.coding >= 7) items.can.push({ icon: '💻', label: 'Coding Assistant', note: breakdown.coding >= 9 ? 'Excellent' : 'Good' });
      else if (breakdown.coding >= 4) items.slow.push({ icon: '💻', label: 'Code Help', note: 'Basic assistance' });
    }

    if (primaryGoal === 'writing' || primaryGoal === 'documents' || goal === 'all') {
      if (breakdown.writing >= 7) items.can.push({ icon: '✍️', label: 'Writing & Research', note: breakdown.writing >= 9 ? 'Excellent' : 'Good' });
      else if (breakdown.writing >= 4) items.slow.push({ icon: '✍️', label: 'Writing', note: 'Basic assistance' });
    }

    if (primaryGoal === 'agents' || goal === 'all') {
      if (breakdown.agents >= 7) items.can.push({ icon: '🤖', label: 'AI Agents', note: 'Good for automation' });
      else if (breakdown.agents >= 4) items.slow.push({ icon: '🤖', label: 'Simple Agents', note: 'Limited capabilities' });
    }

    const weakTiers = ['no-gpu', 'budget-gpu'];
    if (weakTiers.includes(tier)) {
      items.not.push({ icon: '🦙', label: '70B+ Models', note: 'Needs 14GB+ VRAM' });
      items.not.push({ icon: '👁️', label: 'Real-time Vision', note: 'Needs dedicated GPU' });
    }
    if (weakTiers.includes(tier)) {
      items.not.push({ icon: '🧠', label: 'Large Agent Swarms', note: 'Needs more memory' });
    }

    return items;
  }

  function renderResults(tier) {
    if (!modelsData || !modelsData.tiers) {
      console.warn('Data not loaded yet');
      return;
    }
    const careerArea = document.getElementById('career-area');
    if (careerArea) careerArea.classList.add('hidden');
    const tierInfo = getTierInfo(tier);
    if (!tierInfo) {
      console.warn('Unknown tier:', tier);
      return;
    }
    const models = getRecommendationsForTier(tier);
    const score = calcReadinessScore(tier);
    const breakdown = getReadinessBreakdown(tier);
    const section = document.getElementById('results-section');
    if (!section) return;

    const goal = selectedGoal || 'all';

    const { primary, alternatives } = pickRecommendations(models, goal, tier);

    const capItems = getCapabilityItems(breakdown, tier, goal);

    // IMPORTANT: compute showPrimary BEFORE building primaryHTML
    const conf = primary ? getConfidence(primary, tier, goal, selectedCareer) : null;
    const showCloud = score <= 4 || (conf && (conf.level === 'Low' || conf.level === 'Very Low'));
    if (showCloud) track('cloud_fallback_triggered', { reason: 'weak_hardware', tier, goal });
    const showPrimary = primary && !showCloud;

    const whyNotModels = showCloud ? [] : getWhyNotOthers(primary, tier, goal, models);
    const whyNotHTML = whyNotModels.length > 0 ? `
      <div class="why-not-section">
        <div class="why-not-title">Why not the others?</div>
        ${whyNotModels.map(w => `
          <div class="why-not-item">
            <div class="why-not-name">${wrapInGlossary(w.model.name.replace(/\s*\d+(\.\d+)?B\s*$/i, '').trim())}</div>
            <div class="why-not-reason">${w.reason}</div>
          </div>
        `).join('')}
      </div>` : '';

    let primaryHTML = '';
    if (showPrimary && primary) {
      const quantLabel = primary.recommendedQuant || 'Q4_K_M';
      const quantTip = getQuantizationTooltip(quantLabel);
      const recConf = getRecConfidence(primary, tier, goal);
      const whyPoints = getWhyPoints(primary, tier, goal);

      primaryHTML = `
      <div class="rec-card fade-in">
        <div class="rec-badge ${recConf.estimated ? 'rec-badge-estimated' : ''}">${recConf.estimated ? 'Estimated Recommendation' : 'Recommended'}</div>
        <div class="rec-header">
          <div class="rec-model-info">
            <span class="rec-model-name">${wrapInGlossary(primary.name.replace(/\s*\d+(\.\d+)?B\s*$/i, '').trim())}</span>
            <span class="rec-model-size">${primary.size}</span>
          </div>
          <div class="rec-confidence" style="color:${recConf.color}">
            <span class="rec-conf-label">${recConf.value}% Match</span>
            <span class="rec-conf-value">${recConf.label}</span>
          </div>
          ${selectedCareer && CAREER_MAP[selectedCareer] ? `
          <div class="rec-career-badge">
            <span class="rec-career-icon">${CAREER_MAP[selectedCareer].icon}</span>
            <span class="rec-career-label">${CAREER_MAP[selectedCareer].label}</span>
          </div>` : ''}
        </div>
        ${recConf.reasons.length > 0 ? `
        <div class="rec-conf-reasons">
          ${recConf.reasons.map(r => `<div class="rec-conf-reason">✓ ${r}</div>`).join('')}
        </div>` : ''}
        <p class="rec-desc">${wrapInGlossary(primary.description)}</p>
        <div class="rec-why">
          <div class="rec-why-title">Why We Picked This</div>
          ${whyPoints.map(p => `<div class="rec-why-point">✓ ${p}</div>`).join('')}
        </div>
        ${primary.bestFor && primary.bestFor.length > 0 ? `
        <div class="rec-section">
          <div class="rec-section-title">Best For</div>
          <div class="rec-bestfor-list">
            ${primary.bestFor.map(t => `<span class="rec-bestfor-tag">${BEST_FOR_LABELS[t] || t}</span>`).join('')}
          </div>
        </div>` : ''}
        ${(() => { const e = getExpectations(primary); return `
        <div class="rec-section" style="margin-top:0.75rem">
          <div class="rec-section-title">What to Expect</div>
          <div class="rec-expectations">
            <div class="rec-expect-row"><span class="rec-expect-label">Response speed</span><span class="rec-expect-value">${e.responseSpeed}</span></div>
            <div class="rec-expect-row"><span class="rec-expect-label">Startup time</span><span class="rec-expect-value">${e.startupTime}</span></div>
            <div class="rec-expect-row"><span class="rec-expect-label">Storage needed</span><span class="rec-expect-value">${e.storage}</span></div>
            <div class="rec-expect-row"><span class="rec-expect-label">Difficulty</span><span class="rec-expect-value">${e.difficulty}</span></div>
            <div class="rec-expect-row"><span class="rec-expect-label">Setup time</span><span class="rec-expect-value">${e.setupTime}</span></div>
            <div class="rec-expect-row"><span class="rec-expect-label">Privacy</span><span class="rec-expect-value">${e.privacy.label}</span></div>
            <div class="rec-expect-row"><span class="rec-expect-label">Internet required</span><span class="rec-expect-value">${e.internetRequired.label} — ${e.internetRequired.detail}</span></div>
          </div>
        </div>`; })()}
        <div class="rec-meta">
          <span class="badge b-primary">📦 ${primary.modelSizeGB}GB</span>
          <span class="badge b-purple">💾 ${primary.vramGB}GB VRAM</span>
          <span class="badge b-green">📏 ${(primary.contextLength/1024).toFixed(0)}K context</span>
          <span class="badge b-purple quant-badge" title="${quantTip}">⚡ ${quantLabel}</span>
        </div>
        ${renderInstallBox(primary)}
      </div>`;
    }

    let altHTML = '';
    if (alternatives.length > 0) {
      altHTML = `
      <div class="alt-section">
        <h3 style="margin-bottom:0.75rem">Also worth considering</h3>
        <div class="alt-grid">
          ${alternatives.map(m => `
          <div class="alt-card">
            <div class="alt-card-header">
              <span class="alt-model-name">${wrapInGlossary(m.name.replace(/\s*\d+(\.\d+)?B\s*$/i, '').trim())}</span>
              <span class="badge b-primary" style="font-size:0.7rem">${m.size}</span>
            </div>
            <p class="alt-desc">${wrapInGlossary(m.bestForLabel || m.description.substring(0, 120))}</p>
            <div class="alt-install">${m.installCommand}</div>
          </div>`).join('')}
        </div>
      </div>`;
    }

    const compendiumLink = selectedTier ? `
      <div class="compendium-link-row">
        <span>Want to explore more options?</span>
        <a href="#" class="compendium-link" id="compendium-link-btn">View Free AI Models Compendium →</a>
      </div>` : '';

    const scoreBarColor = (val) => {
      const cls = getRatingClass(val);
      if (cls === 'rating-high') return 'var(--green)';
      if (cls === 'rating-mid')  return 'var(--amber)';
      return 'var(--red)';
    };

    section.innerHTML = `
      <div class="fade-in">
        <div class="results-toolbar">
          <button id="share-btn" class="btn-share">Share text</button>
          <button id="share-link-btn" class="btn-share">Copy result link</button>
          <button id="copy-setup-btn" class="btn-share">Copy Setup</button>
          <button id="dev-toggle-btn" class="btn-dev-toggle">Show install code (developers)</button>
        </div>

        <div class="score-card">
          <div class="score-top">
            <div>
              <div class="score-label">Your AI Readiness</div>
              <div class="score-number" style="color:var(--accent)">${score}<span style="font-size:1.5rem;color:var(--text-tertiary)">/10</span></div>
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
                  <div class="score-bar"><div class="score-bar-fill" style="width:${val * 10}%;background:${scoreBarColor(val)}"></div></div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        ${capItems.can.length > 0 || capItems.slow.length > 0 || capItems.not.length > 0 ? `
        <div class="capability-card">
          <div class="cap-header">
            <h3 style="margin:0">What you can do with local AI</h3>
          </div>
          ${capItems.can.length > 0 ? `
          <div class="cap-group">
            <div class="cap-group-label">✓ Can Run Well</div>
            <div class="cap-items-grid">
              ${capItems.can.map(item => `
                <div class="cap-item can">
                  <span class="cap-item-icon">${item.icon}</span>
                  <span class="cap-item-label">${item.label}</span>
                  <span class="cap-item-note">${item.note}</span>
                </div>
              `).join('')}
            </div>
          </div>` : ''}
          ${capItems.slow.length > 0 ? `
          <div class="cap-group">
            <div class="cap-group-label">⚠ Can Run Slowly</div>
            <div class="cap-items-grid">
              ${capItems.slow.map(item => `
                <div class="cap-item slow">
                  <span class="cap-item-icon">${item.icon}</span>
                  <span class="cap-item-label">${item.label}</span>
                  <span class="cap-item-note">${item.note}</span>
                </div>
              `).join('')}
            </div>
          </div>` : ''}
          ${capItems.not.length > 0 ? `
          <div class="cap-group">
            <div class="cap-group-label">✗ Not Recommended</div>
            <div class="cap-items-grid">
              ${capItems.not.map(item => `
                <div class="cap-item not">
                  <span class="cap-item-icon">${item.icon}</span>
                  <span class="cap-item-label">${item.label}</span>
                  <span class="cap-item-note">${item.note}</span>
                </div>
              `).join('')}
            </div>
          </div>` : ''}
        </div>` : ''}

        ${(() => { const ui = getUpgradeInfo(tier); if (!ui) return ''; if (ui.maxed) return `
        <div class="upgrade-card upgrade-maxed">
          <div class="upgrade-title">🚀 Your setup is maxed out</div>
          <p class="upgrade-desc">You already have a top-tier configuration. Current hardware can run the best local AI models available.</p>
        </div>`; return `
        <div class="upgrade-card">
          <div class="upgrade-title">Want better performance?</div>
          <div class="upgrade-compare">
            <div class="upgrade-current">
              <div class="upgrade-score-label">Current score</div>
              <div class="upgrade-score">${ui.fromScore}<span class="upgrade-score-denom">/10</span></div>
            </div>
            <div class="upgrade-arrow">→</div>
            <div class="upgrade-project">
              <div class="upgrade-score-label">Projected score</div>
              <div class="upgrade-score">${ui.toScore}<span class="upgrade-score-denom">/10</span></div>
            </div>
          </div>
          <div class="upgrade-suggestion">
            <div class="upgrade-suggest-label">Suggested upgrade</div>
            <div class="upgrade-suggest-text">${ui.label}</div>
          </div>
          ${ui.note ? `<p class="upgrade-note">${ui.note}</p>` : ''}
          <div class="upgrade-unlocks">
            <div class="upgrade-unlock-label">What you'd unlock</div>
            <ul class="upgrade-unlock-list">
              ${ui.unlocks.map(u => `<li>✓ ${u}</li>`).join('')}
            </ul>
          </div>
          <div class="upgrade-models">
            <span class="upgrade-models-label">Models you could run: </span>
            ${ui.models.map(m => `<span class="badge b-primary upgrade-model-badge">${m}</span>`).join('')}
          </div>
        </div>`; })()}

        ${showCloud ? `
        <div class="opt-out-card">
          <div class="opt-out-title">Honestly, local AI might not be the move</div>
          <p class="opt-out-desc">Based on your hardware, running local AI will be slow and limited. Here are free alternatives that work better:</p>
          <div class="cloud-alts-grid">
            <div class="cloud-alt-card">
              <div class="cloud-alt-badge">🥇 Best overall</div>
              <div class="cloud-alt-name">Gemini 2.0 Flash</div>
              <div class="cloud-alt-desc">Free, multimodal, huge context</div>
              <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" class="btn-secondary">Use Gemini Free</a>
            </div>
            <div class="cloud-alt-card">
              <div class="cloud-alt-badge">🥈 Fastest</div>
              <div class="cloud-alt-name">Groq</div>
              <div class="cloud-alt-desc">1,000 tokens/sec, free tier</div>
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" class="btn-secondary">Try Groq Free</a>
            </div>
            <div class="cloud-alt-card">
              <div class="cloud-alt-badge">🥉 Most variety</div>
              <div class="cloud-alt-name">OpenRouter</div>
              <div class="cloud-alt-desc">27+ free models, auto-switches</div>
              <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" class="btn-secondary">Try OpenRouter Free</a>
            </div>
          </div>
          <p style="font-size:0.8rem;color:var(--text-tertiary);margin-top:0.75rem">Or try our smallest models - they work on any hardware, just slower.</p>
        </div>` : ''}

        ${primaryHTML}
        ${altHTML}
        ${showPrimary ? whyNotHTML : ''}
        ${selectedTier ? compendiumLink : ''}

        <div id="community-section"></div>

        <div class="feedback-section">
          <p class="feedback-prompt">Did this setup work?</p>
          <div class="feedback-btns">
            <button class="feedback-btn" data-feedback="yes">👍 Yes</button>
            <button class="feedback-btn" data-feedback="partial">🤷 Partially</button>
            <button class="feedback-btn" data-feedback="no">👎 No</button>
          </div>
          <p class="feedback-thanks hidden">Thanks for your feedback!</p>
        </div>

        <div class="feedback-section feedback-text-section">
          <p class="feedback-prompt">Was anything confusing?</p>
          <div class="feedback-tags">
            <button class="feedback-tag" data-tag="wrong-rec">Wrong Recommendation</button>
            <button class="feedback-tag" data-tag="too-tech">Too Technical</button>
            <button class="feedback-tag" data-tag="hw-missing">Hardware Missing</button>
            <button class="feedback-tag" data-tag="model-missing">Model Missing</button>
            <button class="feedback-tag" data-tag="confusing">Confusing</button>
            <button class="feedback-tag" data-tag="other">Other</button>
          </div>
          <textarea class="feedback-textarea" placeholder="Tell us more (optional)..." rows="3"></textarea>
          <button class="feedback-submit-btn">Submit</button>
          <p class="feedback-thanks hidden">Thanks for your help!</p>
        </div>
      </div>`;

    const modelName = primary ? primary.name.replace(/\s*\d+(\.\d+)?B\s*$/i, '').trim() : 'N/A';
    const tool = primary ? (primary.toolRecommendation || 'Ollama') : 'Ollama';
    const command = primary ? (primary.installCommand || 'ollama pull <model>') : 'ollama pull <model>';
    const alternativeNames = alternatives.map(m => m.name);
    currentResult = {
      score,
      canRun: [...capItems.can, ...capItems.slow].map(i => i.label),
      modelName,
      tool,
      command,
      alternativeNames
    };

    try {
      var persistData = { score: score, modelName: modelName, tool: tool, command: command, goal: selectedGoal, tier: selectedTier, career: selectedCareer, canRun: currentResult.canRun, timestamp: Date.now() };
      localStorage.setItem('byoc_recommendation', JSON.stringify(persistData));
    } catch (e) { /* silent */ }

    var communityHTML = '';
    if (typeof window.__analytics !== 'undefined') {
      var stats = window.__analytics.getCommunityStats(selectedGoal, selectedTier, modelName);
      if (stats) {
        communityHTML = '<div class="community-stats"><span class="community-rate">' + stats.successRate + '%</span><span class="community-label">Community success rate · based on ' + stats.total + ' similar setups</span></div>';
      }
      var popular = window.__analytics.getPopularSetups(selectedTier);
      if (popular && popular.recommendation !== modelName) {
        communityHTML += '<div class="community-stats community-popular"><span class="community-rate">' + popular.successRate + '%</span><span class="community-label">Popular setup: <strong>' + popular.recommendation + '</strong> · ' + popular.total + ' users</span></div>';
      }
      var recStats = window.__analytics.getRecommendationStats();
      if (recStats && recStats.total > 0) {
        communityHTML += '<div class="community-insights"><span class="community-heading">Community Insights</span>';
        communityHTML += '<span class="community-stat">' + recStats.total + ' recommendations generated</span>';
        if (recStats.topGoal) communityHTML += '<span class="community-stat">Most popular: <strong>' + recStats.topGoal.charAt(0).toUpperCase() + recStats.topGoal.slice(1) + '</strong></span>';
        if (recStats.topModel) communityHTML += '<span class="community-stat">Top model: <strong>' + recStats.topModel + '</strong></span>';
        if (recStats.topHardware) communityHTML += '<span class="community-stat">Common hardware: <strong>' + recStats.topHardware.replace(/-/g, ' ') + '</strong></span>';
        communityHTML += '</div>';
      }
    }
    var communityEl = section.querySelector('#community-section');
    if (communityEl) communityEl.innerHTML = communityHTML;

    const goalKey = selectedGoal || 'unknown';
    const tierKey = selectedTier || 'unknown';
    var hasExistingFeedback = false;
    if (typeof window.__analytics !== 'undefined') {
      hasExistingFeedback = !!window.__analytics.getFeedback(modelName, tierKey, goalKey);
    } else {
      const storageKey = 'fb_' + goalKey + '_' + tierKey + '_' + modelName.replace(/\s+/g, '_');
      hasExistingFeedback = !!localStorage.getItem(storageKey);
    }
    if (hasExistingFeedback) {
      const fb = section.querySelector('.feedback-section');
      if (fb) {
        fb.querySelector('.feedback-btns')?.classList.add('hidden');
        fb.querySelector('.feedback-thanks')?.classList.remove('hidden');
      }
    }
    var textFbKey = 'fbt_' + goalKey + '_' + tierKey + '_' + modelName.replace(/\s+/g, '_');
    if (localStorage.getItem(textFbKey)) {
      var tfb = section.querySelector('.feedback-text-section');
      if (tfb) {
        tfb.querySelector('.feedback-tags')?.classList.add('hidden');
        tfb.querySelector('.feedback-textarea')?.classList.add('hidden');
        tfb.querySelector('.feedback-submit-btn')?.classList.add('hidden');
        tfb.querySelector('.feedback-thanks')?.classList.remove('hidden');
      }
    }

    section.classList.remove('hidden');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (careerArea) careerArea.classList.remove('hidden');
    track('recommendation_generated', { model: primary ? primary.ollamaTag || primary.name : 'none', goal: selectedGoal, hardware: selectedTier, hasCloudFallback: !!showCloud });
    if (typeof window.__analytics !== 'undefined' && primary) {
      window.__analytics.saveRecommendation(
        primary.ollamaTag || primary.name,
        selectedTier || 'unknown',
        selectedGoal || 'unknown',
        score || 0,
        selectedCareer || null
      );
    }
    renderStarterPack(primary, selectedGoal);
  }

  function renderStarterPack(model, goal) {
    var sp = document.getElementById('starter-pack');
    if (!sp) return;
    fetch('data/prompts.json').then(function(r) { return r.json(); }).then(function(prompts) {
      var goalPrompts = prompts.byGoal && (prompts.byGoal[goal] || prompts.byGoal['general']);
      if (!goalPrompts || !goalPrompts.length) { sp.style.display = 'none'; return; }

      var isLowEnd = !model.tier || (Array.isArray(model.tier) && model.tier === 'no-gpu');
      var ui = isLowEnd ? 'LM Studio' : 'OpenWebUI';

      document.getElementById('sp-ui').innerHTML =
        '<div style="margin-bottom:1.25rem"><h4>Recommended UI: ' + ui + '</h4>' +
        '<p style="font-size:13px">' + (ui === 'LM Studio'
          ? 'No terminal needed. Free from <a href="https://lmstudio.ai">lmstudio.ai</a>'
          : 'Full chat interface: <code>docker run -d -p 3000:8080 ghcr.io/open-webui/open-webui:main</code>'
        ) + '</p></div>';

      document.getElementById('sp-prompts').innerHTML =
        '<div style="margin-bottom:1.25rem"><h4>Starter Prompts</h4><ul>' +
        goalPrompts.slice(0, 5).map(function(p) {
          var text = p.prompt || p;
          return '<li style="margin-bottom:8px"><code style="font-size:12px;background:var(--surface-secondary,#f3f4f6);padding:4px 8px;border-radius:4px">' +
            text.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</code></li>';
        }).join('') + '</ul></div>';

      document.getElementById('sp-checklist').innerHTML =
        '<div><h4>First Week Checklist</h4><ul style="list-style:none;padding:0">' +
        [
          'Install Ollama from ollama.com',
          'Run: ollama pull ' + model.ollamaTag,
          'Test: ollama run ' + model.ollamaTag + ' "Hello"',
          'Install ' + ui,
          'Try all starter prompts above'
        ].map(function(item) {
          return '<li style="margin-bottom:8px"><input type="checkbox" style="margin-right:8px"> ' + item + '</li>';
        }).join('') + '</ul></div>';

      sp.style.display = 'block';
    })['catch'](function() { sp.style.display = 'none'; });
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
      <button class="copy-btn">📋 Copy command</button>
      <div class="dev-code-toggle" style="display:none">
        <div class="install-label" style="margin-top:0.75rem">Alternative: Llamafile</div>
        <div class="install-command">${model.alternativeCommand || 'curl -L https://github.com/Mozilla-Ocho/llamafile/releases/latest/download/' + model.name.split(' ')[0].toLowerCase() + '-*.llamafile -o ' + model.name.split(' ')[0].toLowerCase() + '.llamafile && chmod +x ' + model.name.split(' ')[0].toLowerCase() + '.llamafile && ./' + model.name.split(' ')[0].toLowerCase() + '.llamafile'}</div>
        <button class="copy-btn">📋 Copy command</button>
      </div>
    </div>`;
  }

  function selectHW(id, tier, inferred = false) {
    selectedTier = tier;
    hardwareInferred = inferred;
    autoDetectCancelled = true;
    track('hardware_selected', { id, tier, inferred });
    document.querySelectorAll('.hw-card').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-pressed', 'false');
    });
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
    }
    updateURL();
    renderResults(tier);
  }

  function toggleBeginnerMode(checked) {
    beginnerMode = checked;
    if (selectedTier) renderResults(selectedTier);
  }

  function selectTierAll() {
    const resultsSection = document.getElementById('results-section');
    if (!resultsSection) return;
    selectedTier = null;
    const allModels = modelsData.models;
    const breakdown = { chat: 8, writing: 7, coding: 6, reasoning: 6, agents: 5 };

    resultsSection.innerHTML = `
      <div class="results-toolbar">
        <button id="share-btn" class="btn-share">Share text</button>
        <button id="share-link-btn" class="btn-share">Copy result link</button>
        <button id="dev-toggle-btn" class="btn-dev-toggle">Show install code (developers)</button>
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

  function applyTheme(theme) {
    const btn = document.getElementById('theme-toggle');
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      if (btn) {
        const icon = btn.querySelector('.toggle-icon');
        const label = btn.querySelector('.toggle-label');
        if (icon) icon.textContent = '☀️';
        if (label) label.textContent = 'Light mode';
        else btn.textContent = '☀️';
      }
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      if (btn) {
        const icon = btn.querySelector('.toggle-icon');
        const label = btn.querySelector('.toggle-label');
        if (icon) icon.textContent = '🌙';
        if (label) label.textContent = 'Dark mode';
        else btn.textContent = '🌙';
      }
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
      applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyTheme('dark');
    }
  }

  function restoreUIState(state) {
        if (state.goal) {
            selectedGoal = state.goal;
            const goalCard = document.querySelector(`.goal-card[data-goal="${state.goal}"]`);
            if (goalCard) goalCard.classList.add('selected');
            const hwSection = document.getElementById('hw-section');
            if (hwSection) hwSection.classList.remove('hidden');
        }
        if (state.career) {
            selectedCareer = state.career;
            const careerCard = document.querySelector(`.career-card[data-career="${state.career}"]`);
            if (careerCard) {
                careerCard.classList.add('selected');
                careerCard.setAttribute('aria-pressed', 'true');
            }
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
  }
    async function init() {
    initTheme();
    // Show export button only when ?dev=true in URL
    if (new URLSearchParams(location.search).has('dev')) {
      var exportBtn = document.getElementById('export-feedback-btn');
      if (exportBtn) exportBtn.style.display = 'inline';
    }
    track('wizard_started');
    try {
      await loadData();
    } catch (err) {
      console.error('Failed to load app data:', err);
      document.body.innerHTML = `<div style="text-align:center;padding:4rem 1rem;font-family:Inter,sans-serif">
        <h2 style="color:#e85d04;margin-bottom:1rem">⚠️ Could not load app data</h2>
        <p style="color:#666">Please check your internet connection and <a href="" style="color:#e85d04">reload the page</a>.</p>
      </div>`;
      return;
    }
    renderHWSelector();
    renderCareerSelector();
    renderCloudProviders();
    setupEventListeners();
    showGuide('ollama');
    isAppleSilicon = detectAppleSilicon();

    var state = decodeState();
    restoreUIState(state);

    if (!state.tier) {
      try {
        var saved = localStorage.getItem('byoc_recommendation');
        if (saved) {
          var parsed = JSON.parse(saved);
          if (parsed.goal && parsed.tier) {
            selectedGoal = parsed.goal;
            selectedTier = parsed.tier;
            if (parsed.career) selectedCareer = parsed.career;
            var goalCard = document.querySelector('.goal-card[data-goal="'+parsed.goal+'"]');
            if (goalCard) goalCard.classList.add('selected');
            var hwSection = document.getElementById('hw-section');
            if (hwSection) hwSection.classList.remove('hidden');
            var opt = gpusData.manualOptions.find(function(o) { return o.tier === parsed.tier; });
            if (opt) {
              var card = document.querySelector('[data-id="'+opt.id+'"]');
              if (card) card.classList.add('selected');
            }
            renderResults(parsed.tier);
            track('result_restored', { goal: parsed.goal, tier: parsed.tier });
          }
        }
      } catch (e) { /* silent */ }
      if (!selectedTier) {
      detectWebGPU().then(webgpuName => {
        const gpuName = webgpuName || detectGPU();
        const vramGB = detectVRAM();
        const banner = document.getElementById('detected-banner');
        if (gpuName && banner) {
          const match = matchGPUName(gpuName);
          if (match) {
            banner.classList.remove('hidden');
            const isSilicon = match.tier === 'apple';
            const memLabel = isSilicon ? `${Math.round(match.vramGB)}GB unified` : `${match.vramGB}GB VRAM`;
            banner.innerHTML = `🖥️ Detected: <strong>${match.name}</strong> (${memLabel}) - selecting automatically...`;
            setTimeout(() => {
              if (autoDetectCancelled) return;
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
      });
    }
  }
  }

  function handleHWSubQuestion(family) {
    const container = document.getElementById('hw-sub-followup');
    if (!container) return;

    if (family === 'chromebook') {
      const opt = gpusData.manualOptions.find(o => o.id === 'old-laptop');
      if (opt) selectHW(opt.id, opt.tier, true);
      return;
    }
    if (family === 'unsure') {
      const opt = gpusData.manualOptions.find(o => o.id === 'modern-laptop-no-gpu');
      if (opt) selectHW(opt.id, opt.tier, true);
      return;
    }
    if (family === 'windows-laptop' || family === 'windows-desktop') {
      const isDesktop = family === 'windows-desktop';
      container.classList.remove('hidden');
      container.innerHTML = `
        <p class="sub-question-prompt">Can it play modern games?</p>
        <div class="sub-question-grid">
          <button class="hw-followup-btn" data-hw-tier="${isDesktop ? 'high-end-gpu' : 'mid-gpu'}">🎮 Yes</button>
          <button class="hw-followup-btn" data-hw-tier="no-gpu">❌ No</button>
          <button class="hw-followup-btn" data-hw-tier="${isDesktop ? 'mid-gpu' : 'no-gpu'}">❓ Not Sure</button>
        </div>`;
      container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (family === 'mac') {
      container.classList.remove('hidden');
      container.innerHTML = `
        <p class="sub-question-prompt">Which Mac?</p>
        <div class="sub-question-grid">
          <button class="hw-followup-btn" data-hw-tier="apple">🍎 Apple Silicon (M1/M2/M3/M4)</button>
          <button class="hw-followup-btn" data-hw-tier="no-gpu">💻 Intel Mac</button>
          <button class="hw-followup-btn" data-hw-tier="apple">❓ Not Sure</button>
        </div>`;
      container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  }

  function selectTool(tool) {
    document.querySelectorAll('.tool-option').forEach(o => o.classList.remove('selected'));
    const el = document.querySelector(`.tool-option[data-tool="${tool}"]`);
    if (el) el.classList.add('selected');
  }

  function showGuide(guide) {
    const tabs = document.querySelectorAll('.guide-tab');
    const contents = document.querySelectorAll('.guide-content');
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.style.display = 'none');
    const targetTab = document.querySelector(`.guide-tab[data-guide="${guide}"]`);
    if (targetTab) targetTab.classList.add('active');
    const targetContent = document.getElementById(`guide-${guide}`);
    if (targetContent) targetContent.style.display = 'block';
  }

  function renderCloudProviders() {
    const container = document.getElementById('cloud-providers-container');
    if (!container || !cloudProvidersData || !cloudProvidersData.providers) return;
    const tpl = document.getElementById('cloud-provider-template');
    if (!tpl) return;
    
    container.innerHTML = '';
    cloudProvidersData.providers.forEach(p => {
      const clone = tpl.content.cloneNode(true);
      clone.querySelector('.cloud-provider-name').textContent = p.name;
      clone.querySelector('.cloud-provider-desc').textContent = p.desc;
      
      const badgeBox = clone.querySelector('.cloud-install-box');
      p.badges.forEach(b => {
        const span = document.createElement('span');
        span.className = 'cloud-badge ' + b.class;
        span.textContent = b.text;
        badgeBox.appendChild(span);
      });
      
      const modelsBox = clone.querySelector('.cloud-models');
      p.models.forEach(m => {
        const chip = document.createElement('span');
        chip.className = 'cloud-model-chip';
        chip.textContent = m;
        modelsBox.appendChild(chip);
      });
      
      const stepsOl = clone.querySelector('.cloud-steps');
      p.steps.forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = s;
        stepsOl.appendChild(li);
      });
      
      clone.querySelector('.cloud-note').textContent = p.note;
      container.appendChild(clone);
    });
  }

  function setupEventListeners() {
    document.querySelectorAll('.goal-card').forEach(btn => {
      btn.addEventListener('click', (e) => selectGoal(e.currentTarget.dataset.goal));
    });
    
    document.querySelectorAll('.hw-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e.currentTarget.dataset.id === 'dont-know') {
          document.getElementById('hw-options').classList.add('hidden');
          document.getElementById('hw-sub-questions').classList.remove('hidden');
          document.getElementById('hw-sub-questions').scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          selectHW(e.currentTarget.dataset.id, e.currentTarget.dataset.tier);
        }
      });
    });

    const toggleInput = document.getElementById('beginner-toggle-input');
    if (toggleInput) toggleInput.addEventListener('change', (e) => toggleBeginnerMode(e.target.checked));

    document.querySelectorAll('.guide-tab').forEach(btn => {
      btn.addEventListener('click', (e) => showGuide(e.currentTarget.dataset.guide));
    });

    document.querySelectorAll('.tool-option').forEach(btn => {
      btn.addEventListener('click', (e) => selectTool(e.currentTarget.dataset.tool));
    });
    
    document.addEventListener('click', e => {
      if (e.target.closest('#share-btn')) {
        shareResult(e.target.closest('#share-btn'), 'text');
      } else if (e.target.closest('#share-link-btn')) {
        shareResult(e.target.closest('#share-link-btn'), 'link');
      } else if (e.target.closest('#copy-setup-btn')) {
        var btn = e.target.closest('#copy-setup-btn');
        var cr = currentResult || {};
        var text = generateSetupText(cr.modelName, cr.alternativeNames || [], selectedTier, selectedGoal);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function() {
            btn.textContent = 'Copied!';
            setTimeout(function() { btn.textContent = 'Copy Setup'; }, 2000);
          });
        }
        track('share_setup_clicked', { goal: selectedGoal, tier: selectedTier });
      } else if (e.target.closest('.feedback-btn') && !e.target.closest('.feedback-btn').disabled) {
        const btn = e.target.closest('.feedback-btn');
        const value = btn.dataset.feedback;
        const goalKey = selectedGoal || 'unknown';
        const tierKey = selectedTier || 'unknown';
        const modelName = currentResult ? currentResult.modelName : 'unknown';
        if (typeof window.__analytics !== 'undefined') {
          window.__analytics.saveSetupSuccess(modelName, tierKey, goalKey, value);
        } else {
          const fallbackKey = 'succ_' + goalKey + '_' + tierKey + '_' + modelName.replace(/\s+/g, '_');
          if (!localStorage.getItem(fallbackKey)) {
            localStorage.setItem(fallbackKey, JSON.stringify({ model: modelName, hardware: tierKey, goal: goalKey, success: value, timestamp: new Date().toISOString() }));
          }
        }
        btn.closest('.feedback-section').querySelector('.feedback-btns').classList.add('hidden');
        btn.closest('.feedback-section').querySelector('.feedback-thanks').classList.remove('hidden');
      } else if (e.target.closest('a[href*="gemini.google.com"]')) {
        track('honest_redirect_triggered', { recommendation: 'gemini' });
      } else if (e.target.closest('a[href*="console.groq.com"]')) {
        track('honest_redirect_triggered', { recommendation: 'groq' });
      } else if (e.target.closest('a[href*="openrouter.ai"]')) {
        track('honest_redirect_triggered', { recommendation: 'openrouter' });
      } else if (e.target.closest('.feedback-tag')) {
        const tag = e.target.closest('.feedback-tag');
        tag.classList.toggle('selected');
      } else if (e.target.closest('.feedback-submit-btn')) {
        const section = e.target.closest('.feedback-text-section');
        const tags = Array.from(section.querySelectorAll('.feedback-tag.selected')).map(t => t.dataset.tag);
        const text = section.querySelector('.feedback-textarea').value.trim();
        if (tags.length === 0 && !text) return;
        const modelName = currentResult ? currentResult.modelName : 'unknown';
        if (typeof window.__analytics !== 'undefined' && window.__analytics.saveFeedbackDetails) {
          window.__analytics.saveFeedbackDetails(modelName, selectedTier || 'unknown', selectedGoal || 'unknown', tags, text);
        } else {
          const fallbackKey = 'fbd_' + (selectedGoal || 'unknown') + '_' + (selectedTier || 'unknown') + '_' + modelName.replace(/\s+/g, '_');
          if (!localStorage.getItem(fallbackKey)) {
            localStorage.setItem(fallbackKey, JSON.stringify({ recommendation: modelName, hardware: selectedTier || 'unknown', goal: selectedGoal || 'unknown', success: false, reason: tags.join(','), notes: text || '', timestamp: new Date().toISOString().split('T')[0] }));
          }
        }
        track('feedback_submitted', { result: 'text', tags: tags.join(','), hasText: !!text, model: modelName });
        section.querySelector('.feedback-tags').classList.add('hidden');
        section.querySelector('.feedback-textarea').classList.add('hidden');
        section.querySelector('.feedback-submit-btn').classList.add('hidden');
        section.querySelector('.feedback-thanks').classList.remove('hidden');
      } else if (e.target.closest('#dev-toggle-btn')) {
        toggleDevCode();
      } else if (e.target.closest('.copy-btn')) {
        const btn = e.target.closest('.copy-btn');
        const codeBox = btn.previousElementSibling;
        if (codeBox && (codeBox.tagName === 'CODE' || codeBox.classList.contains('install-command'))) {
          copyToClipboard(codeBox.textContent.trim(), btn);
        }
      } else if (e.target.closest('#theme-toggle')) {
        toggleTheme();
      } else if (e.target.closest('#btn-skip-career')) {
        const careerArea = document.getElementById('career-area');
        if (careerArea) careerArea.classList.add('hidden');
        var resultsSection = document.getElementById('results-section');
        var hasResults = resultsSection && !resultsSection.classList.contains('hidden') && resultsSection.innerHTML && resultsSection.innerHTML.trim().length > 0;
        if (!hasResults) {
          var hwSection = document.getElementById('hw-section');
          if (hwSection) {
            hwSection.classList.remove('hidden');
            hwSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      } else if (e.target.closest('#compendium-link-btn')) {
        e.preventDefault();
        showAllModelsDirect();
      } else if (e.target.closest('.guide-tab-switch')) {
        const btn = e.target.closest('.guide-tab-switch');
        showGuide(btn.dataset.guide);
      } else if (e.target.closest('.hw-sub-btn')) {
        const btn = e.target.closest('.hw-sub-btn');
        handleHWSubQuestion(btn.dataset.family);
      } else if (e.target.closest('.hw-followup-btn')) {
        const btn = e.target.closest('.hw-followup-btn');
        const tier = btn.dataset.hwTier;
        const opt = gpusData.manualOptions.find(o => o.tier === tier);
        if (opt) selectHW(opt.id, opt.tier, true);
      } else if (e.target.closest('.hw-card')) {
        const btn = e.target.closest('.hw-card');
        if (btn.dataset.id !== 'dont-know') selectHW(btn.dataset.id, btn.dataset.tier);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();