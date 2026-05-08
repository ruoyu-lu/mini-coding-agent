import { realpath } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { z } from 'zod';
import { globPatternToRegExp, isPathInside, shouldSkipPath, toPortablePath, walkFiles } from './fs-utils.js';
import type { MiniTool } from './tool.js';

const defaultMaxResults = 200;

const globInputSchema = z.object({
  pattern: z.string().min(1).describe('Glob pattern for files to find, for example "src/**/*.ts".'),
  maxResults: z
    .number()
    .int()
    .positive()
    .max(1000)
    .optional()
    .describe('Optional maximum number of matching file paths to return.'),
});

export const globTool: MiniTool<typeof globInputSchema> = {
  id: 'glob',
  description:
    'Find project files by glob pattern. Use this to discover file paths before reading specific files.',
  inputSchema: globInputSchema,
  execute: async ({ pattern, maxResults }, context) => {
    const projectRoot = await realpath(context.cwd);
    const requestedRoot = resolve(projectRoot);

    if (!isPathInside(projectRoot, requestedRoot)) {
      throw new Error('Glob search must stay inside the current project.');
    }

    const limit = maxResults ?? defaultMaxResults;
    const patternRegExp = globPatternToRegExp(pattern);
    const matches: string[] = [];

    for await (const filePath of walkFiles(requestedRoot)) {
      const relativePath = relative(projectRoot, filePath);
      if (shouldSkipPath(relativePath)) continue;

      const portablePath = toPortablePath(relativePath);
      if (!patternRegExp.test(portablePath)) continue;

      matches.push(portablePath);
      if (matches.length >= limit) break;
    }

    return {
      pattern,
      matches,
      count: matches.length,
      truncated: matches.length >= limit,
    };
  },
};
