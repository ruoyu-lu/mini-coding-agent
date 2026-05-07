import assert from 'node:assert/strict';
import test from 'node:test';
import { createAgentTools, miniTools } from '../index.js';

test('miniTools exports the built-in project tools in command order', () => {
  assert.deepEqual(
    miniTools.map((tool) => tool.id),
    ['read', 'glob', 'grep'],
  );
});

test('createAgentTools resolves all built-in tools', () => {
  const tools = createAgentTools();

  assert.deepEqual(Object.keys(tools), ['read', 'glob', 'grep']);
});
