import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { createTempDir } from '../../test/helpers.js';
import { globTool } from './glob.js';

type GlobResult = {
  pattern: string;
  matches: string[];
  count: number;
  truncated: boolean;
};

async function createProjectFiles(cwd: string) {
  await mkdir(join(cwd, 'src', 'agent'), { recursive: true });
  await mkdir(join(cwd, 'dist'), { recursive: true });
  await mkdir(join(cwd, 'node_modules', 'pkg'), { recursive: true });
  await writeFile(join(cwd, 'src', 'index.ts'), 'export {};\n');
  await writeFile(join(cwd, 'src', 'agent', 'llm.ts'), 'export {};\n');
  await writeFile(join(cwd, 'README.md'), '# Readme\n');
  await writeFile(join(cwd, 'dist', 'index.js'), 'ignored\n');
  await writeFile(join(cwd, 'node_modules', 'pkg', 'index.ts'), 'ignored\n');
}

test('globTool returns matching project paths in portable form', async (t) => {
  const cwd = await createTempDir(t);
  await createProjectFiles(cwd);

  const result = (await globTool.execute({ pattern: 'src/**/*.ts' }, { cwd })) as GlobResult;

  assert.equal(result.pattern, 'src/**/*.ts');
  assert.deepEqual(result.matches.sort(), ['src/agent/llm.ts', 'src/index.ts']);
  assert.equal(result.count, 2);
  assert.equal(result.truncated, false);
});

test('globTool skips blocked output and dependency directories', async (t) => {
  const cwd = await createTempDir(t);
  await createProjectFiles(cwd);

  const result = (await globTool.execute({ pattern: '**/*.ts' }, { cwd })) as GlobResult;

  assert.equal(result.matches.includes('node_modules/pkg/index.ts'), false);
  assert.equal(result.matches.includes('dist/index.js'), false);
});

test('globTool respects maxResults', async (t) => {
  const cwd = await createTempDir(t);
  await createProjectFiles(cwd);

  const result = (await globTool.execute({ pattern: '**/*', maxResults: 1 }, { cwd })) as GlobResult;

  assert.equal(result.matches.length, 1);
  assert.equal(result.count, 1);
  assert.equal(result.truncated, true);
});
