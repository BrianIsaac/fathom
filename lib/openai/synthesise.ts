import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { DD_SYNTHESIS_PROMPT, EARNINGS_SYNTHESIS_PROMPT, REGULATORY_SYNTHESIS_PROMPT } from './prompts';
import type { DDSynthesis } from '../schemas/dd';
import type { ParallelResult } from '../tinyfish/types';

/**
 * Synthesises structured output from TinyFish extraction results using GPT.
 *
 * Args:
 *   systemPrompt: The system prompt defining the synthesis role and output format.
 *   userPrompt: The user prompt containing extracted data to synthesise.
 *   model: OpenAI model ID to use.
 *
 * Returns:
 *   Parsed JSON object from the GPT response.
 */
export async function synthesise<T>(
  systemPrompt: string,
  userPrompt: string,
  model: string = 'gpt-4o-mini',
): Promise<T> {
  const { text } = await generateText({
    model: openai(model),
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 2000,
    temperature: 0.2,
  });

  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ?? [null, text];
  const jsonStr = jsonMatch[1] ?? text;

  return JSON.parse(jsonStr.trim()) as T;
}

/**
 * Synthesises a DD risk brief from parallel source results.
 *
 * Args:
 *   company: Company name.
 *   sourceResults: Array of parallel extraction results.
 *
 * Returns:
 *   Structured DD synthesis with risk score, red flags, and citations.
 */
export async function synthesiseDD(
  company: string,
  sourceResults: ParallelResult[],
): Promise<DDSynthesis> {
  const prompt = DD_SYNTHESIS_PROMPT
    .replace('{company_name}', company)
    .replace('{source_results_json}', JSON.stringify(sourceResults, null, 2));

  return synthesise<DDSynthesis>(
    'You are a financial due diligence analyst. Respond only with valid JSON matching the specified schema.',
    prompt,
    'gpt-4o',
  );
}

/**
 * Synthesises an earnings summary from parallel source results.
 *
 * Args:
 *   ticker: Stock ticker symbol.
 *   sourceResults: Array of parallel extraction results.
 *
 * Returns:
 *   Structured earnings summary.
 */
export async function synthesiseEarnings(
  ticker: string,
  sourceResults: ParallelResult[],
) {
  const prompt = EARNINGS_SYNTHESIS_PROMPT
    .replace('{ticker}', ticker)
    .replace('{source_results_json}', JSON.stringify(sourceResults, null, 2));

  return synthesise(
    'You are a financial analyst. Respond only with valid JSON matching the specified schema.',
    prompt,
    'gpt-4o-mini',
  );
}

/**
 * Synthesises a regulatory relevance brief from publication data.
 *
 * Args:
 *   businessDomains: Array of business domain strings.
 *   publications: Array of publication objects.
 *
 * Returns:
 *   Structured regulatory synthesis with urgency categorisation.
 */
export async function synthesiseRegulatory(
  businessDomains: string[],
  publications: Record<string, unknown>[],
) {
  const prompt = REGULATORY_SYNTHESIS_PROMPT
    .replace('{business_domains}', businessDomains.join(', '))
    .replace('{publications_json}', JSON.stringify(publications, null, 2));

  return synthesise(
    'You are a regulatory affairs analyst. Respond only with valid JSON matching the specified schema.',
    prompt,
    'gpt-4o',
  );
}
