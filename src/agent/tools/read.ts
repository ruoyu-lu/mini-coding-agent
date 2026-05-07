import { readFile, realpath, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { z } from 'zod';
import { getBlockedPathPart, isPathInside } from './fs-utils.js';
import type { MiniTool } from './tool.js';

const maxOutputCharacters = 40_000;

function assertReadablePath(projectRoot: string, filePath: string) {
  const relativePath = relative(projectRoot, filePath);
  const blockedPathPart = getBlockedPathPart(relativePath);

  if (!isPathInside(projectRoot, filePath)) {
    throw new Error('Read path must be inside the current project.');
  }

  if (blockedPathPart) {
    throw new Error(`Reading ${blockedPathPart} is blocked because it may contain secrets or generated output.`);
  }
}

function normalizeLineRange(totalLines: number, startLine?: number, endLine?: number) {
  const start = Math.max(1, startLine ?? 1);
  const end = Math.min(totalLines, endLine ?? totalLines);

  if (start > end) {
    throw new Error('startLine must be less than or equal to endLine.');
  }

  return { start, end };
}

const readInputSchema = z.object({
  path: z.string().describe('File path to read, relative to the current project when possible.'),
  startLine: z.number().int().positive().optional().describe('Optional 1-based first line to include.'),
  endLine: z.number().int().positive().optional().describe('Optional 1-based last line to include.'),
});

export const readTool: MiniTool<typeof readInputSchema> = {
  id: 'read',
  description:
    'Read a UTF-8 text file from the current project. Use this before answering questions about specific files.',
  inputSchema: readInputSchema,
  execute: async ({ path, startLine, endLine }, context) => {
    const projectRoot = await realpath(context.cwd);
    const requestedPath = resolve(projectRoot, path);
    const filePath = await realpath(requestedPath);

    assertReadablePath(projectRoot, filePath);

    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error('Read path must point to a file.');
    }

    const rawContent = await readFile(filePath, 'utf8');
    const lines = rawContent.split(/\r?\n/);
    const { start, end } = normalizeLineRange(lines.length, startLine, endLine);
    const rangedContent = lines.slice(start - 1, end).join('\n');
    const content =
      rangedContent.length > maxOutputCharacters
        ? rangedContent.slice(0, maxOutputCharacters)
        : rangedContent;

    return {
      path: relative(projectRoot, filePath),
      startLine: start,
      endLine: end,
      totalLines: lines.length,
      truncated: content.length < rangedContent.length,
      content,
    };
  },
};
