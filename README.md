# Build Your Own ChatGPT

**Private AI on your hardware. Free forever. No subscriptions, no data sharing, runs offline.**

Two ways to use this project:

| Tool | What it does | Best for |
|------|-------------|----------|
| **Build Your Own ChatGPT** ([`index.html`](index.html)) | Decision wizard — tells you the exact model for your hardware | Getting started with 1 recommendation |
| **Free AI Models Compendium** ([`compendium.html`](compendium.html)) | Full catalog — search and compare 25+ models | Exploring all options |

---

## Quick Start

### 1. Pick your hardware tier

Answer 2 questions: **"What do you want to do?"** and **"What hardware do you have?"**

The wizard recommends:

- **1 primary model** — best match for your goal
- **Up to 2 alternatives** — different trade-offs (faster vs. higher quality)
- **Capability preview** — see exactly what each model can do ("Writing: Excellent", "Coding: Good")

No all-models-here approach. Just the right answer for your setup.

### 2. Install with one command

```bash
# Install Ollama (macOS/Linux/Windows)
curl -fsSL https://ollama.com/install.sh | sh

# Pull your model
ollama pull qwen2.5:7b

# Run it
ollama run qwen2.5:7b
```

That's it. Private ChatGPT running on your machine.

---

## Hardware Tiers

| Tier | Definition | Example Hardware | Best Models |
|------|------------|-----------------|--------------|
| **No GPU / Old Hardware** | No discrete GPU, runs on CPU RAM | 2015 laptops, office desktops | Qwen 0.5B, SmolLM2 1.7B, Llama 3.2 1B |
| **CPU-Only (16-32GB RAM)** | Modern CPU with enough RAM | Modern laptops, desktops without dedicated GPU | Phi-4 Mini 3.8B, Llama 3.2 3B, Qwen 1.5B |
| **Budget GPU (8-12GB VRAM)** | Entry-level dedicated GPU | RTX 3060, 4060, 3070 | Qwen 2.5 7B, Gemma 4 12B, Qwen 3 14B |
| **Power GPU (16GB+ VRAM)** | High-end dedicated GPU | RTX 4080, 4090, RX 7900 XTX | Qwen 3.5 27B, DeepSeek R1 8B |
| **Apple Silicon (8-16GB)** | Unified memory, Metal | MacBook Air M1/M2, Mac Mini M2 | Qwen 2.5 7B, Llama 3.1 8B |
| **Apple Silicon (24-48GB)** | Unified memory, faster | MacBook Pro M3 Pro/Max | Qwen 3 14B |
| **Apple Silicon (64GB+)** | Workstation-class | Mac Studio M2 Ultra, Mac Pro | Qwen 3.5 27B |

---

## Model Recommendations by Goal

### Coding
| Tier | Recommended | Alternative |
|------|-------------|-------------|
| No GPU / Old Hardware | Phi-4 Mini 3.8B | Qwen 1.5B |
| CPU-Only | Llama 3.2 3B | Phi-4 Mini 3.8B |
| Budget GPU | Qwen 2.5 7B | Gemma 4 12B |
| Power GPU | Qwen 3.5 27B | DeepSeek R1 8B |
| Apple Silicon 8-16GB | Qwen 2.5 7B | Llama 3.1 8B |
| Apple Silicon 24-48GB | Qwen 3 14B | Qwen 2.5 7B |
| Apple Silicon 64GB+ | Qwen 3.5 27B | Qwen 3 14B |

### Writing
| Tier | Recommended | Alternative |
|------|-------------|-------------|
| No GPU / Old Hardware | SmolLM2 1.7B | Llama 3.2 1B |
| CPU-Only | Llama 3.2 3B | Phi-4 Mini 3.8B |
| Budget GPU | Qwen 2.5 7B | Qwen 3 14B |
| Power GPU | Qwen 3.5 27B | DeepSeek R1 8B |
| Apple Silicon 8-16GB | Qwen 2.5 7B | Llama 3.1 8B |

### Reasoning / Research
| Tier | Recommended | Alternative |
|------|-------------|-------------|
| Budget GPU | Gemma 4 12B | Qwen 2.5 7B |
| Power GPU | DeepSeek R1 8B | Qwen 3.5 27B |
| Apple Silicon 24-48GB | Qwen 3 14B | Qwen 2.5 7B |

---

## Features

