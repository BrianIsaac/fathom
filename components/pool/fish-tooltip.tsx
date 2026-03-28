'use client';

import type { Agent } from '@/lib/agents/types';
import { Badge } from '@/components/ui/badge';

/**
 * Tooltip overlay showing agent details on hover.
 * Flips below the fish when near the top of the bowl.
 */
export function FishTooltip({ agent, flipBelow = false }: { agent: Agent; flipBelow?: boolean }) {
  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 z-50 w-64 rounded-lg border bg-popover p-3 shadow-lg text-popover-foreground ${
        flipBelow ? 'top-full mt-2' : 'bottom-full mb-2'
      }`}
      style={{ pointerEvents: 'none' }}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">{agent.name}</p>
          <Badge variant={agent.enabled ? 'default' : 'secondary'} className="text-xs">
            {agent.enabled ? 'Active' : 'Disabled'}
          </Badge>
        </div>

        <Badge variant="outline" className="text-xs">{agent.module.replace('_', ' ')}</Badge>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Conditions ({agent.conditions.operator})</p>
          {agent.conditions.checks.map((c, i) => (
            <p key={i} className="text-xs font-mono">
              {c.fact} {c.operator} {String(c.value)}
            </p>
          ))}
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Actions</p>
          <div className="flex gap-1">
            {agent.actions.map((a, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{a.type}</Badge>
            ))}
          </div>
        </div>

        {agent.last_triggered && (
          <p className="text-xs text-muted-foreground">
            Last triggered: {new Date(agent.last_triggered).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
