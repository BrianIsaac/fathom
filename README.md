# Fathom

**Deep intelligence, surfaced fast.**

Fathom is an autonomous compliance intelligence platform that deploys persistent web agents across the hidden web ��� sites with no APIs, heavy JavaScript rendering, and aggressive anti-bot measures — to detect regulatory changes, extract due diligence data, and deliver structured intelligence to compliance teams before they even start their day.

## The Problem

Financial compliance teams spend hours every morning manually checking regulatory websites (MAS, SEC, HKMA, FCA, SGX) for new publications, cross-referencing company filings across fragmented data sources, and tracking earnings data across investor relations pages. These sites have no public APIs, render content with JavaScript, and actively block automated access. The result: slow, expensive, error-prone manual processes where critical regulatory changes can be missed until it's too late.

## The Solution

Fathom deploys TinyFish web agents as persistent "fish" in a monitoring pool. Each agent is configured with conditions and actions — when a regulatory change matches an agent's conditions, it autonomously dispatches alerts via Slack, email, or Telegram. The system uses a three-tier cost-optimised cascade (ETag check, content hash, full extraction) to monitor sources efficiently, only invoking expensive browser automation when actual changes are detected.

### Core Modules

- **Fathom Pool** — Visual fishbowl showing all deployed agents as animated fish with real-time action bubbles
- **Deploy** — Create persistent agents with custom conditions and action dispatch rules
- **Regulatory Sentry** — Three-tier cascade detection across SEC, HKMA, BIS (RSS) and MAS, FCA, SGX (browser agents)
- **Due Diligence** — Company name in, risk-scored brief out from 5 parallel sources in ~90 seconds
- **Earnings Intelligence** — Portfolio of tickers to structured pre/post earnings comparison cards
- **Eval Harness** — 12 finance-domain tasks with automated scoring proving agent reliability

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Agents | TinyFish Web Agent API (SSE streaming) |
| LLM Synthesis | Vercel AI SDK + OpenAI GPT-4o |
| Backend | Next.js 16 App Router |
| Frontend | shadcn/ui + Base UI + Tailwind CSS v4 |
| Charts | Recharts v3 |
| Schemas | Zod v4 |
| State | Upstash Redis |

## Getting Started

```bash
npm install
cp .env.local.example .env.local  # Fill in your API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|----------|------------|
| `TINYFISH_API_KEY` | TinyFish API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `KV_REST_API_URL` | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | Upstash Redis REST token |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook for alerts |
| `RESEND_API_KEY` | Resend API key for email alerts |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for alerts |
| `GEMINI_API_KEY` | Google Gemini API key for fish sprite generation |

Set `NEXT_PUBLIC_USE_MOCK_DATA=true` to run with pre-generated data (no API keys needed).

## Licence

[Apache 2.0](LICENSE)
