import { sep } from 'node:path';

const blockedPathParts = new Set(['.minicode', 'node_modules', 'dist']);

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
