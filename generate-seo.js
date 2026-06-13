const fs = require('fs');
const path = require('path');

const pages = [
  { slug: 'rtx-3060-local-ai', title: 'Best Local AI For RTX 3060 In 2026', h1: 'Best Local AI Models For RTX 3060', hw: 'NVIDIA RTX 3060 12GB', tier: 'budget-gpu', vram: '12GB', model: 'Qwen 2.5 7B', modelTag: 'qwen2.5:7b', alt1: 'Qwen 2.5 Coder 7B', alt2: 'Llama 3.1 8B', can: ['Private ChatGPT', 'Coding Assistant', 'Writing & Research'], slow: ['70B Models (quantized)'], not: ['Real-time Vision', 'Large Agent Swarms'], faqs: [
    { q: 'Can RTX 3060 run local AI?', a: 'Yes. The RTX 3060 with 12GB VRAM is excellent for local AI. It runs 7B models with full speed and can handle quantized 13B and 30B models.' },
    { q: 'What is the best local AI model for RTX 3060?', a: 'Qwen 2.5 7B. It fits comfortably in 12GB VRAM, runs fast, and delivers excellent results for chat, coding, and writing.' },
    { q: 'How much VRAM does the RTX 3060 have?', a: 'The RTX 3060 has 12GB GDDR6 VRAM, enough for most 7B models with room to spare for longer context windows.' },
    { q: 'Can RTX 3060 run Llama 3 70B?', a: 'Not at full quality. A quantized version might fit with heavy compression, but performance will be slow. Stick to 7B-13B models for the best experience.' },
    { q: 'Do I need CUDA for local AI on RTX 3060?', a: 'Ollama handles CUDA automatically. Just install Ollama and run your model command — no manual CUDA setup needed.' }
  ] },
  { slug: 'rtx-4060-local-ai', title: 'Best Local AI For RTX 4060 In 2026', h1: 'Best Local AI Models For RTX 4060', hw: 'NVIDIA RTX 4060 8GB', tier: 'budget-gpu', vram: '8GB', model: 'Qwen 2.5 7B', modelTag: 'qwen2.5:7b', alt1: 'Llama 3.1 8B', alt2: 'Mistral 7B', can: ['Private ChatGPT', 'Coding Assistant', 'Writing & Research'], slow: ['13B Models (quantized)'], not: ['70B Models', 'Real-time Vision'], faqs: [
    { q: 'Can RTX 4060 run local AI?', a: 'Yes. The RTX 4060 with 8GB VRAM runs 7B models comfortably and handles quantized 13B models.' },
    { q: 'Is 8GB VRAM enough for local AI?', a: '8GB is enough for most 7B models. You can also run smaller quantized 13B models with reduced context length.' },
    { q: 'What is the best model for RTX 4060?', a: 'Qwen 2.5 7B offers the best balance of speed and quality for the 4060s 8GB VRAM.' },
    { q: 'Can RTX 4060 run coding models?', a: 'Yes. Qwen 2.5 Coder 7B and DeepSeek Coder run great on the RTX 4060 for coding assistance.' },
    { q: 'Is Ollama free on RTX 4060?', a: 'Yes. Ollama is completely free and uses your GPU automatically.' }
  ] },
  { slug: 'rtx-4070-local-ai', title: 'Best Local AI For RTX 4070 In 2026', h1: 'Best Local AI Models For RTX 4070', hw: 'NVIDIA RTX 4070 12GB', tier: 'power-gpu', vram: '12GB', model: 'Qwen 2.5 7B', modelTag: 'qwen2.5:7b', alt1: 'Llama 3.1 8B', alt2: 'Mistral 7B', can: ['Private ChatGPT', 'Coding Assistant', 'Writing & Research', 'AI Agents'], slow: ['Larger 30B models'], not: ['70B Models'], faqs: [
    { q: 'Can RTX 4070 run local AI?', a: 'Yes. The RTX 4070 delivers excellent performance for local AI models up to 13B parameters.' },
    { q: 'What model does RTX 4070 run best?', a: 'Qwen 2.5 7B runs at full speed with zero quantization needed.' },
    { q: 'Can RTX 4070 run 30B models?', a: 'Quantized 30B models can fit in 12GB VRAM with reduced context length.' },
    { q: 'Is RTX 4070 good for AI agents?', a: 'Yes. The 12GB VRAM is sufficient for running AI agent workloads with moderate context windows.' }
  ] },
  { slug: 'rtx-5080-local-ai', title: 'Best Local AI For RTX 5080 In 2026', h1: 'Best Local AI Models For RTX 5080', hw: 'NVIDIA RTX 5080', tier: 'power-gpu', vram: '16GB+', model: 'Llama 3.1 70B (quantized)', modelTag: 'llama3.1:70b', alt1: 'Qwen 2.5 32B', alt2: 'Mixtral 8x22B', can: ['Private ChatGPT', 'Coding Assistant', 'Writing & Research', 'AI Agents', 'Large Context Windows'], slow: ['Full 70B precision'], not: ['Real-time Video Generation'], faqs: [
    { q: 'Can RTX 5080 run 70B models?', a: 'Yes. The RTX 5080 can run quantized 70B models with good performance.' },
    { q: 'Is RTX 5080 overkill for local AI?', a: 'Not at all. You can run the largest open models at home without cloud dependency.' },
    { q: 'What is the best model for RTX 5080?', a: 'Llama 3.1 70B (quantized) takes full advantage of the available VRAM.' }
  ] },
  { slug: 'm2-mac-local-ai', title: 'Best Local AI For Mac M2 In 2026', h1: 'Best Local AI Models For Mac M2', hw: 'Apple Mac M2', tier: 'silicon-8-16gb', vram: 'Unified Memory', model: 'Qwen 2.5 7B', modelTag: 'qwen2.5:7b', alt1: 'Llama 3.1 8B', alt2: 'Mistral 7B', can: ['Private ChatGPT', 'Coding Assistant', 'Writing & Research'], slow: ['30B Models (quantized)'], not: ['Full 70B Models', 'Real-time Vision'], faqs: [
    { q: 'Can Mac M2 run local AI?', a: 'Yes. Apple Silicon Macs are excellent for local AI thanks to unified memory and Metal GPU acceleration.' },
    { q: 'Do I need Ollama on Mac?', a: 'Yes. Ollama has native Apple Silicon support and uses Metal for GPU acceleration automatically.' },
    { q: 'How much unified memory do I need?', a: '8GB can run 3B models well. 16GB+ is recommended for 7B models and larger.' },
    { q: 'Is local AI fast on M2?', a: 'Yes. M2s Neural Engine and GPU provide strong inference performance for local models.' }
  ] },
  { slug: 'm3-mac-local-ai', title: 'Best Local AI For Mac M3 In 2026', h1: 'Best Local AI Models For Mac M3', hw: 'Apple Mac M3', tier: 'silicon-8-16gb', vram: 'Unified Memory', model: 'Qwen 2.5 7B', modelTag: 'qwen2.5:7b', alt1: 'Llama 3.1 8B', alt2: 'Mistral 7B', can: ['Private ChatGPT', 'Coding Assistant', 'Writing & Research'], slow: ['30B Models (quantized)'], not: ['Full 70B Models', 'Real-time Vision'], faqs: [
    { q: 'Can Mac M3 run local AI?', a: 'Yes. The M3 chip handles local AI models efficiently with Metal GPU acceleration.' },
    { q: 'Is M3 better than M2 for AI?', a: 'The M3 offers modest GPU improvements over M2. Both handle 7B models with similar real-world performance.' },
    { q: 'Can I run Llama 3 on M3 Mac?', a: 'Yes. Llama 3.1 8B and Qwen 2.5 7B run great on M3 Macs with 16GB+ unified memory.' }
  ] },
  { slug: '8gb-ram-local-ai', title: 'Best Local AI For 8GB RAM Systems', h1: 'Best Local AI Models For 8GB RAM', hw: '8GB System RAM', tier: 'cpu-only', vram: 'None', model: 'TinyLlama 1.1B', modelTag: 'tinylama:1.1b', alt1: 'Qwen 0.5B', alt2: 'Llama 3.2 1B', can: ['Simple Chat', 'Basic Writing'], slow: ['Coding Help', 'Small document analysis'], not: ['7B+ Models', 'Coding Assistant', 'AI Agents'], faqs: [
    { q: 'Can I run AI on 8GB RAM?', a: 'Yes. Small models (under 3B parameters) run on 8GB RAM. Performance is slower but usable for basic tasks.' },
    { q: 'Do I need a GPU?', a: 'No. Small models run on CPU only. Ollama works without any GPU.' },
    { q: 'What is the best model for 8GB RAM?', a: 'TinyLlama 1.1B offers the best balance of capability and performance for 8GB systems.' },
    { q: 'Can I run coding models on 8GB RAM?', a: 'Very limited. TinyLlama handles basic code completion but not full coding assistance.' },
    { q: 'Is 8GB RAM enough for Ollama?', a: 'Yes. Ollama itself is lightweight. Small models run within 8GB system memory.' }
  ] },
  { slug: '16gb-ram-local-ai', title: 'Best Local AI For 16GB RAM Systems', h1: 'Best Local AI Models For 16GB RAM', hw: '16GB System RAM', tier: 'cpu-only', vram: 'None', model: 'Qwen 2.5 7B (CPU)', modelTag: 'qwen2.5:7b', alt1: 'Llama 3.1 8B', alt2: 'Mistral 7B', can: ['Private ChatGPT', 'Basic Coding', 'Writing & Research'], slow: ['Long documents', 'Complex reasoning'], not: ['Real-time Chat', '70B Models'], faqs: [
    { q: 'Can I run 7B models on 16GB RAM?', a: 'Yes, on CPU. It will be slower than GPU but functional for most tasks.' },
    { q: 'Do I need a GPU for Ollama?', a: 'No. Ollama runs on CPU too. Performance is slower but works for async tasks.' },
    { q: 'Is 16GB RAM enough for local AI?', a: 'Enough for 3B-7B models. For real-time chat, an NVIDIA GPU or Apple Silicon is recommended.' },
    { q: 'What speed should I expect on CPU?', a: '3-10 tokens per second for 7B models on modern CPUs. Adequate for reading, slow for conversation.' }
  ] },
  { slug: 'cpu-only-local-ai', title: 'Best Local AI For CPU-Only Systems', h1: 'Best Local AI Models For CPU-Only', hw: 'CPU Only (No GPU)', tier: 'cpu-only', vram: 'None', model: 'TinyLlama 1.1B', modelTag: 'tinylama:1.1b', alt1: 'Qwen 0.5B', alt2: 'Llama 3.2 1B', can: ['Simple Chat', 'Basic Writing'], slow: ['Coding Help', 'Small document analysis'], not: ['7B+ Models', 'Coding Assistant', 'AI Agents'], faqs: [
    { q: 'Can I run AI without a GPU?', a: 'Yes. Local AI runs on CPU. Small models (1-3B) are functional, while larger models need patience.' },
    { q: 'Which model is best for CPU-only?', a: 'TinyLlama 1.1B offers the best speed-to-quality ratio for CPU-only systems.' },
    { q: 'Is Ollama free on CPU?', a: 'Yes. Ollama is free on all platforms, with or without a GPU.' },
    { q: 'Can I upgrade later?', a: 'Yes. If you add a GPU later, Ollama detects it automatically and accelerates inference.' }
  ] },
  { slug: 'old-laptop-local-ai', title: 'Best Local AI For Old Laptops In 2026', h1: 'Best Local AI Models For Old Laptops', hw: 'Old Laptop (No GPU, 4-8GB RAM)', tier: 'cpu-only', vram: 'None', model: 'TinyLlama 1.1B', modelTag: 'tinylama:1.1b', alt1: 'Qwen 0.5B', alt2: 'Llama 3.2 1B', can: ['Simple Chat', 'Basic Writing'], slow: ['Coding Help'], not: ['7B+ Models', 'Real-time Chat', 'Coding Assistant'], faqs: [
    { q: 'Can my old laptop run AI?', a: 'Yes. If it has at least 4GB RAM, you can run TinyLlama 1.1B and similar small models.' },
    { q: 'Will local AI drain my battery?', a: 'Yes, continuous inference uses CPU heavily. Expect 2-3 hours of runtime on battery.' },
    { q: 'Which OS supports local AI?', a: 'Windows, macOS, and Linux all support Ollama and local AI models.' },
    { q: 'Can I use local AI without internet?', a: 'Yes. After the initial model download, everything runs offline.' }
  ] },
  { slug: 'best-local-ai-no-gpu', title: 'Best Local AI Without A GPU In 2026', h1: 'Best Local AI Models Without A GPU', hw: 'No GPU (CPU Only)', tier: 'cpu-only', vram: 'None', model: 'TinyLlama 1.1B', modelTag: 'tinylama:1.1b', alt1: 'Qwen 0.5B', alt2: 'Llama 3.2 1B', can: ['Simple Chat', 'Basic Writing'], slow: ['Coding Help', 'Small document analysis'], not: ['7B+ Models', 'Coding Assistant', 'AI Agents', 'Real-time Vision'], faqs: [
    { q: 'Can I run AI without a GPU?', a: 'Yes. Local AI runs entirely on CPU. Small models like TinyLlama 1.1B work well without any graphics card.' },
    { q: 'What is the best local AI for no GPU?', a: 'TinyLlama 1.1B offers the best speed-to-quality ratio for CPU-only systems. It starts responding in seconds.' },
    { q: 'Is Ollama free without a GPU?', a: 'Yes. Ollama works on CPU-only systems and is completely free. No paid tiers, no hidden costs.' },
    { q: 'Can I run coding models without a GPU?', a: 'Very limited. Small models handle basic code completion but not full coding assistance. Consider cloud options like Gemini Free for coding.' },
    { q: 'Will local AI run on Intel integrated graphics?', a: 'It will use the CPU, not integrated graphics. Performance depends on CPU speed and RAM, not the integrated GPU.' }
  ] }
];

