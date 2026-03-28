'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/shared/status-badge';
import { ActivityFeed } from '@/components/shared/activity-feed';
import { useTinyFishStream, type StreamEvent } from '@/hooks/useTinyFishStream';
import { ErrorCard } from '@/components/shared/error-card';
import { Search } from 'lucide-react';

const JURISDICTIONS = ['SG', 'US', 'HK', 'UK'];

function RiskScoreBadge({ score }: { score: number }) {
  const colour = score <= 3 ? 'bg-green-500' : score <= 6 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-white font-bold text-lg ${colour}`}>
      {score}
    </div>
  );
}

export default function DueDiligencePage() {
  const [company, setCompany] = useState('');
  const [jurisdiction, setJurisdiction] = useState('SG');
  const [ticker, setTicker] = useState('');
  const { events, result, isLoading, error, start } = useTinyFishStream();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    await start('/api/dd/run', { company, jurisdiction, ticker: ticker || undefined });
  };

  const data = result as Record<string, unknown> | null;
  const sources = data?.sources as Record<string, Record<string, unknown>> | null;
  const synthesis = data?.synthesis as Record<string, unknown> | null;

  const getSourceStatus = (sourceId: string): 'pending' | 'running' | 'success' | 'failed' => {
    const complete = events.find((e: StreamEvent) => e.type === 'SOURCE_COMPLETE' && e.source === sourceId);
    if (complete) return (complete.status as string) === 'success' ? 'success' : 'failed';
    const running = events.find((e: StreamEvent) => (e.type === 'SOURCE_STEP' || e.type === 'SOURCE_START') && e.source === sourceId);
    if (running) return 'running';
    return 'pending';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Due Diligence</h1>
        <p className="text-muted-foreground">Parallel extraction from 5 sources with GPT risk synthesis</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
            <Input
              placeholder="Company Name"
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="flex-1 min-w-[200px]"
              required
            />
            <select
              value={jurisdiction}
              onChange={e => setJurisdiction(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm bg-background text-foreground"
            >
              {JURISDICTIONS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
            <Input
              placeholder="Ticker (optional)"
              value={ticker}
              onChange={e => setTicker(e.target.value)}
              className="w-[150px]"
            />
            <Button type="submit" disabled={isLoading}>
              <Search className="mr-2 h-4 w-4" />
              {isLoading ? 'Running...' : 'Run Due Diligence'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {(isLoading || sources) && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {(sources ? Object.entries(sources) : [['google_news', null], ['yahoo_finance', null], ['sgx_announcements', null], ['elitigation', null], ['glassdoor', null]]).map(([id, src], idx) => {
            const sourceId = id ?? '';
            const status = src ? ((src as Record<string, unknown>).status as 'success' | 'failed') : getSourceStatus(sourceId);
            return (
            <Card
              key={sourceId}
              className={`transition-all duration-500 ${
                status === 'running' ? 'ring-2 ring-blue-400/50 shadow-blue-200/30 shadow-md' :
                status === 'success' ? 'ring-1 ring-green-400/30' :
                status === 'failed' ? 'ring-1 ring-red-400/30' : ''
              }`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm capitalize">{sourceId.replace(/_/g, ' ')}</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusBadge status={status} />
                {src && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {String((src as Record<string, unknown>).latency_ms)}ms
                  </p>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {events.length > 0 && <ActivityFeed events={events} />}

      {isLoading && !synthesis && (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-56" />
            </div>
          </CardContent>
        </Card>
      )}

      {error && <ErrorCard message={error} onRetry={() => company && start('/api/dd/run', { company, jurisdiction, ticker: ticker || undefined })} />}

      {synthesis && (
        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <RiskScoreBadge score={Number(synthesis.risk_score)} />
              <div>
                <Badge variant="outline" className="text-lg">{String(synthesis.risk_level)}</Badge>
                <p className="mt-1 text-sm text-muted-foreground">{String(synthesis.data_completeness)}</p>
              </div>
            </div>
            <p className="text-sm">{String(synthesis.summary)}</p>

            {Array.isArray(synthesis.red_flags) && synthesis.red_flags.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Red Flags</h4>
                <ul className="space-y-2">
                  {(synthesis.red_flags as Array<Record<string, string>>).map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant={flag.severity === 'high' ? 'destructive' : 'secondary'} className="shrink-0">
                        {flag.severity}
                      </Badge>
                      <span>{flag.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(synthesis.key_facts) && (
              <div>
                <h4 className="font-medium text-sm mb-2">Key Facts</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {(synthesis.key_facts as string[]).map((fact, i) => <li key={i}>{fact}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
