import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { createToolContext, resolveAgentTools } from './tool.js';

test('createToolContext captures the current working directory', () => {
  assert.equal(createToolContext().cwd, process.cwd());
});

test('resolveAgentTools maps mini tools to AI SDK tool entries', async () => {
  const context = { cwd: '/tmp/project' };
  const tools = resolveAgentTools(
    [
      {
        id: 'echo',
        description: 'Echo input.',
        inputSchema: z.object({ value: z.string() }),
        async execute(input, toolContext) {
          return { input, cwd: toolContext.cwd };
        },
      },
    ],
    context,
  );

  assert.deepEqual(Object.keys(tools), ['echo']);

  const result = await tools.echo.execute?.({ value: 'hello' }, { toolCallId: 'call-1', messages: [] });
  assert.deepEqual(result, { input: { value: 'hello' }, cwd: '/tmp/project' });
});
