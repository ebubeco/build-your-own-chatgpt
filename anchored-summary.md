# Build Your Own ChatGPT — Progress Summary

## Site Identity
- **Repo**: `C:\Users\user\Documents\My Builds and Softwares\Pojects\ToolsAI\build-your-own-chatgpt\`
- **Live**: `https://build-your-own-chatgpt.vercel.app/`
- **Stack**: Static HTML/CSS/JS, Vercel deployment, Umami analytics + Supabase feedback
- **Core data**: `data/models_compendium.json` (primary model DB), `data/setups.json` (curated setups), `data/gpus.json`, `data/config.json`

---

## Work Completed

### Architecture & Data
- Merged `models_compendium.json` as the single source of truth (replaced `models.json` as authoritative)
- `setups.json` drives the curated result cards (userCount, avgRating, setupSteps, successStory)
- `models.json` still used for search/filter within the compendium page
- `gpus.json` defines tiers, gpuMap, and manualOptions for hardware detection
- `config.json` maps tiers to readiness scores, practicalRating caps, recommended context lengths
- SEO page generation via `generate-seo.js` — 18 landing pages built
- `server.js` — static file server for local dev, Vercel serves as static site

### UI / Fixes Applied
- Nav: "Build Your **Own** ChatGPT" (Fix 4)
- Goal UI: Clean single flow — no duplicate text-link row (Fix 3)
- Testimonials: No anonymous ones (Fix 2)
- qwen3:7b: Zero references anywhere (Fix 1)
- "What to Expect": `getExpectations()` renders in result cards (Fix 6)
- Share buttons: "Share text" + "Copy result link" in result toolbar (Fix 7)
- Feedback buttons: 👍 Yes / 👎 No with Supabase + localStorage (Fix 8)
- Hardware tiers: Clean English names, no BRONZE/SILVER/GOLD/PLATINUM (Fix 10)
- Power GPU tier: Qwen 3.5 27B + DeepSeek R1 8B — no Mixtral 8x7B (Fix 9)
- 18 SEO landing pages built, linked from footer (Fixes 11-13)
- sitemap.xml with 17 URLs (Fix 14)
- Umami analytics active (Fix 15 — Plausible not added, no account)
- server.js comment header present (Fix 16)
- Changelog accurate — "SEO Landing Pages" checkmark is legit (Fix 5)

### Supabase (Fix 8)
- **URL**: `https://fxeygjmygxnirvsrndaa.supabase.co`
- **Key**: `sb_publishable_MTznrw3Xenf4mP72ll8jVw_LD09jKo7`
- **Table**: `feedback` — run SQL above to create
- **Fallback**: localStorage + "Export feedback" link in footer
- `analytics.js` pushes to Supabase REST API on each feedback submission

### Data Files
- `data/models_compendium.json` — 860 lines, 7 tiers, ~30 models with practicalRatings, descriptions, successStories, installCommands
- `data/setups.json` — 259 lines, curated hardware+model combos with userCount, avgRating, setupSteps
- `data/models.json` — 481 lines, used for compendium page browse/search
- `data/gpus.json` — 193 lines, tier definitions, gpuMap with VRAM, appleSilicon flag
- `data/config.json` — config for scores, maxContextLengths per tier
- `data/cloud_providers.json` — cloud fallback providers
- `generate-seo.js` — generates 18 SEO landing pages
- `analytics.js` — Umami tracking + Supabase feedback + localStorage fallback
- `app.js` — main app logic (result rendering, quiz flow, share, feedback UI)
- `compendium.html` — model browser page (not the main index.html)

### Key JavaScript Functions
- `getExpectations(model)` — returns what a model can/can't do
- `saveFeedback(recommendation, hardware, goal, success)` — stores to Supabase + localStorage
- `shareResult()` — native share API with clipboard fallback
- `exportFeedbackData()` — dev tool to download all feedback as JSON
- Hardware detection runs in `app.js` using `gpuMap` from `gpus.json`
- Tier calculation uses `config.json` for readiness scores and context length caps

### SEO Landing Pages (18 pages)
Pages for: 8GB RAM, 16GB RAM, RTX 3060, RTX 4060, RTX 4070, RTX 5080, no GPU, CPU-only, M2 Mac, M3 Mac, old laptop, students, private AI for work, offline ChatGPT, best free ChatGPT alternative, best local AI no GPU, can my laptop run AI, ChatGPT without subscription.

All have proper h1, subtitle, model section, install commands, FAQs, back-links to main site.

### Deploy
- Vercel auto-deploys from `main` branch
- Static site — no build step, just `index.html` + assets
