import { globTool } from './glob.js';
import { grepTool } from './grep.js';
import { readTool } from './read.js';
import { createToolContext, resolveAgentTools } from './runner.js';

export const miniTools = [readTool, globTool, grepTool];

export function createAgentTools() {
  return resolveAgentTools(miniTools, createToolContext());
}

export type { MiniTool, ToolContext } from './types.js';
