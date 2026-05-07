import assert from 'node:assert/strict';
import type { ModelMessage } from 'ai';
import test from 'node:test';
import { agentSystemPrompt, createConversationMessages, createSingleTurnMessages } from '../prompt.js';

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
