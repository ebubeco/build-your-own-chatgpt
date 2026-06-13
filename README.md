# Build Your Own ChatGPT

**Private AI on your hardware. Free forever. No subscriptions, no data sharing, runs offline.**

Two ways to use this project:

| Tool | What it does | Best for |
|------|-------------|----------|
| **Build Your Own ChatGPT** ([`index.html`](index.html)) | Decision wizard — tells you the exact model for your hardware | Getting started with 1 recommendation |
| **Free AI Models Compendium** ([`compendium.html`](compendium.html)) | Full catalog — search and compare 53+ models | Exploring all options |

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
ollama pull qwen3:7b

# Run it
ollama run qwen3:7b
```

That's it. Private ChatGPT running on your machine.

---

## Hardware Tiers

| Tier | VRAM | Example Hardware | Best Models |
|------|------|-----------------|--------------|
| **No GPU** | CPU only | Old laptops (2015+) | Qwen 0.5B, SmolLM2 1.7B, Llama 3.2 1B |
| **CPU-Only** | 0–4GB | Modern laptops, no GPU | Phi-4 Mini 3.8B, Llama 3.2 3B, Qwen 1.5B |
| **Budget GPU** | 4–12GB | RTX 3060, 4060, 3070 | Qwen 3 7B, Gemma 3 12B, DeepSeek Coder 6.7B |
| **Power GPU** | 12GB+ | RTX 4080, 4090 | Qwen 3.5 27B, DeepSeek R1 32B, Mixtral 8x7B |
| **Apple Silicon** | varies | M1/M2/M3 Macs | Qwen 3 7B (Metal), Llama 3.1 8B, Phi-4 Mini |

---

## Model Recommendations by Goal

### Coding
| Tier | Recommended | Alternative |
|------|-------------|-------------|
| No GPU | Phi-4 Mini 3.8B | Qwen 1.5B |
| Budget GPU | Qwen 2.5 Coder 7B | DeepSeek Coder 6.7B |
| Power GPU | Qwen 2.5 Coder 32B | DeepSeek R1 32B |
| Apple Silicon | Qwen 2.5 7B (Metal) | Phi-4 Mini |

### Writing
| Tier | Recommended | Alternative |
|------|-------------|-------------|
| No GPU | Llama 3.2 3B | Qwen 1.5B |
| Budget GPU | Qwen 2.5 7B | Llama 3.1 8B |
| Power GPU | Qwen 2.5 32B | Llama 3.1 70B |

### Reasoning / Math
| Tier | Recommended | Alternative |
|------|-------------|-------------|
| Budget GPU | Gemma 3 12B | Qwen 2.5 14B |
| Power GPU | DeepSeek R1 32B | DeepSeek R1 70B |

---

## Features

- **Goal-first flow** — pick what you want to do first, then find hardware match
- **Confidence indicator** — High / Medium-High / Medium / Low shows how well a model fits
- **"Why this?" points** — 4–7 clear reasons for each recommendation
- **Capability preview** — see task-based abilities ("Private ChatGPT: Excellent", "Coding Assistant: Good")
- **Cloud fallback** — when local AI is genuinely too slow, free alternatives are shown (Gemini, Groq, OpenRouter)
- **Shareable URLs** — `?goal=coding&tier=power-gpu` encodes your picks for bookmarking/sharing
- **Apple Silicon support** — unified memory tiers with Metal GPU acceleration
- **Quantization tooltips** — hover to see what Q2_K through F16 mean for quality and size

---

## File Structure

```
build-your-own-chatgpt/
├── index.html          # Main wizard (1 recommendation + 2 alternatives)
├── compendium.html     # Full catalog (53+ models, search, filters, table view)
├── app.js              # Wizard logic (recommendation engine, confidence scoring)
├── compendium.css      # Compendium styles
├── style.css           # Main stylesheet
├── data/
│   ├── models.json     # 15 core models with detailed metadata
│   ├── gpus.json       # Hardware database with VRAM specs
│   ├── setups.json     # Tool setup instructions
│   └── glossary.json   # AI terminology explainer
└── favicon.svg
```

---

## How Recommendations Work

The recommendation engine scores each model across your hardware tier:

```
Score = bestFor match (+40)
      + goal rating (1–10 × 5pts)
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

When your hardware can't run local models well, three free cloud options are recommended:

| Service | Best for | Free tier | Link |
|---------|----------|-----------|------|
| **Gemini 2.0 Flash** | General use, free, multimodal | 1,500 req/day | [gemini.google.com](https://gemini.google.com) |
| **Groq** | Speed — 1,000 tokens/sec | 14,400 req/min | [console.groq.com](https://console.groq.com) |
| **OpenRouter** | Variety — 27+ free models | Varies | [openrouter.ai](https://openrouter.ai) |

---

## Expanding to More Models

The Free AI Models Compendium (`compendium.html`) is a standalone page that uses the same data structure as the wizard. It adds:

- **53+ models** across all tiers and providers
- **Search** across name, description, specialties, and size
- **Filters** by tier, specialty (coding, writing, reasoning, agents, vision), and provider
- **Sort** by name, size, coding rating, writing rating, or reasoning rating
- **Grid and table views** — compact grid or full comparison table
- **Copy install commands** — one click to copy the Ollama pull command
- **Highlighted models** — ★ marks top recommendations

To expand the model database, add entries to `data/models.json` following the existing structure with fields: `name`, `size`, `tier`, `vramGB`, `contextLength`, `practicalRating`, `bestFor`, `ollamaTag`, `installCommand`, `description`, `beginnerFriendly`, and `highlight`.

---

## Privacy & Freedom

All models on this site are **fully offline-capable**:

- Your data never leaves your machine
- No API calls, no subscriptions, no rate limits
- Run on planes, in basements, or off-grid
- Models are open weights licensed permissively (Apache 2.0, MIT, Llama 3.2)

---

## Success Stories

Real people using these exact setups:

> *"An indie developer replaced their $20/mo ChatGPT subscription with [Qwen 3 7B on an RTX 3060]. Uses it for coding, writing docs, and debugging — says it 'never lets them down'."*

> *"A teacher ran [Qwen 0.5B] on her 2013 MacBook Air to summarize student essays offline."*

> *"A founder runs their entire startup's AI stack on a Mac Studio M2 Ultra 128GB — coding, research, writing, and customer support. Says it's 'essentially a senior developer on call 24/7'."*

---

## Contributing

Found a model that should be here? Spotted a mistake? Open an issue or PR on [GitHub](https://github.com/ebubeco/build-your-own-chatgpt).

---

## License

MIT — use it however you want. Build cool things.