import type { EvalTask, EvalResult, EvalRun } from './types';
import { executeTinyFishSync } from '../tinyfish/client';
import { scoreTask } from './scorer';

/**
 * Classifies an error into a failure category.
 *
 * Args:
 *   error: The error to classify.
 *
 * Returns:
 *   A failure category string.
 */
function classifyError(error: unknown): 'anti_bot' | 'timeout' | 'extraction_error' | 'site_changed' | 'grader_error' {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('BLOCKED') || msg.includes('blocked') || msg.includes('CAPTCHA')) return 'anti_bot';
  if (msg.includes('TIMEOUT') || msg.includes('timeout')) return 'timeout';
  if (msg.includes('site_changed') || msg.includes('not found')) return 'site_changed';
  return 'extraction_error';
}

/**
 * Aggregates individual eval results into a summary run object.
 *
 * Args:
 *   results: Array of individual task results.
 *   tasks: Array of task definitions.
 *
 * Returns:
 *   Complete eval run summary with module breakdowns and failure categories.
 */
function aggregateResults(results: EvalResult[], tasks: EvalTask[]): EvalRun {
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.length - passed;

  const byModule: Record<string, { tasks: number; passed: number; pass_rate: number; avg_accuracy: number }> = {};
  const modules = [...new Set(tasks.map(t => t.module))];

  for (const mod of modules) {
    const modResults = results.filter(r => {
      const task = tasks.find(t => t.task_id === r.task_id);
      return task?.module === mod;
    });
    const modPassed = modResults.filter(r => r.status === 'passed').length;
    byModule[mod] = {
      tasks: modResults.length,
      passed: modPassed,
      pass_rate: modResults.length > 0 ? modPassed / modResults.length : 0,
      avg_accuracy: modResults.length > 0 ? modResults.reduce((s, r) => s + r.accuracy, 0) / modResults.length : 0,
    };
  }

  const byFailureCategory: Record<string, number> = {};
  for (const r of results) {
    if (r.failure_category) {
      byFailureCategory[r.failure_category] = (byFailureCategory[r.failure_category] ?? 0) + 1;
    }
  }

  return {
    eval_run_id: `eval_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)}`,
    generated_at: new Date().toISOString(),
    total_tasks: tasks.length,
    total_trials: results.length,
    passed,
    failed,
    pass_rate: results.length > 0 ? passed / results.length : 0,
    avg_latency_ms: results.length > 0 ? results.reduce((s, r) => s + r.latency_ms, 0) / results.length : 0,
    avg_accuracy: results.length > 0 ? results.reduce((s, r) => s + r.accuracy, 0) / results.length : 0,
    total_cost_steps: results.reduce((s, r) => s + (r.steps_used ?? 0), 0),
    results,
    by_module: byModule,
    by_failure_category: byFailureCategory,
  };
}

/**
 * Runs the full eval suite across all tasks.
 *
 * Args:
 *   tasks: Array of eval task definitions.
 *   trials: Number of trials per task.
 *
 * Returns:
 *   Complete eval run with all results and aggregated metrics.
 */
export async function runEvalSuite(
  tasks: EvalTask[],
  trials: number = 1,
): Promise<EvalRun> {
  const results: EvalResult[] = [];

  for (const task of tasks) {
    for (let trial = 1; trial <= trials; trial++) {
      const startTime = Date.now();

      try {
        const response = await executeTinyFishSync(
          task.tinyfish_config.url,
          task.tinyfish_config.goal,
          task.tinyfish_config.browser_profile,
        );

        const latency_ms = Date.now() - startTime;
        const actual = response.result ?? {};
        const { accuracy, field_scores } = scoreTask(task, actual);

        results.push({
          task_id: task.task_id,
          trial,
          status: accuracy >= task.pass_threshold ? 'passed' : 'failed',
          accuracy,
          latency_ms,
          steps_used: response.steps_used ?? null,
          fields_expected: Object.keys(task.graders).length,
          fields_correct: Object.values(field_scores).filter(f => f.score === 1).length,
          fields_missing: Object.values(field_scores).filter(f => f.score === 0).length,
          field_scores,
          error: null,
          failure_category: accuracy >= task.pass_threshold ? null : 'extraction_error',
        });
      } catch (error) {
        results.push({
          task_id: task.task_id,
          trial,
          status: 'error',
          accuracy: 0,
          latency_ms: Date.now() - startTime,
          steps_used: null,
          fields_expected: Object.keys(task.graders).length,
          fields_correct: 0,
          fields_missing: Object.keys(task.graders).length,
          field_scores: {},
          error: error instanceof Error ? error.message : String(error),
          failure_category: classifyError(error),
        });
      }
    }
  }

  return aggregateResults(results, tasks);
}
