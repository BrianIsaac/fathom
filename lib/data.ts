import { readFile } from 'fs/promises';
import { join } from 'path';

const MOCK_FILES: Record<string, string> = {
  dd: 'dd-grab.json',
  earnings: 'earnings.json',
  regulatory: 'regulatory.json',
  eval: 'eval.json',
};

/**
 * Returns mock data from public/mock/ when NEXT_PUBLIC_USE_MOCK_DATA is set,
 * otherwise calls the real API endpoint.
 *
 * Args:
 *   module: The module key (dd, earnings, regulatory, eval).
 *   fetchFn: Async function that calls the real API and returns parsed data.
 *
 * Returns:
 *   Parsed JSON data from either mock files or the real API.
 */
export async function fetchOrMock<T>(
  module: keyof typeof MOCK_FILES,
  fetchFn: () => Promise<T>,
): Promise<T> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
    const filePath = join(process.cwd(), 'public', 'mock', MOCK_FILES[module]);
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  }

  return fetchFn();
}

/**
 * Checks whether the application is running in mock mode.
 *
 * Returns:
 *   True if NEXT_PUBLIC_USE_MOCK_DATA is set to 'true'.
 */
export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
}
