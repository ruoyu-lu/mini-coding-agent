import { lstat, mkdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { z } from 'zod';
import { getBlockedPathPart, isPathInside, toPortablePath } from '../workspace/fs-utils.js';
import type { MiniTool } from './tool.js';

function getPreReadInstruction() {
  return ' Before overwriting an existing file, read it first so you understand the current contents.';
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
  description: `Write complete UTF-8 content to a project file. This tool will overwrite the existing file if there is one at the provided path.${getPreReadInstruction()} Prefer the Edit tool for modifying existing files - it only sends the diff. Only use this tool to create new files or for complete rewrites. NEVER create documentation files (*.md) or README files unless explicitly requested by the User. Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.`,
  inputSchema: writeInputSchema,
  execute: async ({ path, content }, context) => {
    const projectRoot = await realpath(context.cwd);
    const filePath = resolve(projectRoot, path);

    assertWritablePath(projectRoot, filePath);

    const existingPath = await getExistingPathType(filePath);
    if (existingPath?.isDirectory()) {
      throw new Error('Write path must point to a file.');
    }

    if (existingPath?.isSymbolicLink()) {
      throw new Error('Write path must not be a symbolic link.');
    }

    const parentPath = dirname(filePath);
    await mkdir(parentPath, { recursive: true });
    const realParentPath = await realpath(parentPath);

    // Guard against symlinked parent directories escaping the project.
    assertWritablePath(projectRoot, realParentPath);

    await writeFile(filePath, content, 'utf8');

    return {
      path: toPortablePath(relative(projectRoot, filePath)),
      bytes: Buffer.byteLength(content, 'utf8'),
      overwritten: existingPath !== null,
    };
  },
};
