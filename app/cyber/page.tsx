'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ActivityFeed } from '@/components/shared/activity-feed';
import { ErrorCard } from '@/components/shared/error-card';
import { useTinyFishStream, type StreamEvent } from '@/hooks/useTinyFishStream';
import { ShieldAlert } from 'lucide-react';

const SEVERITY_COLOURS: Record<string, string> = {
  Critical: 'bg-red-600 text-white',
  High: 'bg-orange-500 text-white',
  Medium: 'bg-amber-500 text-white',
  Low: 'bg-blue-500 text-white',
};

const STATUS_COLOURS: Record<string, string> = {
  VULNERABLE: 'destructive',
  NOT_VULNERABLE: 'secondary',
  INCONCLUSIVE: 'outline',
  ERROR: 'outline',
};

function RiskScoreBadge({ score }: { score: number }) {
  const colour = score <= 3 ? 'bg-green-500' : score <= 6 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full text-white font-bold text-xl ${colour}`}>
      {score}
    </div>
  );
}

function StatusLabel({ status }: { status: string }) {
  const labels: Record<string, string> = {
    VULNERABLE: 'Vulnerable',
    NOT_VULNERABLE: 'Secure',
    INCONCLUSIVE: 'Inconclusive',
    ERROR: 'Error',
  };
  return (
    <Badge variant={STATUS_COLOURS[status] as 'destructive' | 'secondary' | 'outline' ?? 'outline'}>
      {labels[status] ?? status}
    </Badge>
  );
}

export default function CyberScanPage() {
  const [target, setTarget] = useState('');
  const { events, result, isLoading, error, start } = useTinyFishStream();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    await start('/api/cyber/scan', { target });
  };

  const data = result as Record<string, unknown> | null;
  const findings = data?.findings as Array<Record<string, unknown>> | null;
  const synthesis = data?.synthesis as Record<string, unknown> | null;

  const completedAgents = events.filter((e: StreamEvent) => e.type === 'ATTACK_COMPLETE').length;
  const totalAgents = 10;
  const progress = isLoading ? Math.round((completedAgents / totalAgents) * 100) : 0;

  const getAgentStatus = (agentId: string): 'pending' | 'running' | 'complete' => {
    if (events.find((e: StreamEvent) => e.type === 'ATTACK_COMPLETE' && e.agent === agentId)) return 'complete';
    if (events.find((e: StreamEvent) => e.type === 'ATTACK_START' && e.agent === agentId)) return 'running';
    return 'pending';
  };

  const liveFindings = events
    .filter((e: StreamEvent) => e.type === 'ATTACK_COMPLETE')
    .map((e: StreamEvent) => ({
      id: e.agent as string,
      name: e.name as string,
      status: e.status as string,
      severity: e.severity as string,
      category: e.category as string,
      summary: e.summary as string,
    }));

  const displayFindings = findings ?? (liveFindings.length > 0 ? liveFindings : null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cyber Scan</h1>
        <p className="text-muted-foreground">OWASP Top 10 vulnerability scan powered by TinyFish browser agents</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              placeholder="Target URL (e.g. https://example.com)"
              value={target}
              onChange={e => setTarget(e.target.value)}
              className="flex-1"
              type="url"
              required
            />
            <Button type="submit" disabled={isLoading}>
              <ShieldAlert className="mr-2 h-4 w-4" />
              {isLoading ? 'Scanning...' : 'Run Scan'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Scanning {target}...</span>
              <span className="font-medium">{completedAgents}/{totalAgents} agents</span>
            </div>
            <Progress value={progress} />
            {events.find((e: StreamEvent) => e.type === 'RECON_START') && !events.find((e: StreamEvent) => e.type === 'RECON_COMPLETE') && (
              <p className="text-sm text-muted-foreground animate-pulse">Phase 1: Reconnaissance — mapping API surface...</p>
            )}
            {events.find((e: StreamEvent) => e.type === 'RECON_COMPLETE') && completedAgents < totalAgents && (
              <p className="text-sm text-muted-foreground animate-pulse">Phase 2: Running attack agents ({completedAgents}/{ATTACK_AGENTS_COUNT} complete)...</p>
            )}
          </CardContent>
        </Card>
      )}

      {displayFindings && displayFindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vulnerability Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">#</th>
                    <th className="text-left py-2 pr-4 font-medium">Agent</th>
                    <th className="text-left py-2 pr-4 font-medium">Category</th>
                    <th className="text-left py-2 pr-4 font-medium">Severity</th>
                    <th className="text-left py-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayFindings.map((f, i) => (
                    <tr key={f.id as string} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-muted-foreground">{i + 1}</td>
                      <td className="py-3 pr-4 font-medium">{f.name as string}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs">{f.category as string}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLOURS[f.severity as string] ?? ''}`}>
                          {f.severity as string}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <StatusLabel status={f.status as string} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {displayFindings && displayFindings.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {displayFindings
            .filter(f => f.status === 'VULNERABLE')
            .map(f => (
              <Card key={f.id as string} className="border-red-200 dark:border-red-900">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{f.name as string}</CardTitle>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLOURS[f.severity as string] ?? ''}`}>
                      {f.severity as string}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.summary as string}</p>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {events.length > 0 && <ActivityFeed events={events} />}

      {isLoading && !synthesis && !displayFindings && (
        <Card>
          <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      )}

      {error && <ErrorCard message={error} onRetry={() => target && start('/api/cyber/scan', { target })} />}

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
                <p className="mt-1 text-sm text-muted-foreground">
                  {String(synthesis.vulnerabilities_found)} vulnerabilities found across {String(synthesis.critical_count)} critical, {String(synthesis.high_count)} high
                </p>
              </div>
            </div>

            {Array.isArray(synthesis.top_priority) && (
              <div>
                <h4 className="font-medium text-sm mb-2">Priority Actions</h4>
                <ul className="space-y-2">
                  {(synthesis.top_priority as string[]).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="destructive" className="shrink-0">{i + 1}</Badge>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(() => {
              const coverage = synthesis.owasp_coverage as Record<string, string> | undefined;
              if (!coverage) return null;
              return (
                <div>
                  <h4 className="font-medium text-sm mb-2">OWASP Coverage</h4>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                    {Object.entries(coverage).map(([cat, st]) => (
                      <div key={cat} className="flex items-center gap-2 text-xs">
                        <StatusLabel status={st} />
                        <span className="text-muted-foreground truncate">{cat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const ATTACK_AGENTS_COUNT = 9;
