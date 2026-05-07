import { readFile, realpath } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { z } from 'zod';
import {
  escapeRegExp,
  globPatternToRegExp,
  isPathInside,
  shouldSkipPath,
  toPortablePath,
  walkFiles,
} from './fs-utils.js';
import type { MiniTool } from './tool.js';

const defaultIncludePattern = '**/*';
const defaultMaxResults = 200;
const maxLineCharacters = 500;

const grepInputSchema = z.object({
  pattern: z.string().min(1).describe('Text or regular expression pattern to search for.'),
  include: z
    .string()
    .min(1)
    .optional()
    .describe('Optional glob pattern limiting files to search, for example "src/**/*.ts".'),
  caseSensitive: z.boolean().optional().describe('Whether matching should be case-sensitive. Defaults to false.'),
  useRegex: z.boolean().optional().describe('Treat pattern as a JavaScript regular expression. Defaults to false.'),
  maxResults: z
    .number()
    .int()
    .positive()
    .max(1000)
    .optional()
    .describe('Optional maximum number of matching lines to return.'),
});

function createSearchRegExp(pattern: string, caseSensitive: boolean, useRegex: boolean) {
  const source = useRegex ? pattern : escapeRegExp(pattern);
  const flags = caseSensitive ? 'g' : 'gi';

  try {
    return new RegExp(source, flags);
  } catch (error) {
    throw new Error(`Invalid grep pattern: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

function truncateLine(line: string) {
  return line.length > maxLineCharacters ? `${line.slice(0, maxLineCharacters)}...` : line;
}

function isProbablyBinary(content: string) {
  return content.includes('\0');
}

export const grepTool: MiniTool<typeof grepInputSchema> = {
  id: 'grep',
  description:
    'Search project files for matching text or regular expressions. Use this to find symbols, strings, errors, and references before reading files.',
  inputSchema: grepInputSchema,
  execute: async ({ pattern, include, caseSensitive, useRegex, maxResults }, context) => {
    const projectRoot = await realpath(context.cwd);
    const requestedRoot = resolve(projectRoot);

    if (!isPathInside(projectRoot, requestedRoot)) {
      throw new Error('Grep search must stay inside the current project.');
    }

    const includeRegExp = globPatternToRegExp(include ?? defaultIncludePattern);
    const searchRegExp = createSearchRegExp(pattern, caseSensitive ?? false, useRegex ?? false);
    const limit = maxResults ?? defaultMaxResults;
    const matches: Array<{ path: string; line: number; column: number; text: string }> = [];

    for await (const filePath of walkFiles(requestedRoot)) {
      const relativePath = relative(projectRoot, filePath);
      if (shouldSkipPath(relativePath)) continue;

      const portablePath = toPortablePath(relativePath);
      if (!includeRegExp.test(portablePath)) continue;

      let content: string;
      try {
        content = await readFile(filePath, 'utf8');
      } catch {
        continue;
      }

      if (isProbablyBinary(content)) continue;

      const lines = content.split(/\r?\n/);
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        searchRegExp.lastIndex = 0;
        const match = searchRegExp.exec(line);
        if (!match) continue;

        matches.push({
          path: portablePath,
          line: lineIndex + 1,
          column: match.index + 1,
          text: truncateLine(line),
        });

        if (matches.length >= limit) {
          return {
            pattern,
            include: include ?? defaultIncludePattern,
            matches,
            count: matches.length,
            truncated: true,
          };
        }
      }
    }

    return {
      pattern,
      include: include ?? defaultIncludePattern,
      matches,
      count: matches.length,
      truncated: false,
    };
  },
};
