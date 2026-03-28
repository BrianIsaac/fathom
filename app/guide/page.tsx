import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Waves,
  Rocket,
  Shield,
  Search,
  TrendingUp,
  ScrollText,
  FlaskConical,
  ShieldAlert,
  ArrowRight,
  Clock,
  Zap,
  Target,
} from 'lucide-react';

const MODULES = [
  {
    title: 'Fathom Pool',
    href: '/',
    icon: Waves,
    colour: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    description: 'The fishbowl monitoring dashboard. Every deployed agent swims as a customised fish. Action bubbles appear when agents fire.',
    demo: 'Visual centrepiece — watch agents in action',
  },
  {
    title: 'Deploy',
    href: '/deploy',
    icon: Rocket,
    colour: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    description: 'Create persistent agents with customisable fish sprites (species, colour, accessories). Set conditions and actions — Slack, email, Telegram, webhooks.',
    demo: 'Deploy an agent, watch it appear in the pool',
  },
  {
    title: 'Regulatory Sentry',
    href: '/sentries',
    icon: Shield,
    colour: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    description: 'Three-tier cascade (ETag, content hash, full extraction) across 6+ regulators. 95% cost reduction versus full extraction every cycle.',
    demo: 'Trigger the sentry, show tier escalation live',
  },
  {
    title: 'Due Diligence',
    href: '/due-diligence',
    icon: Search,
    colour: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    description: 'Company name in, risk-scored brief out in 90 seconds. 5 parallel TinyFish agents across Google News, Yahoo Finance, SGX, eLitigation, Glassdoor.',
    demo: 'Type a company, watch 5 agents fire simultaneously',
  },
  {
    title: 'Earnings Intelligence',
    href: '/earnings',
    icon: TrendingUp,
    colour: 'bg-green-500/10 text-green-600 dark:text-green-400',
    description: 'Portfolio of tickers processed simultaneously. Per-ticker parallel extraction from Yahoo Finance and company IR pages, with GPT synthesis.',
    demo: '5 tickers processed in parallel',
  },
  {
    title: 'Regulatory Scanner',
    href: '/regulatory',
    icon: ScrollText,
    colour: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    description: 'Domain and jurisdiction picker with tabbed synthesis output. Scans MAS, SEC, HKMA, FCA, BIS, and SGX for relevant publications.',
    demo: 'Select domains, watch publications stream in',
  },
  {
    title: 'Cyber Scan',
    href: '/cyber',
    icon: ShieldAlert,
    colour: 'bg-red-500/10 text-red-600 dark:text-red-400',
    description: 'OWASP Top 10 vulnerability scanner with a three-tier cost system. Tier 0/1 use plain HTTP ($0, <10s). Tier 2 uses TinyFish only when needed.',
    demo: 'Enter a target URL, see vulnerabilities appear',
  },
  {
    title: 'Eval Dashboard',
    href: '/eval',
    icon: FlaskConical,
    colour: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    description: '12 finance-domain tasks with automated scoring. Field-level accuracy, failure categorisation, module breakdowns. The reliability proof layer.',
    demo: 'Pre-generated dashboard showing 83% pass rate',
  },
];


export default function GuidePage() {
  return (
    <div className="space-y-10 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fathom</h1>
        <p className="text-lg text-muted-foreground mt-1">Deep intelligence, surfaced fast.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">The Problem</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { role: 'Compliance teams', pain: 'Manually check 8+ regulator websites daily for new circulars and consultation papers' },
            { role: 'Risk teams', pain: 'Spend 2-3 hours per counterparty on basic due diligence across fragmented public sources' },
            { role: 'Analysts', pain: 'Manually aggregate earnings data across IR pages, news wires, and financial portals' },
            { role: 'Security teams', pain: 'Run expensive, slow vulnerability scanners that miss business logic flaws entirely' },
          ].map(({ role, pain }) => (
            <Card key={role}>
              <CardContent className="pt-4">
                <p className="font-medium text-sm">{role}</p>
                <p className="text-sm text-muted-foreground mt-1">{pain}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">The Solution</h2>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm">Deploy <strong>TinyFish web agents</strong> in parallel across dozens of public sources. No APIs needed — these are real browser agents navigating real websites.</p>
            </div>
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm">Extract structured data, <strong>synthesise with GPT</strong>, and deliver actionable intelligence — with an eval harness that quantifies reliability.</p>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm">Persistent agents <strong>monitor autonomously</strong>. A three-tier cascade (ETag, content hash, full extraction) cuts costs by 95%. Agents fire Slack, email, and Telegram when conditions match.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Modules</h2>
        <div className="grid gap-3">
          {MODULES.map((mod) => (
            <Link key={mod.href} href={mod.href} className="block group">
              <Card className="transition-colors group-hover:border-primary/30">
                <CardContent className="pt-4 flex items-start gap-4">
                  <div className={`rounded-lg p-2.5 shrink-0 ${mod.colour}`}>
                    <mod.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{mod.title}</h3>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{mod.description}</p>
                    <Badge variant="outline" className="mt-2 text-xs">{mod.demo}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Architecture</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="font-medium mb-2">Stack</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Next.js 16 App Router</li>
                  <li>TinyFish Web Agent API (SSE)</li>
                  <li>Vercel AI SDK + GPT-4o</li>
                  <li>Upstash Redis</li>
                  <li>shadcn/ui + Tailwind v4</li>
                  <li>Zod schema validation</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Key patterns</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>SSE multiplexer for real-time streaming</li>
                  <li>Three-tier cost cascade (ETag, hash, extraction)</li>
                  <li>Adaptive scheduling based on source freshness</li>
                  <li>Rule-based agent engine with condition evaluation</li>
                  <li>Multi-channel action dispatch (Slack, email, Telegram)</li>
                  <li>Tiered cyber scanning (HTTP first, TinyFish only when needed)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="pb-8">
        <Card className="bg-muted/30">
          <CardContent className="pt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Built with and for{' '}
              <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:underline">
                TinyFish
              </a>
              {' '} — TinyFish SG Hackathon, NUS, 28 March 2026
            </p>
            <p className="text-sm">
              <a
                href="https://github.com/BrianIsaac/fathom"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                View source on GitHub
              </a>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
