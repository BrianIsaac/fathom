'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTinyFishStream } from '@/hooks/useTinyFishStream';
import { ActivityFeed } from '@/components/shared/activity-feed';
import { ErrorCard } from '@/components/shared/error-card';
import { TrendingUp, TrendingDown } from 'lucide-react';

function BeatMissIndicator({ surprise }: { surprise: string | null }) {
  if (!surprise) return <Badge variant="secondary">N/A</Badge>;
  const isPositive = surprise.startsWith('+');
  return (
    <Badge variant="outline" className={isPositive
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }>
      {isPositive ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
      {surprise}
    </Badge>
  );
}

export default function EarningsPage() {
  const [tickers, setTickers] = useState('');
  const { events, result, isLoading, error, start } = useTinyFishStream();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickers) return;
    await start('/api/earnings/run', { tickers });
  };

  const data = result as Record<string, unknown> | null;
  const earnings = (data?.earnings as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Earnings Intelligence</h1>
        <p className="text-muted-foreground">Parallel earnings extraction with cross-source synthesis</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              placeholder="Enter tickers, e.g. AAPL, MSFT, GRAB"
              value={tickers}
              onChange={e => setTickers(e.target.value)}
              className="flex-1"
              required
            />
            <Button type="submit" disabled={isLoading}>
              <TrendingUp className="mr-2 h-4 w-4" />
              {isLoading ? 'Running...' : 'Run Earnings Analysis'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && <ErrorCard message={error} onRetry={() => tickers && start('/api/earnings/run', { tickers })} />}

      {events.length > 0 && <ActivityFeed events={events} />}

      {isLoading && earnings.length === 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-32 mt-1" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between"><Skeleton className="h-4 w-8" /><Skeleton className="h-5 w-24" /></div>
                <div className="flex justify-between"><Skeleton className="h-4 w-14" /><Skeleton className="h-5 w-24" /></div>
                <Skeleton className="h-px w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {earnings.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {earnings.map((e, idx) => {
            const fins = e.financials as Record<string, unknown> | undefined;
            return (
              <Card
                key={String(e.ticker)}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{String(e.ticker)}</CardTitle>
                    <Badge variant="secondary">{String(e.fiscal_quarter)}</Badge>
                  </div>
                  <CardDescription>{String(e.company_name)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fins && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">EPS</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{String(fins.eps_actual ?? 'N/A')}</span>
                          <BeatMissIndicator surprise={fins.eps_surprise as string | null} />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Revenue</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{String(fins.revenue_actual ?? 'N/A')}</span>
                          <BeatMissIndicator surprise={fins.revenue_surprise as string | null} />
                        </div>
                      </div>
                      {fins.guidance && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Guidance</p>
                          <p className="text-sm">{String(fins.guidance)}</p>
                        </div>
                      )}
                    </>
                  )}
                  {e.analyst_tone ? (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Analyst Tone</p>
                      <p className="text-sm">{String(e.analyst_tone)}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
