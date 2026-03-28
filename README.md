# Fathom

**Deep intelligence, surfaced fast.**

Fathom is an autonomous compliance intelligence platform that deploys persistent web agents across the hidden web — sites with no APIs, heavy JavaScript rendering, and aggressive anti-bot measures — to detect regulatory changes, extract due diligence data, and deliver structured intelligence to compliance teams before they even start their day.

## The Problem

Financial compliance teams spend hours every morning manually checking regulatory websites (MAS, SEC, HKMA, FCA, SGX) for new publications, cross-referencing company filings across fragmented data sources, and tracking earnings data across investor relations pages. These sites have no public APIs, render content with JavaScript, and actively block automated access. The result: slow, expensive, error-prone manual processes where critical regulatory changes can be missed until it's too late.

## The Solution

Fathom deploys TinyFish web agents as persistent "fish" in a monitoring pool. Each agent is configured with conditions and actions — when a regulatory change matches an agent's conditions, it autonomously dispatches alerts via Slack, email, or Telegram. The system uses a three-tier cost-optimised cascade to monitor sources efficiently, only invoking expensive browser automation when actual changes are detected.

### Three-Tier Cascade

| Tier | Method | Cost | Latency |
|------|--------|------|---------|
| Tier 0 | HTTP ETag conditional check | $0 | <500ms |
| Tier 1 | Content hash comparison (SHA-256) | $0 | 1-3s |
| Tier 2 | Full TinyFish browser extraction | ~$0.20-0.45 | 15-40s |

Each source is checked at the cheapest tier first. Only when a change is confirmed does it escalate to full extraction — reducing daily monitoring costs by ~95%.

### Agent System

Agents are persistent monitors with configurable conditions and actions. Each agent:
- Targets a module (regulatory, due diligence, or earnings)
- Defines conditions using fact/operator/value checks (e.g. `relevance_score > 7 AND regulator = MAS`)
- Dispatches actions when conditions match: Slack, email, Telegram, webhook, or Google Sheets
- Gets a unique fish sprite (species, colour, accessory) rendered in the Fathom Pool

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Fathom Pool | Animated fishbowl showing all deployed agents with real-time action bubbles |
| `/deploy` | Deploy | Create and manage persistent agents with conditions, actions, and fish config |
| `/sentries` | Sentries | Manual trigger of the sentry cascade with tier-by-tier visualisation |
| `/due-diligence` | Due Diligence | Company name in, risk-scored brief out from 5 parallel sources |
| `/earnings` | Earnings | Ticker portfolio to structured earnings comparison cards |
| `/regulatory` | Regulatory | Scan regulators by domain and jurisdiction with relevance scoring |
| `/eval` | Eval Dashboard | 12 finance-domain tasks with automated scoring and reliability metrics |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Agents | TinyFish Web Agent API (SSE streaming) |
| LLM Synthesis | Vercel AI SDK + OpenAI GPT-4o |
| Framework | Next.js 16 App Router, React 19 |
| UI | shadcn/ui + Base UI + Tailwind CSS v4 |
| Charts | Recharts v3 |
| Schemas | Zod v4 |
| State | Upstash Redis |
| Database | Turso (libSQL) for audit trails |
| Email | Resend |
| Notifications | Slack webhooks, Telegram Bot API |

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
