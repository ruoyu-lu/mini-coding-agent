import assert from 'node:assert/strict';
import type { ModelMessage } from 'ai';
import test from 'node:test';
import { trimConversationHistory } from '../interactive.js';

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
