'use client';

import { useState, useCallback, useRef } from 'react';

export interface StreamEvent {
  type: string;
  [key: string]: unknown;
}

interface UseTinyFishStreamReturn {
  events: StreamEvent[];
  result: unknown | null;
  isLoading: boolean;
  error: string | null;
  start: (url: string, body: Record<string, unknown>) => Promise<void>;
  cancel: () => void;
}

/**
 * React hook for consuming SSE streams from Fathom API routes.
 *
 * Returns:
 *   Object with events array, final result, loading state, and control methods.
 */
export function useTinyFishStream(): UseTinyFishStreamReturn {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [result, setResult] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const start = useCallback(async (url: string, body: Record<string, unknown>) => {
    setEvents([]);
    setResult(null);
    setError(null);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += value;
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const dataLine = part.split('\n').find(l => l.startsWith('data: '));
          if (!dataLine) continue;

          try {
            const event = JSON.parse(dataLine.slice(6)) as StreamEvent;
            setEvents(prev => [...prev, event]);

            if (event.type === 'COMPLETE') {
              if (event.status === 'failed') {
                setError(String(event.error));
              } else {
                setResult(event.result ?? event);
              }
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { events, result, isLoading, error, start, cancel };
}
