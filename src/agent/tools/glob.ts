import { readdir, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import type { MiniTool } from './tool.js';

const defaultMaxResults = 200;
const blockedPathParts = new Set(['.env', '.minicode', 'node_modules', 'dist']);

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

function toPortablePath(filePath: string) {
  return filePath.split(sep).join('/');
}

function isPathInside(parent: string, child: string) {
  const pathToChild = relative(parent, child);
  return pathToChild === '' || (!pathToChild.startsWith('..') && !isAbsolute(pathToChild));
}

function shouldSkipPath(relativePath: string) {
  return relativePath.split(sep).some((part) => blockedPathParts.has(part));
}

async function* walkFiles(directoryPath: string): AsyncGenerator<string> {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    if (shouldSkipPath(entry.name)) continue;

    const entryPath = resolve(directoryPath, entry.name);

    if (entry.isDirectory()) {
      yield* walkFiles(entryPath);
      continue;
    }

    if (entry.isFile()) {
      yield entryPath;
    }
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[\\^$+?.()|[\]{}]/g, '\\$&');
}

function globPatternToRegExp(pattern: string) {
  const normalizedPattern = pattern.split(sep).join('/');
  let regex = '^';

  for (let index = 0; index < normalizedPattern.length; index += 1) {
    const char = normalizedPattern[index];
    const nextChar = normalizedPattern[index + 1];
    const afterNextChar = normalizedPattern[index + 2];

    if (char === '*') {
      if (nextChar === '*') {
        if (afterNextChar === '/') {
          regex += '(?:.*/)?';
          index += 2;
        } else {
          regex += '.*';
          index += 1;
        }

        continue;
      }

      regex += '[^/]*';
      continue;
    }

    if (char === '?') {
      regex += '[^/]';
      continue;
    }

    regex += escapeRegExp(char);
  }

  return new RegExp(`${regex}$`);
}

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
