'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Agent, AgentAction } from '@/lib/agents/types';
import { FishBowl } from '@/components/pool/fish-bowl';
import { FishSpriteComponent } from '@/components/pool/fish-sprite';
import { EmptyPool } from '@/components/pool/empty-pool';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorCard } from '@/components/shared/error-card';
import { Waves, Zap } from 'lucide-react';

export default function FathomPoolPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activity, setActivity] = useState<AgentAction[]>([]);
  const [mounted, setMounted] = useState(false);
  const [bowlSize, setBowlSize] = useState({ width: 800, height: 420 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ agents_matched: number; results: Array<{ agent: string; matched: boolean; actions_fired: string[] }> } | null>(null);
  const bowlRef = useRef<HTMLDivElement>(null);

  const loadAgents = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error(`Failed to load agents (${res.status})`);
      setAgents(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/activity');
      if (res.ok) setActivity(await res.json());
    } catch {
      // Activity polling failure is non-critical
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadAgents();
    loadActivity();
    const interval = setInterval(loadActivity, 10000);

    let resizeTimer: ReturnType<typeof setTimeout>;
    const measureBowl = () => {
      if (bowlRef.current) {
        const w = bowlRef.current.offsetWidth;
        const h = bowlRef.current.offsetHeight;
        setBowlSize(prev => (prev.width === w && prev.height === h) ? prev : { width: w, height: h });
      }
    };
    const debouncedMeasure = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measureBowl, 150);
    };
    measureBowl();
    window.addEventListener('resize', debouncedMeasure);

    return () => {
      clearInterval(interval);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', debouncedMeasure);
    };
  }, [loadAgents, loadActivity]);

  const triggerAgents = async () => {
    try {
      setTriggering(true);
      setTriggerResult(null);
      const res = await fetch('/api/agents/trigger', { method: 'POST' });
      if (!res.ok) throw new Error(`Trigger failed (${res.status})`);
      const data = await res.json();
      setTriggerResult(data);
      loadAgents();
      loadActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trigger failed');
    } finally {
      setTriggering(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Waves className="h-6 w-6" />
            Fathom Pool
          </h1>
          <p className="text-muted-foreground">
            {loading
              ? 'Loading agents...'
              : agents.length > 0
                ? `${agents.filter(a => a.enabled).length} active agent${agents.filter(a => a.enabled).length !== 1 ? 's' : ''} monitoring`
                : 'Deploy agents to start monitoring'}
          </p>
        </div>
        {agents.length > 0 && (
          <Button onClick={triggerAgents} disabled={triggering} variant="outline">
            <Zap className="mr-2 h-4 w-4" />
            {triggering ? 'Triggering...' : 'Test Trigger'}
          </Button>
        )}
      </div>

      {error && <ErrorCard message={error} onRetry={loadAgents} />}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[420px] w-full rounded-2xl" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !error && (
      <>
      <div ref={bowlRef}>
        <FishBowl>
          {agents.length === 0 ? (
            <EmptyPool />
          ) : (
            agents.map(agent => (
              <FishSpriteComponent
                key={agent.id}
                agent={agent}
                bowlWidth={bowlSize.width}
                bowlHeight={bowlSize.height}
              />
            ))
          )}
        </FishBowl>
      </div>

      {triggerResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Trigger Result — {triggerResult.agents_matched} agent{triggerResult.agents_matched !== 1 ? 's' : ''} matched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {triggerResult.results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge variant={r.matched ? 'default' : 'secondary'}>
                    {r.matched ? 'Matched' : 'No match'}
                  </Badge>
                  <span className="font-medium">{r.agent}</span>
                  {r.actions_fired.length > 0 && (
                    <span className="text-muted-foreground">
                      — {r.actions_fired.join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activity.map((action, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </span>
                  <Badge variant="outline" className="text-xs">{action.agent_name}</Badge>
                  <Badge variant="secondary" className="text-xs">{action.action_type}</Badge>
                  <span className="text-muted-foreground truncate">{action.detail}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </>
      )}
    </div>
  );
}
