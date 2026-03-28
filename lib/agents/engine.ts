import type { Agent, ConditionCheck } from './types';

function resolveFact(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (obj, key) => (obj && typeof obj === 'object') ? (obj as Record<string, unknown>)[key] : undefined,
    data,
  );
}

function coerceToMatchType(factValue: unknown, checkValue: unknown): unknown {
  if (typeof factValue === 'number' && typeof checkValue === 'string') {
    const num = Number(checkValue);
    if (!isNaN(num)) return num;
  }
  if (typeof factValue === 'string' && typeof checkValue === 'number') {
    return String(checkValue);
  }
  return checkValue;
}

function evaluateCheck(check: ConditionCheck, factValue: unknown): boolean {
  const value = coerceToMatchType(factValue, check.value);

  switch (check.operator) {
    case 'equal':
      return factValue === value;
    case 'notEqual':
      return factValue !== value;
    case 'contains':
      if (Array.isArray(factValue)) return factValue.includes(value);
      if (typeof factValue === 'string') return factValue.includes(String(value));
      return false;
    case 'greaterThan':
      return typeof factValue === 'number' && factValue > Number(value);
    case 'lessThan':
      return typeof factValue === 'number' && factValue < Number(value);
    case 'in':
      if (Array.isArray(check.value)) return check.value.includes(String(factValue));
      return false;
    default:
      return false;
  }
}

/**
 * Evaluates an agent's conditions against a set of data facts.
 *
 * Args:
 *   agent: The agent to evaluate.
 *   facts: The data to evaluate against.
 *
 * Returns:
 *   True if the agent's conditions are satisfied.
 */
export function evaluateAgent(agent: Agent, facts: Record<string, unknown>): boolean {
  if (!agent.enabled) return false;

  const results = agent.conditions.checks.map(check => {
    const factValue = resolveFact(facts, check.fact);
    return evaluateCheck(check, factValue);
  });

  return agent.conditions.operator === 'all'
    ? results.every(Boolean)
    : results.some(Boolean);
}
