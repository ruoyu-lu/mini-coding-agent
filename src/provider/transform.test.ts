import assert from 'node:assert/strict';
import test from 'node:test';
import { getProviderOptions } from './transform.js';

test('getProviderOptions returns an empty provider option object for regular models', () => {
  assert.deepEqual(getProviderOptions('openaiCompatible', 'gpt-4.1'), {
    openaiCompatible: {},
  });
});

test('getProviderOptions enables deepseek reasoning options for deepseek models', () => {
  assert.deepEqual(getProviderOptions('openaiCompatible', 'deepseek-reasoner'), {
    openaiCompatible: {
      reasoningEffort: 'high',
      thinking: { type: 'enabled' },
    },
  });
});
