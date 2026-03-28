import type { FieldGrader, EvalTask } from './types';

/**
 * Resolves a dot-separated field path from an object.
 *
 * Args:
 *   obj: The object to traverse.
 *   path: Dot-separated path string.
 *
 * Returns:
 *   The resolved value, or undefined if not found.
 */
function resolveNestedField(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, key) => (acc && typeof acc === 'object') ? (acc as Record<string, unknown>)[key] : undefined,
    obj,
  );
}

/**
 * Scores a single field against its expected value using the specified grader.
 *
 * Args:
 *   grader: The grading strategy to apply.
 *   expected: The expected value.
 *   actual: The actual extracted value.
 *
 * Returns:
 *   Score between 0 and 1.
 */
export function scoreField(
  grader: FieldGrader,
  expected: unknown,
  actual: unknown,
): number {
  if (actual === null || actual === undefined) return 0;

  switch (grader.type) {
    case 'exact_string': {
      const exp = String(expected);
      const act = String(actual);
      return grader.case_sensitive
        ? exp === act ? 1 : 0
        : exp.toLowerCase() === act.toLowerCase() ? 1 : 0;
    }
    case 'numeric_tolerance': {
      const exp = Number(expected);
      const act = Number(actual);
      if (isNaN(exp) || isNaN(act)) return 0;
      const diff = Math.abs(exp - act);
      if (grader.tolerance_type === 'percentage') {
        return diff / Math.abs(exp) <= grader.tolerance ? 1 : 0;
      }
      return diff <= grader.tolerance ? 1 : 0;
    }
    case 'contains':
      return String(actual).toLowerCase().includes(String(expected).toLowerCase()) ? 1 : 0;
    case 'array_length_min':
      return Array.isArray(actual) && actual.length >= grader.min ? 1 : 0;
    case 'not_null':
      return 1;
    case 'date_match': {
      const expDate = new Date(String(expected)).toISOString().split('T')[0];
      const actDate = new Date(String(actual)).toISOString().split('T')[0];
      return expDate === actDate ? 1 : 0;
    }
    default:
      return 0;
  }
}

/**
 * Scores all fields of a task against actual output.
 *
 * Args:
 *   task: The eval task definition with graders and expected output.
 *   actual: The actual extracted data.
 *
 * Returns:
 *   Object with weighted accuracy and per-field scores.
 */
export function scoreTask(
  task: EvalTask,
  actual: Record<string, unknown>,
): { accuracy: number; field_scores: Record<string, { expected: unknown; actual: unknown; score: number; grader_type: string }> } {
  const field_scores: Record<string, { expected: unknown; actual: unknown; score: number; grader_type: string }> = {};
  let totalWeight = 0;
  let weightedScore = 0;

  for (const [field, grader] of Object.entries(task.graders)) {
    const expected = task.expected_output[field];
    const actualValue = resolveNestedField(actual, field);
    const score = scoreField(grader, expected, actualValue);

    field_scores[field] = {
      expected,
      actual: actualValue,
      score,
      grader_type: grader.type,
    };

    totalWeight += grader.weight;
    weightedScore += score * grader.weight;
  }

  const accuracy = totalWeight > 0 ? weightedScore / totalWeight : 0;
  return { accuracy, field_scores };
}
