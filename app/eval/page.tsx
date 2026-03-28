'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTinyFishStream } from '@/hooks/useTinyFishStream';
import { ErrorCard } from '@/components/shared/error-card';
import { FlaskConical, Play, AlertTriangle } from 'lucide-react';

interface EvalData {
  eval_run_id: string;
  total_tasks: number;
  passed: number;
  failed: number;
  pass_rate: number;
  avg_latency_ms: number;
  avg_accuracy: number;
  total_cost_steps: number;
  results: Array<Record<string, unknown>>;
  by_module: Record<string, { tasks: number; passed: number; pass_rate: number; avg_accuracy: number }>;
  by_failure_category: Record<string, number>;
}

function useAnimatedNumber(target: number, duration: number = 800): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = null;
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

function KPICard({ title, value, numericValue, suffix, subtitle }: {
  title: string;
  value: string;
  numericValue?: number;
  suffix?: string;
  subtitle?: string;
}) {
  const animated = useAnimatedNumber(numericValue ?? 0);
  const displayValue = numericValue !== undefined
    ? `${numericValue >= 100 ? Math.round(animated).toLocaleString() : animated.toFixed(1)}${suffix ?? ''}`
    : value;

  return (
    <Card className="animate-count-up">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{displayValue}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function EvalPage() {
  const [evalData, setEvalData] = useState<EvalData | null>(null);
  const [mounted, setMounted] = useState(false);
  const { result, isLoading, error, start } = useTinyFishStream();

  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadEvalData = async () => {
    try {
      setFetchError(null);
      const res = await fetch('/api/eval/scheduled');
      if (!res.ok) throw new Error(`Failed to load eval data (${res.status})`);
      setEvalData(await res.json());
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load eval data');
    }
  };

  useEffect(() => {
    setMounted(true);
    loadEvalData();
  }, []);

  useEffect(() => {
    if (result) setEvalData(result as EvalData);
  }, [result]);

  const rerun = async () => {
    setEvalData(null);
    await start('/api/eval/run', {});
  };

  const data = evalData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Eval Dashboard</h1>
          <p className="text-muted-foreground">Web agent reliability metrics across 12 finance-domain tasks</p>
        </div>
        <Button onClick={rerun} disabled={isLoading}>
          <Play className="mr-2 h-4 w-4" />
          {isLoading ? 'Running...' : 'Re-run Eval'}
        </Button>
      </div>

      {(error || fetchError) && <ErrorCard message={error || fetchError || 'Unknown error'} onRetry={loadEvalData} />}

      {mounted && !data && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
          <Skeleton className="h-64" />
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard
              title="Pass Rate"
              value=""
              numericValue={data.pass_rate * 100}
              suffix="%"
              subtitle={`${data.passed}/${data.total_tasks} tasks`}
            />
            <KPICard
              title="Avg Latency"
              value=""
              numericValue={Math.round(data.avg_latency_ms)}
              suffix="ms"
              subtitle={`${data.total_cost_steps} total steps`}
            />
            <KPICard
              title="Avg Accuracy"
              value=""
              numericValue={data.avg_accuracy * 100}
              suffix="%"
            />
            <KPICard
              title="Tasks Run"
              value=""
              numericValue={data.total_tasks}
              subtitle={`${data.failed} failed`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Pass Rate by Module</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(data.by_module).map(([mod, stats]) => (
                  <div key={mod} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{mod.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                          style={{ width: `${stats.pass_rate * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono w-12 text-right">{(stats.pass_rate * 100).toFixed(0)}%</span>
                      <span className="text-xs text-muted-foreground">{stats.passed}/{stats.tasks}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Failure Categories</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(data.by_failure_category).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <Badge variant="outline">{cat.replace('_', ' ')}</Badge>
                    <span className="font-mono text-sm">{count}</span>
                  </div>
                ))}
                {Object.keys(data.by_failure_category).length === 0 && (
                  <p className="text-sm text-muted-foreground">No failures</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Task Results</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task ID</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Fields</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.results ?? []).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">{String(r.task_id)}</TableCell>
                      <TableCell><Badge variant="outline">{String(r.module)}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'passed' ? 'default' : 'destructive'}>
                          {String(r.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{((Number(r.accuracy) || 0) * 100).toFixed(0)}%</TableCell>
                      <TableCell className="font-mono">{Number(r.latency_ms).toLocaleString()}ms</TableCell>
                      <TableCell className="font-mono">
                        {String(r.fields_correct ?? '-')}/{String(r.fields_expected ?? '-')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
