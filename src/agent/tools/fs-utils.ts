import { readdir } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const blockedPathParts = new Set(['.minicode', 'node_modules', 'dist']);

export function toPortablePath(filePath: string) {
  return filePath.split(sep).join('/');
}

export function isPathInside(parent: string, child: string) {
  const pathToChild = relative(parent, child);
  return pathToChild === '' || (!pathToChild.startsWith('..') && !isAbsolute(pathToChild));
}

function isBlockedPathPart(part: string) {
  const normalizedPart = part.toLowerCase();
  return normalizedPart.startsWith('.env') || blockedPathParts.has(normalizedPart);
}

export function getBlockedPathPart(relativePath: string) {
  return relativePath.split(sep).find(isBlockedPathPart);
}

export function shouldSkipPath(relativePath: string) {
  return getBlockedPathPart(relativePath) !== undefined;
}

export async function* walkFiles(directoryPath: string): AsyncGenerator<string> {
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

export function escapeRegExp(value: string) {
  return value.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function globPatternToRegExp(pattern: string) {
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
