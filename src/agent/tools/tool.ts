import { tool } from 'ai';
import type { ToolSet } from 'ai';
import type { output, ZodType } from 'zod';

export type ToolContext = {
  cwd: string;
};

export type MiniTool<InputSchema extends ZodType> = {
  id: string;
  description: string;
  inputSchema: InputSchema;
  execute: (input: output<InputSchema>, context: ToolContext) => Promise<unknown>;
};

export type ToolCallInput = {
  toolName: string;
  input: unknown;
};

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

export function resolveModelTools(tools: MiniTool<ZodType>[]): ToolSet {
  return Object.fromEntries(
    tools.map((item) => [
      item.id,
      tool({
        description: item.description,
        inputSchema: item.inputSchema,
      }),
    ]),
  );
}

export async function runMiniTool(
  tools: MiniTool<ZodType>[],
  toolCall: ToolCallInput,
  context: ToolContext,
) {
  const selectedTool = tools.find((item) => item.id === toolCall.toolName);

  if (!selectedTool) {
    throw new Error(`Unknown tool: ${toolCall.toolName}`);
  }

  return selectedTool.execute(toolCall.input, context);
}
