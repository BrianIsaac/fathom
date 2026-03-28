import { config } from 'dotenv';
config({ path: '.env.local' });

import { synthesise, synthesiseDD, synthesiseEarnings, synthesiseRegulatory } from '../lib/openai/synthesise';
import { DDSynthesisSchema } from '../lib/schemas/dd';
import { readFileSync } from 'fs';
import { join } from 'path';

const mockDir = join(process.cwd(), 'public', 'mock');

async function testBaseSynthesise() {
  console.log('\n--- Test 1: Base synthesise() ---');
  const result = await synthesise<{ answer: string }>(
    'You are a helpful assistant. Respond only with valid JSON.',
    'What is 2+2? Return JSON: {"answer": "4"}',
  );
  console.log('Result:', result);
  console.log('Has answer key:', 'answer' in result);
  console.log('PASS:', result.answer === '4');
}

async function testSynthesiseDD() {
  console.log('\n--- Test 2: synthesiseDD() ---');
  const ddData = JSON.parse(readFileSync(join(mockDir, 'dd-grab.json'), 'utf-8'));
  const sourceResults = Object.entries(ddData.sources).map(([id, src]: [string, any]) => ({
    source_id: id,
    source_name: id,
    status: src.status as 'success' | 'failed' | 'timeout' | 'blocked',
    latency_ms: src.latency_ms,
    data: src.data,
    error: null,
  }));

  const result = await synthesiseDD('Grab Holdings', sourceResults);
  console.log('Result:', JSON.stringify(result, null, 2));

  const parsed = DDSynthesisSchema.safeParse(result);
  console.log('Schema valid:', parsed.success);
  if (!parsed.success) console.log('Errors:', parsed.error.issues);
}

async function testSynthesiseEarnings() {
  console.log('\n--- Test 3: synthesiseEarnings() ---');
  const earningsData = JSON.parse(readFileSync(join(mockDir, 'earnings.json'), 'utf-8'));
  const grabEarnings = earningsData.earnings.find((e: any) => e.ticker === 'GRAB');

  const sourceResults = [{
    source_id: 'yahoo_finance',
    source_name: 'Yahoo Finance',
    status: 'success' as const,
    latency_ms: 5000,
    data: grabEarnings.financials,
    error: null,
  }];

  const result = await synthesiseEarnings('GRAB', sourceResults);
  console.log('Result:', JSON.stringify(result, null, 2));
  console.log('Has ticker:', 'ticker' in (result as any));
  console.log('Has financials:', 'financials' in (result as any));
}

async function testSynthesiseRegulatory() {
  console.log('\n--- Test 4: synthesiseRegulatory() ---');
  const regData = JSON.parse(readFileSync(join(mockDir, 'regulatory.json'), 'utf-8'));

  const result = await synthesiseRegulatory(
    ['digital payments', 'retail FX', 'insurance'],
    regData.publications,
  );
  console.log('Result:', JSON.stringify(result, null, 2));

  const hasSynthesis = result && typeof result === 'object' && 'synthesis' in result;
  console.log('Has synthesis:', hasSynthesis);
  if (hasSynthesis) {
    const syn = (result as any).synthesis;
    console.log('Has urgent_actions:', Array.isArray(syn.urgent_actions));
    console.log('Has monitoring_items:', Array.isArray(syn.monitoring_items));
    console.log('Has informational:', Array.isArray(syn.informational));
  }
}

async function main() {
  console.log('=== GPT Synthesis Tests ===');
  console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);

  try {
    await testBaseSynthesise();
  } catch (e) {
    console.error('Test 1 FAILED:', e);
  }

  try {
    await testSynthesiseDD();
  } catch (e) {
    console.error('Test 2 FAILED:', e);
  }

  try {
    await testSynthesiseEarnings();
  } catch (e) {
    console.error('Test 3 FAILED:', e);
  }

  try {
    await testSynthesiseRegulatory();
  } catch (e) {
    console.error('Test 4 FAILED:', e);
  }

  console.log('\n=== All tests complete ===');
}

main();
