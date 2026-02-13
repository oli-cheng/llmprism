# 🔷 LLMPrism

**A privacy-first, multi-model AI cockpit for power users.**

Compare responses from OpenAI, Anthropic, and Google Gemini side-by-side — all from a single prompt. No server. No telemetry. Your keys never leave your browser.

---

## ✨ Why LLMPrism?

Choosing the right LLM for a task shouldn't require juggling browser tabs. LLMPrism lets you run the same prompt against multiple models concurrently, compare outputs in a clean three-pane UI, and merge the best parts into a polished final document — all without sending data to any intermediary server.

### Key Capabilities

| Feature | Details |
|---|---|
| **Concurrent Multi-Run** | Fire a prompt at 2–3 models simultaneously with per-provider progress and cancel |
| **Side-by-Side Comparison** | Tabbed response panes showing provider, model, token count, latency, and estimated cost |
| **Merge Workflow** | Select text from any response and insert it into a final document at your cursor position |
| **Demo Mode** | Full interactive demo with realistic mock responses — no API keys required |
| **Routing Rules Engine** | JSON-validated rules to auto-select models based on prompt characteristics |
| **Encrypted Key Vault** | API keys encrypted with AES-256-GCM via Web Crypto API; passphrase never stored |
| **Local-First Storage** | All data persisted in `localStorage`. Works offline. Zero server dependencies |
| **Context Packs** | Attach reusable system prompts and context snippets to any thread |

---

## 🚀 60-Second Demo Script

> No API keys needed — Demo Mode uses realistic mock responses.

1. **Open the app** → the onboarding dialog appears on first visit
2. **Enable Demo Mode** → toggle "Demo Mode" in onboarding or Settings
3. **Create a workspace** → click "+ Workspace" in the sidebar
4. **Create a thread** → click "+ Thread" inside your workspace
5. **Type a prompt** → e.g. *"Compare three approaches to caching in a web app"*
6. **Select 2–3 models** → pick from OpenAI, Anthropic, and Gemini in the toolbar
7. **Click Run** → watch concurrent responses stream in with latency + token stats
8. **Compare** → switch between response tabs (A / B / C) to review each model's output
9. **Merge** → select text from a response and click "Insert into Final" to compose your document
10. **Export** → click Export to download the final document as Markdown

**Total time: ~60 seconds.** You've just experienced multi-model comparison, merge workflow, and export — all running locally in your browser.

---

## 🏗️ Architecture

```
┌─────────────┐     ┌────────────┐     ┌────────────┐     ┌──────────────┐
│   React UI  │────▶│  AppContext │────▶│  Adapters  │────▶│  Provider    │
│  Components │     │   (State)  │     │ (Normalize) │     │  APIs        │
└─────────────┘     └────────────┘     └────────────┘     │  ┌────┐      │
                                                           │  │OAI │      │
                           ▲                               │  ├────┤      │
                           │                               │  │ANT │      │
                    ┌──────┴──────┐                        │  ├────┤      │
                    │  Encrypted  │                        │  │GEM │      │
                    │ localStorage│                        │  └────┘      │
                    └─────────────┘                        └──────────────┘
```

### Engineering Highlights

- **Provider Adapter Pattern** — Unified interface for OpenAI, Anthropic, and Gemini. Adding a new provider is one file.
- **Concurrent Execution** — `Promise.all` with per-provider `AbortController`. Cancel one model without affecting others.
- **Encrypted Key Storage** — AES-256-GCM encryption via the Web Crypto API. Your passphrase is never persisted.
- **Privacy by Design** — No analytics, no tracking, no server. Data only leaves your browser when you call a provider API.
- **Routing Rules Engine** — JSON-schema-validated rules with simulation. Test routing logic before execution.
- **Self-Check Suite** — Built-in automated QA (Cmd/Ctrl+Shift+P → "Run self-check") verifies the full workflow end-to-end.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS + Radix UI (shadcn/ui) |
| State | React Context + `localStorage` |
| Crypto | Web Crypto API (AES-256-GCM) |
| Layout | `react-resizable-panels` |

---

## 📦 Getting Started

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd llmprism

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and enable **Demo Mode** to explore without API keys.

### Using Real API Keys

1. Open **Settings** (gear icon in the header)
2. Disable Demo Mode
3. Enter your API keys for OpenAI, Anthropic, and/or Google Gemini
4. Keys are encrypted locally — they never leave your browser

---

## 📄 License

MIT

---

<p align="center">
  <strong>Built as a portfolio demonstration</strong><br/>
  <em>Privacy-first • Local-only • Zero external dependencies for core functionality</em>
</p>
