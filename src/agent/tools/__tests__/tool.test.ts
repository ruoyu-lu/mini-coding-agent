import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import type { MiniTool } from '../tool.js';
import { createToolContext, resolveAgentTools, runMiniTool } from '../tool.js';

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

test('runMiniTool validates input before executing the selected tool', async () => {
  let executeCount = 0;

  await assert.rejects(
    runMiniTool(
      [
        {
          id: 'count',
          description: 'Count things.',
          inputSchema: z.object({ limit: z.number().int().positive().max(10) }),
          async execute(input) {
            executeCount += 1;
            return input;
          },
        },
      ],
      { toolName: 'count', input: { limit: 11 } },
      { cwd: '/tmp/project' },
    ),
    /Invalid input for tool "count": limit: Too big/,
  );

  assert.equal(executeCount, 0);
});

test('runMiniTool passes parsed input to the selected tool', async () => {
  const inputSchema = z.object({ limit: z.coerce.number().int().positive() });
  const countTool: MiniTool<typeof inputSchema> = {
    id: 'count',
    description: 'Count things.',
    inputSchema,
    async execute(input) {
      return { limit: input.limit, limitType: typeof input.limit };
    },
  };

  const result = await runMiniTool(
    [countTool],
    { toolName: 'count', input: { limit: '3' } },
    { cwd: '/tmp/project' },
  );

  assert.deepEqual(result, { limit: 3, limitType: 'number' });
});
