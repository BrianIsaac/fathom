'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { ActivityFeed } from '@/components/shared/activity-feed';
import { TierCascade } from '@/components/shared/tier-cascade';
import { useTinyFishStream } from '@/hooks/useTinyFishStream';
import { ErrorCard } from '@/components/shared/error-card';
import { Shield, Play, Clock, AlertTriangle } from 'lucide-react';

const SENTRY_SOURCES = [
  { id: 'mas_publications', name: 'MAS', jurisdiction: 'SG' },
  { id: 'mas_news', name: 'MAS News', jurisdiction: 'SG' },
  { id: 'sec_press', name: 'SEC', jurisdiction: 'US' },
  { id: 'hkma_circulars', name: 'HKMA', jurisdiction: 'HK' },
  { id: 'fca_publications', name: 'FCA', jurisdiction: 'UK' },
  { id: 'sgx_regco', name: 'SGX RegCo', jurisdiction: 'SG' },
];

export default function SentriesPage() {
  const { events, result, isLoading, error, start } = useTinyFishStream();
  const [lastRun, setLastRun] = useState<string | null>(null);

  const triggerSentry = async () => {
    setLastRun(new Date().toISOString());
    await start('/api/sentry/regulatory', {
      business_domains: ['digital payments', 'retail FX', 'insurance'],
      jurisdictions: ['SG', 'US', 'HK', 'UK', 'INT'],
    });
  };

  const data = result as Record<string, unknown> | null;
  const publications = (data?.publications as Array<Record<string, unknown>>) ?? [];
  const synthesis = data?.synthesis as Record<string, string[]> | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sentries</h1>
          <p className="text-muted-foreground">Autonomous regulatory monitoring across jurisdictions</p>
        </div>
        <Button onClick={triggerSentry} disabled={isLoading}>
          <Play className="mr-2 h-4 w-4" />
          {isLoading ? 'Running...' : 'Trigger Sentry Now'}
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {SENTRY_SOURCES.map((source, idx) => {
          const sourceEvent = events.find(
            e => (e as Record<string, unknown>).source === source.id && e.type === 'SOURCE_COMPLETE'
          );
          const isRunning = isLoading && !sourceEvent;
          const status = isRunning ? 'running' : sourceEvent ? 'success' : 'pending';

          return (
            <Card
              key={source.id}
              className={`transition-all duration-500 ${
                status === 'running' ? 'ring-2 ring-blue-400/50 shadow-md' :
                status === 'success' ? 'ring-1 ring-green-400/30' : ''
              }`}
              style={{ transitionDelay: `${idx * 80}ms` }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{source.name}</CardTitle>
                <CardDescription>{source.jurisdiction}</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusBadge status={status} />
                {lastRun && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <Clock className="inline mr-1 h-3 w-3" />
                    {new Date(lastRun).toLocaleTimeString()}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && <ErrorCard message={error} onRetry={triggerSentry} />}

      {events.length > 0 && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <ActivityFeed events={events} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tier Cascade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {SENTRY_SOURCES.map(source => (
                <div key={source.id} className="flex items-center gap-2">
                  <span className="text-xs w-20 shrink-0">{source.name}</span>
                  <TierCascade sourceId={source.id} events={events} isLoading={isLoading} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading && events.length === 0 && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
            <div className="space-y-3">
              {SENTRY_SOURCES.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 flex-1" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      )}

      {synthesis && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-red-600 dark:text-red-400">Urgent Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {(synthesis.urgent_actions ?? []).map((a, i) => (
                  <li key={i} className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />{a}</li>
                ))}
                {(synthesis.urgent_actions ?? []).length === 0 && <li className="text-muted-foreground">None</li>}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-amber-600 dark:text-amber-400">Monitoring Items</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {(synthesis.monitoring_items ?? []).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Informational</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {(synthesis.informational ?? []).map((inf, i) => (
                  <li key={i}>{inf}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {publications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Publications ({publications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {publications.map((pub, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                  <Badge variant="outline">{String(pub.relevance_score)}</Badge>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm">{String(pub.title)}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{String(pub.regulator)}</Badge>
                      <span>{String(pub.date)}</span>
                      <Badge variant="outline">{String(pub.document_type)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{String(pub.summary)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
