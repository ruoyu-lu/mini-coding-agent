import { globTool } from './glob.js';
import { grepTool } from './grep.js';
import { readTool } from './read.js';
import { createToolContext, resolveAgentTools } from './tool.js';
import { writeTool } from './write.js';

export const miniTools = [readTool, globTool, grepTool, writeTool];

export function createAgentTools() {
  return resolveAgentTools(miniTools, createToolContext());
}

export type { MiniTool, ToolContext } from './tool.js';
