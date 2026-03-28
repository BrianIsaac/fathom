import { config } from 'dotenv';
config({ path: '.env.local' });

import { sendSlackMessage } from '../lib/actions/slack';
import { sendTelegram } from '../lib/actions/telegram';
import { sendEmail } from '../lib/actions/email';
import { dispatchActions } from '../lib/actions/dispatcher';
import type { Agent } from '../lib/agents/types';

const SAMPLE_DATA = {
  title: 'MAS Consultation Paper on Digital Payment Token Services',
  summary: 'New AML/CFT requirements for DPT providers. Comment deadline: 25 Apr 2026.',
  regulator: 'MAS',
  jurisdiction: 'SG',
  relevance_score: 9,
};

async function testSlack() {
  console.log('\n--- Test: sendSlackMessage ---');
  const result = await sendSlackMessage(
    { template: 'Fathom Alert: {title}\n{summary}' },
    SAMPLE_DATA,
  );
  console.log('Result:', result);
  console.log('PASS:', result.success === true);
}

async function testTelegram() {
  console.log('\n--- Test: sendTelegram ---');
  const result = await sendTelegram(
    { chat_id: '348165044', template: '*Fathom Alert*\n{title}\n\n{summary}' },
    SAMPLE_DATA,
  );
  console.log('Result:', result);
  console.log('PASS:', result.success === true);
}

async function testEmail() {
  console.log('\n--- Test: sendEmail ---');
  try {
    const result = await sendEmail(
      { to: 'brian.isaac.kam@gmail.com', subject: 'Fathom Alert: {title}', template: '<h2>{title}</h2><p>{summary}</p>' },
      SAMPLE_DATA,
    );
    console.log('Result:', result);
    console.log('PASS:', result.success === true);
  } catch (e: any) {
    console.log('EXPECTED FAIL (domain not verified):', e.message ?? e);
  }
}

async function testSlackBadWebhook() {
  console.log('\n--- Test: Slack status check on bad URL ---');
  const original = process.env.SLACK_WEBHOOK_URL;
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/INVALID/INVALID/INVALID';
  const result = await sendSlackMessage({ template: 'test' }, {});
  process.env.SLACK_WEBHOOK_URL = original;
  console.log('Result:', result);
  console.log('PASS (success=false):', result.success === false);
}

async function testTelegramBadToken() {
  console.log('\n--- Test: Telegram status check on bad token ---');
  const original = process.env.TELEGRAM_BOT_TOKEN;
  process.env.TELEGRAM_BOT_TOKEN = 'INVALID_TOKEN';
  const result = await sendTelegram({ chat_id: '348165044', template: 'test' }, {});
  process.env.TELEGRAM_BOT_TOKEN = original;
  console.log('Result:', result);
  console.log('PASS (success=false):', result.success === false);
}

async function testDispatchActions() {
  console.log('\n--- Test: dispatchActions (full pipeline) ---');
  const mockAgent: Agent = {
    id: 'test-agent-1',
    name: 'Test Regulatory Agent',
    module: 'regulatory',
    enabled: true,
    conditions: {
      operator: 'all',
      checks: [{ fact: 'relevance_score', operator: 'greaterThan', value: 5 }],
    },
    actions: [
      { type: 'slack', config: { template: '[dispatchActions test] {title}' } },
      { type: 'telegram', config: { chat_id: '348165044', template: '[dispatchActions test] {title}' } },
    ],
    fish_config: { species: 'clownfish', colour: 'auto', accessory: 'none' },
    fish_sprite: '',
    created_at: new Date().toISOString(),
    last_triggered: null,
  };

  const results = await dispatchActions(mockAgent, SAMPLE_DATA);
  console.log('Results:', JSON.stringify(results, null, 2));
  console.log('All succeeded:', results.every(r => r.success));
  console.log('PASS:', results.length === 2 && results.every(r => r.success));
}

async function main() {
  console.log('=== Action Sender Tests ===');

  const tests = [testSlack, testTelegram, testEmail, testSlackBadWebhook, testTelegramBadToken, testDispatchActions];
  for (const test of tests) {
    try { await test(); } catch (e: any) { console.log('CRASHED:', e.message ?? e); }
  }

  console.log('\n=== All action tests complete ===');
}

main();
