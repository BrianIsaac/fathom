/**
 * Formats a template string by replacing {key} placeholders with data values.
 * Supports nested keys via dot notation (e.g. "synthesis.risk_score").
 *
 * Args:
 *   template: Template string with {key} placeholders.
 *   data: Data object to resolve placeholders from.
 *
 * Returns:
 *   The formatted string with placeholders replaced.
 */
export function formatTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = key.split('.').reduce<unknown>(
      (obj, k) => (obj && typeof obj === 'object') ? (obj as Record<string, unknown>)[k] : undefined,
      data,
    );
    return value !== undefined ? String(value) : `{${key}}`;
  });
}
