# Fathom

**Deep intelligence, surfaced fast.**

Fathom is an autonomous compliance intelligence platform that deploys persistent web agents across the hidden web — sites with no APIs, heavy JavaScript rendering, and aggressive anti-bot measures — to detect regulatory changes, scan for security vulnerabilities, extract due diligence data, and deliver structured intelligence to compliance and security teams before they even start their day.

## The Problem

Compliance and security teams are stretched thin. Regulatory analysts spend hours manually checking government websites (MAS, SEC, HKMA, FCA, SGX) for new publications. Security engineers run periodic vulnerability scans with expensive tools that miss business logic flaws. Due diligence teams cross-reference company filings across fragmented sources. These sites have no public APIs, render content with JavaScript, and actively block automated access.

## The Solution

Fathom deploys TinyFish web agents as persistent "fish" in a monitoring pool. Each agent is configured with conditions and actions — when a change or vulnerability matches an agent's conditions, it autonomously dispatches alerts via Slack, email, or Telegram.

### Core Capabilities

- **Regulatory Monitoring** — Three-tier cost-optimised cascade (ETag, content hash, full extraction) across 8 regulators. 95% cost reduction vs full extraction on every check.
- **Cyber Vulnerability Scanning** — OWASP Top-10 automated security assessment. Three-tier scan: HTTP header/config checks, authenticated API testing, then TinyFish browser agents for file upload, SSRF, and business logic abuse. Covers broken access control, auth failures, injection, insecure design, misconfiguration, vulnerable components, and more.
- **Due Diligence** — Company name in, risk-scored brief out from 5 parallel sources (news, financials, filings, court cases, employer reviews) in ~90 seconds.
- **Earnings Intelligence** — Ticker portfolio to structured earnings comparison cards with beat/miss indicators.

### Agent System

Agents are persistent monitors with configurable conditions and actions. Each agent:
- Targets a module (regulatory, due diligence, earnings, or cyber)
- Defines conditions using fact/operator/value checks (e.g. `risk_score > 5 AND critical_count > 0`)
- Dispatches actions when conditions match: Slack, email, Telegram, webhook
- Gets a unique fish sprite (species, colour, accessory) rendered in the Fathom Pool

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Fathom Pool | Animated fishbowl showing all deployed agents with real-time action bubbles |
| `/deploy` | Deploy | Create and manage persistent agents with conditions, actions, and fish config |
| `/sentries` | Sentries | Manual trigger of the regulatory sentry cascade with tier-by-tier visualisation |
| `/cyber` | Cyber Scan | OWASP Top-10 vulnerability scanner with three-tier assessment and findings table |
| `/due-diligence` | Due Diligence | Company name in, risk-scored brief out from 5 parallel sources |
| `/earnings` | Earnings | Ticker portfolio to structured earnings comparison cards |
| `/regulatory` | Regulatory | Scan regulators by domain and jurisdiction with relevance scoring |
| `/eval` | Eval Dashboard | 12 finance-domain tasks with automated scoring and reliability metrics |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Agents | TinyFish Web Agent API (SSE streaming) |
| LLM Synthesis | Vercel AI SDK + OpenAI GPT-5.4 |
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

Set `NEXT_PUBLIC_USE_MOCK_DATA=true` to run with pre-generated data (no API keys needed).

## Licence

[Apache 2.0](LICENSE)
