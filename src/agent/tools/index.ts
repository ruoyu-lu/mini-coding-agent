import { globTool } from './glob.js';
import { readTool,  } from './read.js';
import { createToolContext, resolveAgentTools } from './tool.js';

export const miniTools = [readTool, globTool];

export function createAgentTools() {
  return resolveAgentTools(miniTools, createToolContext());
}

export type { MiniTool, ToolContext } from './tool.js';
