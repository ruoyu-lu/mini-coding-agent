import assert from 'node:assert/strict';
import type { ModelMessage } from 'ai';
import test from 'node:test';
import {
  agentSystemPrompt,
  createConversationMessages,
  createSingleTurnMessages,
  trimConversationHistory,
} from '../messages.js';

test('agentSystemPrompt tells the assistant to inspect files when needed', () => {
  assert.match(agentSystemPrompt, /Use available tools/);
});

test('createSingleTurnMessages creates a single user message', () => {
  assert.deepEqual(createSingleTurnMessages('hello'), [{ role: 'user', content: 'hello' }]);
});

test('createConversationMessages appends user input without mutating history', () => {
  const history: ModelMessage[] = [
    { role: 'user', content: 'first' },
    { role: 'assistant', content: 'reply' },
  ];

  const messages = createConversationMessages(history, 'next');

  assert.deepEqual(messages, [
    { role: 'user', content: 'first' },
    { role: 'assistant', content: 'reply' },
    { role: 'user', content: 'next' },
  ]);
  assert.equal(messages === history, false);
});

test('trimConversationHistory keeps the most recent twenty messages', () => {
  const history: ModelMessage[] = Array.from({ length: 25 }, (_, index) => ({
    role: 'user' as const,
    content: `message ${index + 1}`,
  }));

  const trimmed = trimConversationHistory(history);

  assert.equal(trimmed.length, 20);
  assert.equal(trimmed[0]?.content, 'message 6');
  assert.equal(trimmed.at(-1)?.content, 'message 25');
});

test('trimConversationHistory returns short histories unchanged', () => {
  const history: ModelMessage[] = [{ role: 'user', content: 'hello' }];

  assert.deepEqual(trimConversationHistory(history), history);
});