- **Goal + career flow** — pick what you want to do and your role (developer, researcher, writer, etc.) for smarter recommendations
- **Confidence indicator** — High / Medium-High / Medium / Low shows how well a model fits
- **"Why this?" points** — 4–7 clear reasons for each recommendation
- **Capability preview** — task-based ratings ("Private ChatGPT: Excellent", "Coding Assistant: Good")
- **"What to Expect"** — shows what each model can and can't handle well
- **Cloud fallback** — when local AI is too slow, free alternatives are shown (Gemini, Groq, OpenRouter)
- **Shareable results** — share text or copy a result link for your setup
- **Feedback buttons** — 👍 Yes / 👎 No with tag-based details (Wrong Rec, Too Technical, etc.) stored to Supabase + localStorage
- **Apple Silicon support** — 3 unified memory tiers with Metal GPU acceleration
- **Quantization tooltips** — hover to see what Q2_K through F16 mean for quality and size
- **Hardware auto-detect** — suggests your tier based on GPU detection
- **Analytics** — Umami + Plausible for privacy-friendly usage tracking

---

## File Structure

```
build-your-own-chatgpt/
├── index.html                  # Main wizard (1 recommendation + 2 alternatives)
├── compendium.html             # Full catalog (25+ models, search, filters, table view)
├── app.js                      # Wizard logic (recommendation engine, scoring, feedback UI)
├── analytics.js                # Umami + Plausible tracking, Supabase feedback, export
├── compendium.css              # Compendium styles
├── style.css                   # Main stylesheet
├── server.js                   # Local dev server (port 3333)
├── sitemap.xml                 # SEO sitemap (17 URLs)
├── favicon.svg
├── anchored-summary.md         # Project progress tracking
├── generate-seo.js             # SEO landing page generator script
├── *.html                      # 18 SEO landing pages (rtx-3060-local-ai, cpu-only, etc.)
├── data/
│   ├── models_compendium.json  # Primary model database (25 models, 7 tiers)
│   ├── models.json             # Secondary model database (used for compendium browse)
│   ├── gpus.json               # Hardware database with VRAM specs and GPU map
│   ├── setups.json             # Curated setups with success stories and steps
│   ├── config.json             # Tier configs (readiness scores, context caps)
│   ├── cloud_providers.json    # Free cloud AI alternatives
│   └── glossary.json           # AI terminology explainer
```

---

## How Recommendations Work

The recommendation engine scores each model across your hardware tier and career:

```
Score = bestFor match (+40)
      + goal rating (1–10 × 5pts)
      + career affinity bonus (+15)
      + beginnerFriendly bonus (+10)
      + fast capability bonus (+20)
      + slow capability penalty (−5)
      + wrong tier penalty (−50)
```

The highest-scoring model becomes the primary recommendation. The next two highest-scoring models (with different `bestFor` tags) become alternatives.

Confidence levels are determined by:
- **Speed capability** (fast/medium/slow vs tier VRAM)
- **Size vs tier limit** (fits comfortably vs tight fit vs oversized)
- **Beginner-friendly flag**
- **Goal rating** (≥8 = High confidence)

---

## Cloud Alternatives

When your hardware can't run local models well, free cloud options are recommended directly in the wizard:

| Service | Best for | Free tier | Link |
|---------|----------|-----------|------|
| **Gemini 2.5 Flash** | General use, free, multimodal | 1,500 req/day | [gemini.google.com](https://gemini.google.com) |
| **Groq** | Speed — 1,000 tokens/sec | 14,400 req/min | [console.groq.com](https://console.groq.com) |
| **OpenRouter** | Variety — 27+ free models | Varies | [openrouter.ai](https://openrouter.ai) |
| **Cerebras** | Fast inference, large models | Free tier | [cerebras.ai](https://cerebras.ai) |
| **SiliconFlow** | Serverless API, many models | Free tier | [siliconflow.ai](https://siliconflow.ai) |

---

## Expanding to More Models

The Free AI Models Compendium (`compendium.html`) is a standalone page that uses the same data structure as the wizard. It adds:

- **25+ models** across all tiers and providers
- **Search** across name, description, specialties, and size
- **Filters** by tier, specialty (coding, writing, reasoning, agents, vision), and provider
- **Sort** by name, size, coding rating, writing rating, or reasoning rating
- **Grid and table views** — compact grid or full comparison table
- **Copy install commands** — one click to copy the Ollama pull command
- **Highlighted models** — ★ marks top recommendations

To expand the model database, add entries to `data/models_compendium.json` following the existing structure with fields: `id`, `name`, `size`, `tier`, `vramGB`, `contextLength`, `practicalRating`, `bestFor`, `ollamaTag`, `installCommand`, `description`, `beginnerFriendly`, and `highlight`.

---

## Privacy & Freedom

All local models on this site are **fully offline-capable**:

- Your data never leaves your machine
- No API calls, no subscriptions, no rate limits
- Run on planes, in basements, or off-grid
- Models are open weights licensed permissively (Apache 2.0, MIT, Llama 3.2)
- Cloud fallback options are clearly labeled and only shown when genuinely needed

---

## Contributing

Found a model that should be here? Spotted a mistake? Open an issue or PR on [GitHub](https://github.com/ebubeco/build-your-own-chatgpt).

---

## License

MIT — use it however you want. Build cool things.