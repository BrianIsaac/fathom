'use client';

import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

type Status = 'pending' | 'running' | 'success' | 'failed' | 'blocked' | 'timeout';

const STATUS_STYLES: Record<Status, string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  blocked: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  timeout: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {status === 'running' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
      {status}
    </Badge>
  );
}
