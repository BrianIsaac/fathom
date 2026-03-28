'use client';

import type { StreamEvent } from '@/hooks/useTinyFishStream';
import { Check, X, ArrowRight, Loader2 } from 'lucide-react';

interface TierStatus {
  tier: number;
  label: string;
  status: 'pending' | 'running' | 'pass' | 'fail' | 'skip' | 'escalated';
}

/**
 * Visual showing the three-tier cascade progression for a source.
 */
export function TierCascade({ sourceId, events, isLoading }: {
  sourceId: string;
  events: StreamEvent[];
  isLoading: boolean;
}) {
  const tierEvents = events.filter(e => e.type === 'TIER_CHECK' && e.source === sourceId);

  const tiers: TierStatus[] = [
    { tier: 0, label: 'ETag Check', status: 'pending' },
    { tier: 1, label: 'Hash Check', status: 'pending' },
    { tier: 2, label: 'Full Extract', status: 'pending' },
  ];

  for (const te of tierEvents) {
    const idx = Number(te.tier);
    if (idx >= 0 && idx < 3) {
      tiers[idx].status = te.status === 'pass' ? 'pass'
        : te.status === 'fail' ? 'fail'
        : te.status === 'skip' ? 'skip'
        : te.status === 'escalated' ? 'escalated'
        : 'running';
    }
  }

  if (isLoading && tierEvents.length === 0) {
    tiers[0].status = 'running';
  }

  return (
    <div className="flex items-center gap-1">
      {tiers.map((tier, i) => (
        <div key={tier.tier} className="flex items-center gap-1">
          <div className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${tierColour(tier.status)}`}>
            <TierIcon status={tier.status} />
            <span>T{tier.tier}</span>
          </div>
          {i < 2 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

function TierIcon({ status }: { status: TierStatus['status'] }) {
  switch (status) {
    case 'pass': return <Check className="h-3 w-3" />;
    case 'fail': return <X className="h-3 w-3" />;
    case 'running': return <Loader2 className="h-3 w-3 animate-spin" />;
    case 'skip': return <ArrowRight className="h-3 w-3" />;
    case 'escalated': return <ArrowRight className="h-3 w-3" />;
    default: return <div className="h-3 w-3 rounded-full bg-muted" />;
  }
}

function tierColour(status: TierStatus['status']): string {
  switch (status) {
    case 'pass': return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
    case 'fail': return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
    case 'running': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
    case 'skip': return 'bg-muted text-muted-foreground';
    case 'escalated': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
    default: return 'bg-muted text-muted-foreground';
  }
}
