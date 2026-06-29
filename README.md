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

| Tier | VRAM | Examples | Recommended Models |
|------|------|---------|--------------------|
| **No GPU / Integrated** | 0–4GB RAM, 0 VRAM | Old laptops, office PCs, integrated graphics | Phi-4 Mini 3.8B, Qwen 1.5B, SmolLM2 1.7B |
| **Budget GPU** | 4–8GB | RTX 3060, 3070 | Qwen 2.5 7B, Llama 3.1 8B, Phi-4 Mini |
| **Power GPU** | 12GB+ | RTX 4080, 4090 | Qwen 2.5 32B, DeepSeek R1 32B, Phi-4 14B |
| **Apple Silicon** | Unified memory | M1/M2/M3/M4 all variants | Qwen 2.5 7B, Llama 3.3 8B, Phi-4 14B |

---

## Features
- **Goal-first wizard** — pick your use case before seeing any models
- **Hardware tier detection** — auto-detects your VRAM class on load
- **Recommendation engine** — scored: bestFor (+30), goal (×4), career match (+25), career priorities (+5/match), beginner (+10), fast (+20), slow (+5), not-recommended (−50), historical success (up to +9)
- **Confidence score** — numeric confidence per recommendation
- **Why this?** — plain-English reasoning for every pick
- **Capability cards** — visual breakdown of model strengths and weaknesses
- **Readiness scores** — per-model assessment for your exact hardware
- **Cloud fallback** — automatic cloud alternative when local hardware falls short
- **Shareable URLs** — every result is a permalink
- **Apple Silicon support** — M1/M2/M3/M4 all variants with optimised model recommendations
- **Quantization tooltips** — explains Q4, Q5, Q8 in plain language
- **Copy setup button** — one-click install command copy
- **Result persistence** — last result stays when you return
- **Feedback storage** — Supabase-powered with detailed tag categories
- **Dark mode** — system-aware dark/light theme
- **Model comparison tool** — side-by-side compare ([compare.html](compare.html))
- **Career recommendations** — AI setup guides by profession ([career.html](career.html))
- **Local vs Cloud wizard** — which approach fits your situation ([which-ai.html](which-ai.html))
- **Use case browser** — filter by hardware tier and task ([use-cases.html](use-cases.html))
- **Hardware guides** — offline guide, laptop checker, no-GPU guide, starter pack
- **Model compendium** — 53+ models with specs, benchmarks, and filters ([compendium.html](compendium.html))
- **AI Evaluators page** — free evaluation stack for RLHF annotators ([evaluators.html](evaluators.html))

---

## File Structure
```
build-your-own-chatgpt/
├── index.html              # Main wizard
├── career.html             # Career recommendations
├── compare.html            # Model comparison tool
├── which-ai.html           # Local vs Cloud wizard
├── use-cases.html          # Use case browser
├── best-offline-chatgpt.html  # SEO — offline guide
├── starter-pack.html       # Starter pack recommendations
├── run-ai-without-gpu.html # No-GPU guide
├── can-my-laptop-run-ai.html  # Hardware checker
├── compendium.html         # Full model catalog (53+ models)
├── evaluators.html         # Free AI stack for RLHF annotators
├── app.js                  # Main wizard logic
├── generate_compendium.js  # Compendium generator
├── server.js               # Dev server
├── style.css               # Main styles
├── compendium.css          # Compendium styles
├── favicon.svg
├── sitemap.xml
├── robots.txt
└── data/
    ├── models.json
    ├── gpus.json
    ├── setups.json
    ├── glossary.json
    ├── cloud_providers.json
    └── roles.json
```

---

## How Recommendations Work

The recommendation engine scores each model across your hardware tier and career:

```
Score = bestFor match (+30)
      + goal rating (1–10 × 4pts)
      + career model match (+25)
      + career priorities overlap (+5 per match)
      + beginnerFriendly bonus (+10)
      + fast capability bonus (+20)
      + slow capability bonus (+5)
      + not-recommended capability penalty (−50)
      + historical success rate (≤ +9, requires ≥3 prior runs)
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
| **Gemini 2.5 Flash** | General use, 1M context, multimodal | 1,500 req/day | [aistudio.google.com](https://aistudio.google.com) |
| **Groq** | Speed — 1,000 tokens/sec, Whisper STT | 14,400 req/day | [console.groq.com](https://console.groq.com) |
| **OpenRouter** | Variety — 27+ free models, auto-failover | Varies | [openrouter.ai](https://openrouter.ai) |
| **Cerebras** | Fastest — ~3,000 tokens/sec, large models | 1M tokens/day | [console.cerebras.ai](https://console.cerebras.ai) |
| **SiliconFlow** | Image gen (FLUX.1), video, TTS (CosyVoice2) | $1 starter credit | [siliconflow.cn](https://siliconflow.cn) |
| **OpenCode Zen** | Agentic coding IDE | Free tier | [opencode.ai](https://opencode.ai) |
| **Fireworks AI** | 50+ models, JSON schema mode | $1 starter credit | [fireworks.ai](https://fireworks.ai) |

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