import { tool } from 'ai';
import type { ToolSet } from 'ai';
import type { ZodType } from 'zod';
import type { MiniTool, ToolContext } from './types.js';

export function createToolContext(): ToolContext {
  return {
    cwd: process.cwd(),
  };
}

export function resolveAgentTools(tools: MiniTool<ZodType>[], context: ToolContext): ToolSet {
  return Object.fromEntries(
    tools.map((item) => [
      item.id,
      tool({
        description: item.description,
        inputSchema: item.inputSchema,
        execute(input) {
          return item.execute(input, context);
        },
      }),
    ]),
  );
}
