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