function buildPage(p) {
  const faqSchema = p.faqs.map(f => JSON.stringify({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a }
  })).join(',\n');

  const faqHtml = p.faqs.map(f => `
    <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question" class="faq-item">
      <h3 itemprop="name">${f.q}</h3>
      <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <p itemprop="text">${f.a}</p>
      </div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${p.title}. Run local AI on ${p.hw}. Get setup with one Ollama command. Free, private, no cloud dependency.">
  <title>${p.title}</title>
  <link rel="canonical" href="https://build-your-own-chatgpt.vercel.app/${p.slug}">
  <meta property="og:title" content="${p.title}">
  <meta property="og:description" content="Run local AI on ${p.hw}. Free, private, no cloud.">
  <meta property="og:image" content="https://build-your-own-chatgpt.vercel.app/og-image.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
${faqSchema}
    ]
  }
  </script>
</head>
<body class="seo-page">
  <main class="seo-content">
    <a href="/" class="seo-back">&larr; Use the wizard</a>
    <h1>${p.h1}</h1>

    <section class="seo-section">
      <h2>Hardware Overview</h2>
      <p>The <strong>${p.hw}</strong>${p.vram !== 'None' && p.vram !== 'Unified Memory' ? ' with ' + p.vram + ' VRAM' : ''} ${p.tier === 'budget-gpu' || p.tier === 'power-gpu' ? 'is capable of running local AI models efficiently.' : 'can run local AI models, though GPU acceleration is not available.'}</p>
      <div class="rec-meta" style="margin-top:1rem">
        <span class="badge b-primary">🎮 ${p.hw}</span>
        <span class="badge b-purple">💾 ${p.vram}</span>
      </div>
    </section>

    <section class="seo-section">
      <h2>Recommended Model</h2>
      <div class="rec-card" style="position:static;border:1px solid var(--border)">
        <div class="rec-header">
          <div class="rec-model-info">
            <span class="rec-model-name">${p.model}</span>
          </div>
        </div>
        <p class="rec-desc">Optimized for ${p.hw}. Recommended as the best balance of quality and performance.</p>
        <div class="install-box" style="margin-top:1rem">
          <div class="install-label">Run this command</div>
          <div class="install-command">ollama pull ${p.modelTag}</div>
          <a href="https://ollama.com/download" target="_blank" class="btn-secondary" style="display:inline-block;margin-top:0.5rem">Download Ollama</a>
        </div>
      </div>
    </section>

    <section class="seo-section">
      <h2>Alternatives</h2>
      <ul class="seo-alt-list">
        <li><strong>${p.alt1}</strong> — Great alternative with different strengths.</li>
        <li><strong>${p.alt2}</strong> — Another solid option for this hardware.</li>
      </ul>
    </section>

    <section class="seo-section">
      <h2>What You Can Do</h2>
      <div class="capability-card">
        <div class="cap-group">
          <div class="cap-group-label">✓ Can Run Well</div>
          <div class="cap-items-grid">
            ${p.can.map(l => '<div class="cap-item can"><span class="cap-item-icon">✓</span><span class="cap-item-label">' + l + '</span></div>').join('')}
          </div>
        </div>
        ${p.slow.length > 0 ? '<div class="cap-group"><div class="cap-group-label">⚠ Can Run Slowly</div><div class="cap-items-grid">' + p.slow.map(l => '<div class="cap-item slow"><span class="cap-item-icon">⚠</span><span class="cap-item-label">' + l + '</span></div>').join('') + '</div></div>' : ''}
        ${p.not.length > 0 ? '<div class="cap-group"><div class="cap-group-label">✗ Not Recommended</div><div class="cap-items-grid">' + p.not.map(l => '<div class="cap-item not"><span class="cap-item-icon">✗</span><span class="cap-item-label">' + l + '</span></div>').join('') + '</div></div>' : ''}
      </div>
    </section>

    <section class="seo-section">
      <h2>Frequently Asked Questions</h2>
      <div itemscope itemtype="https://schema.org/FAQPage">
        ${faqHtml}
      </div>
    </section>

    <section class="seo-section seo-cta">
      <h2>Want a personalized recommendation?</h2>
      <p>Tell us about your specific hardware and goals. Get your exact setup in under 60 seconds.</p>
      <a href="/" class="btn-primary" style="display:inline-block;margin-top:1rem">Try the Wizard</a>
    </section>
  </main>
</body>
</html>`;
}

const outDir = path.join(__dirname);
let count = 0;
for (const p of pages) {
  const html = buildPage(p);
  fs.writeFileSync(path.join(outDir, p.slug + '.html'), html, 'utf8');
  count++;
  console.log('Created: ' + p.slug + '.html');
}
console.log('Done: ' + count + ' pages generated.');
