'use client';

import { useEffect, useRef } from 'react';
import type { StreamEvent } from '@/hooks/useTinyFishStream';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Real-time activity feed showing SOURCE_STEP, AGENT_MATCHED, and ACTION_DISPATCHED events.
 */
export function ActivityFeed({ events }: { events: StreamEvent[] }) {
  const feedEvents = events.filter(e =>
    e.type === 'SOURCE_STEP' ||
    e.type === 'SOURCE_START' ||
    e.type === 'SOURCE_COMPLETE' ||
    e.type === 'AGENT_MATCHED' ||
    e.type === 'ACTION_DISPATCHED' ||
    e.type === 'SYNTHESISING' ||
    e.type === 'TIER_CHECK'
  );

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [feedEvents.length]);

  if (feedEvents.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-48 overflow-y-auto text-xs font-mono">
          {feedEvents.map((event, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <EventBadge type={event.type} />
              <EventDetail event={event} />
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </CardContent>
    </Card>
  );
}

function EventBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    SOURCE_START: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    SOURCE_STEP: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
    SOURCE_COMPLETE: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    AGENT_MATCHED: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    ACTION_DISPATCHED: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    SYNTHESISING: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    TIER_CHECK: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  };

  return (
    <Badge variant="outline" className={`text-[10px] px-1 py-0 shrink-0 ${styles[type] ?? ''}`}>
      {type.replace('_', ' ')}
    </Badge>
  );
}

function EventDetail({ event }: { event: StreamEvent }) {
  switch (event.type) {
    case 'SOURCE_START':
      return <span className="text-muted-foreground">Starting {String(event.source)}</span>;
    case 'SOURCE_STEP':
      return <span>{String(event.detail)}</span>;
    case 'SOURCE_COMPLETE':
      return <span>Completed {String(event.source)} ({String(event.status)}, {String(event.latency_ms)}ms)</span>;
    case 'AGENT_MATCHED':
      return <span className="text-purple-600 dark:text-purple-400">Agent matched: {String(event.agent_name)}</span>;
    case 'ACTION_DISPATCHED':
      return <span className="text-amber-600 dark:text-amber-400">{String(event.action_type)} → {String(event.target)}</span>;
    case 'SYNTHESISING':
      return <span className="text-indigo-600 dark:text-indigo-400">Synthesising results...</span>;
    case 'TIER_CHECK':
      return <span>Tier {String(event.tier)}: {String(event.source)} → {String(event.status)}</span>;
    default:
      return <span className="text-muted-foreground">{event.type}</span>;
  }
}
