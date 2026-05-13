import { lstat, realpath, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { z } from 'zod';
import { getBlockedPathPart, isPathInside, toPortablePath } from '../workspace/fs-utils.js';
import type { MiniTool } from './tool.js';

function getPreReadInstruction() {
  return ' Before replacing a file, read it first so you understand the current contents.';
}

function assertWritablePath(projectRoot: string, filePath: string) {
  const relativePath = relative(projectRoot, filePath);
  const blockedPathPart = getBlockedPathPart(relativePath);

  if (!isPathInside(projectRoot, filePath)) {
    throw new Error('Write path must be inside the current project.');
  }

  if (blockedPathPart) {
    throw new Error(`Writing ${blockedPathPart} is blocked because it may contain secrets or generated output.`);
  }
}

async function getExistingPathType(filePath: string) {
  try {
    return await lstat(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

const writeInputSchema = z.object({
  path: z.string().min(1).describe('File path to write, relative to the current project when possible.'),
  content: z.string().describe('Complete UTF-8 file contents to write.'),
});

export const writeTool: MiniTool<typeof writeInputSchema> = {
  id: 'write',
  description: `Replace the complete UTF-8 contents of an existing project file. This tool will fail if the file does not already exist.${getPreReadInstruction()} Prefer the Edit tool for modifying part of a file - it only sends the diff. Use shell commands to create, remove, or move files and directories. Only use this tool for complete rewrites of existing files. NEVER create documentation files (*.md) or README files unless explicitly requested by the User. Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.`,
  inputSchema: writeInputSchema,
  execute: async ({ path, content }, context) => {
    const projectRoot = await realpath(context.cwd);
    const filePath = resolve(projectRoot, path);

    assertWritablePath(projectRoot, filePath);

    const existingPath = await getExistingPathType(filePath);
    if (!existingPath) {
      throw new Error('Write path must already exist. Use shell commands to create files or directories first.');
    }

    if (existingPath?.isDirectory()) {
      throw new Error('Write path must point to a file.');
    }

    if (existingPath?.isSymbolicLink()) {
      throw new Error('Write path must not be a symbolic link.');
    }

    const realFilePath = await realpath(filePath);
    assertWritablePath(projectRoot, realFilePath);

    await writeFile(realFilePath, content, 'utf8');

    return {
      path: toPortablePath(relative(projectRoot, realFilePath)),
      bytes: Buffer.byteLength(content, 'utf8'),
      overwritten: true,
    };
  },
};
