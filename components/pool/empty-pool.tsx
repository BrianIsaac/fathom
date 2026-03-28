'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Waves, Plus } from 'lucide-react';

/**
 * Empty state shown when no agents are deployed.
 */
export function EmptyPool() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Waves className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h2 className="text-xl font-semibold mb-2">Your pool is empty</h2>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Deploy your first agent to start monitoring. Each agent becomes a fish swimming in your pool.
      </p>
      <Button onClick={() => router.push('/deploy')}>
        <Plus className="mr-2 h-4 w-4" />
        Deploy Agent
      </Button>
    </div>
  );
}
