'use client';

import { useEffect, useState } from 'react';
import type { AgentAction } from '@/lib/agents/types';

/**
 * Speech bubble that appears above a fish when an action fires.
 * Auto-dismisses after 5 seconds.
 */
export function ActionBubble({ action, onDismiss }: { action: AgentAction; onDismiss: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`absolute -top-12 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="bg-white dark:bg-zinc-800 rounded-lg px-3 py-1.5 shadow-lg border text-xs whitespace-nowrap">
        <span className="font-medium">{action.action_type}</span>
        <span className="text-muted-foreground"> → {action.target}</span>
      </div>
      <div className="w-2 h-2 bg-white dark:bg-zinc-800 border-b border-r rotate-45 mx-auto -mt-1" />
    </div>
  );
}
