import { tool } from 'ai';
import type { ToolSet } from 'ai';
import type { z } from 'zod';

export type ToolContext = {
  cwd: string;
};

export type MiniTool<InputSchema extends z.ZodType> = {
  id: string;
  description: string;
  inputSchema: InputSchema;
  execute: (input: z.output<InputSchema>, context: ToolContext) => Promise<unknown>;
};

export function createToolContext(): ToolContext {
  return {
    cwd: process.cwd(),
  };
}

export function resolveAgentTools(tools: MiniTool<z.ZodType>[], context: ToolContext): ToolSet {
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
