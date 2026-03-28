/**
 * Builds a TinyFish goal string from a template and variable map.
 *
 * Args:
 *   template: Goal string with {variable} placeholders.
 *   vars: Key-value map of variables to substitute.
 *
 * Returns:
 *   The goal string with all variables replaced.
 */
export function buildGoal(
  template: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (goal, [key, value]) => goal.replaceAll(`{${key}}`, value),
    template,
  );
}
