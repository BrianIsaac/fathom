import type { MinoRequestConfig, MinoEvent, MinoCallbacks, MinoResponse, ParallelSource, ParallelResult } from './types';
import { TinyFishError } from './types';

const TINYFISH_API_URL = 'https://agent.tinyfish.ai/v1/automation/run-sse';

/**
 * Runs a TinyFish web automation via SSE, invoking callbacks for each event.
 *
 * Args:
 *   config: The automation request configuration (url + goal + options).
 *   apiKey: TinyFish API key.
 *   callbacks: Optional callbacks for step progress, streaming URL, completion, and errors.
 *
 * Returns:
 *   MinoResponse containing success status, result data, and all events.
 */
export async function runMinoAutomation(
  config: MinoRequestConfig,
  apiKey: string,
  callbacks?: MinoCallbacks,
): Promise<MinoResponse> {
  const events: MinoEvent[] = [];
  let streamingUrl: string | undefined;

  const response = await fetch(TINYFISH_API_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new TinyFishError(`TinyFish API error: ${response.status}`, response.status);
  }

  if (!response.body) {
    throw new TinyFishError('Response body is null', 0);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const dataLine = part.split('\n').find(l => l.startsWith('data: '));
      if (!dataLine) continue;

      try {
        const event: MinoEvent = JSON.parse(dataLine.slice(6));
        events.push(event);

        if (event.type === 'PROGRESS' && event.purpose) {
          callbacks?.onStep?.(event.purpose);
        }
        if (event.type === 'STREAMING_URL' && event.streamingUrl) {
          streamingUrl = event.streamingUrl;
          callbacks?.onStreamingUrl?.(event.streamingUrl);
        }
        if (event.type === 'COMPLETE' && event.status === 'COMPLETED') {
          const data = event.result ?? event.resultJson;
          callbacks?.onComplete?.(data);
          return { success: true, result: data, streamingUrl, events };
        }
        if (event.type === 'COMPLETE' && event.status === 'FAILED') {
          const errMsg = event.error ?? event.help_message ?? 'Unknown error';
          callbacks?.onError?.(errMsg);
          return { success: false, error: errMsg, streamingUrl, events };
        }
      } catch {
        // Malformed chunk — skip
      }
    }
  }

  return { success: false, error: 'Stream ended without COMPLETE event', events };
}

/**
 * Convenience wrapper that throws on failure instead of returning a result object.
 *
 * Args:
 *   url: Target URL for the automation.
 *   goal: Plain English goal description.
 *   options: Optional configuration (browser_profile, proxy_config, etc.).
 *
 * Returns:
 *   The parsed result from the automation.
 *
 * Raises:
 *   TinyFishError: If the automation fails or returns no result.
 */
export async function scrape(
  url: string,
  goal: string,
  options?: Partial<MinoRequestConfig>,
): Promise<unknown> {
  const result = await runMinoAutomation(
    { url, goal, ...options },
    process.env.TINYFISH_API_KEY!,
  );

  if (!result.success) {
    throw new TinyFishError(result.error ?? 'Automation failed', 0);
  }

  return result.result;
}

export interface TinyFishResult {
  success: boolean;
  result: Record<string, unknown> | null;
  error: string | null;
  latency_ms: number;
  steps_used: number;
}

/**
 * Executes a TinyFish task and returns the final result with latency tracking.
 *
 * Args:
 *   url: Target URL.
 *   goal: Plain English goal.
 *   browserProfile: Browser profile to use.
 *
 * Returns:
 *   The complete result including status, data, and latency.
 */
export async function executeTinyFishSync(
  url: string,
  goal: string,
  browserProfile: 'lite' | 'stealth' = 'lite',
): Promise<TinyFishResult> {
  const startTime = Date.now();
  let stepCount = 0;

  const response = await runMinoAutomation(
    { url, goal, browser_profile: browserProfile },
    process.env.TINYFISH_API_KEY!,
    { onStep: () => { stepCount++; } },
  );

  return {
    success: response.success,
    result: response.result as Record<string, unknown> | null,
    error: response.error ?? null,
    latency_ms: Date.now() - startTime,
    steps_used: stepCount,
  };
}

/**
 * Executes multiple TinyFish tasks in parallel using Promise.allSettled.
 *
 * Args:
 *   sources: Array of source configurations to execute.
 *   onStep: Optional callback for per-source step progress.
 *
 * Returns:
 *   Array of results, one per source, regardless of success or failure.
 */
export async function executeParallel(
  sources: ParallelSource[],
  onStep?: (sourceId: string, message: string) => void,
): Promise<ParallelResult[]> {
  const results = await Promise.allSettled(
    sources.map(async (source): Promise<ParallelResult> => {
      const startTime = Date.now();

      try {
        const response = await runMinoAutomation(
          source.request,
          process.env.TINYFISH_API_KEY!,
          {
            onStep: (msg) => onStep?.(source.id, msg),
          },
        );

        if (response.success) {
          return {
            source_id: source.id,
            source_name: source.name,
            status: 'success',
            latency_ms: Date.now() - startTime,
            data: response.result as Record<string, unknown> ?? null,
            error: null,
          };
        }

        const failStatus = response.error?.includes('BLOCKED') ? 'blocked' as const
          : response.error?.includes('TIMEOUT') ? 'timeout' as const
          : 'failed' as const;

        return {
          source_id: source.id,
          source_name: source.name,
          status: failStatus,
          latency_ms: Date.now() - startTime,
          data: null,
          error: response.error ?? 'Unknown error',
        };
      } catch (err) {
        return {
          source_id: source.id,
          source_name: source.name,
          status: 'failed',
          latency_ms: Date.now() - startTime,
          data: null,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      source_id: sources[i].id,
      source_name: sources[i].name,
      status: 'failed' as const,
      latency_ms: 0,
      data: null,
      error: r.reason?.message ?? 'Unknown error',
    };
  });
}
