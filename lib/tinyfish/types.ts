export interface MinoRequestConfig {
  url: string;
  goal: string;
  browser_profile?: 'lite' | 'stealth';
  proxy_config?: {
    enabled: boolean;
    country_code?: 'US' | 'GB' | 'CA' | 'DE' | 'FR' | 'JP' | 'AU';
  };
  api_integration?: string;
  feature_flags?: {
    enable_agent_memory?: boolean;
  };
}

export interface MinoEvent {
  type: string;
  status?: string;
  purpose?: string;
  result?: unknown;
  resultJson?: unknown;
  streamingUrl?: string;
  error?: string;
  help_message?: string;
  help_url?: string;
  run_id?: string;
  timestamp?: string;
}

export interface MinoCallbacks {
  onStep?: (message: string) => void;
  onStreamingUrl?: (url: string) => void;
  onComplete?: (result: unknown) => void;
  onError?: (error: string) => void;
}

export interface MinoResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  streamingUrl?: string;
  events: MinoEvent[];
}

export class TinyFishError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode?: string,
  ) {
    super(message);
    this.name = 'TinyFishError';
  }
}

export interface ParallelSource {
  id: string;
  name: string;
  request: MinoRequestConfig;
}

export interface ParallelResult {
  source_id: string;
  source_name: string;
  status: 'success' | 'failed' | 'timeout' | 'blocked';
  latency_ms: number;
  data: Record<string, unknown> | null;
  error: string | null;
}
