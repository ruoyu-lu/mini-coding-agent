import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { createTempDir } from '../../test/helpers.js';
import {
  escapeRegExp,
  getBlockedPathPart,
  globPatternToRegExp,
  isPathInside,
  shouldSkipPath,
  toPortablePath,
  walkFiles,
} from './fs-utils.js';

test('toPortablePath converts platform separators to slash separators', () => {
  assert.equal(toPortablePath(join('src', 'agent', 'tools')), 'src/agent/tools');
});

test('isPathInside accepts descendants and rejects sibling paths', () => {
  const parent = resolve('/tmp/project');

  assert.equal(isPathInside(parent, resolve('/tmp/project/src/index.ts')), true);
  assert.equal(isPathInside(parent, resolve('/tmp/project')), true);
  assert.equal(isPathInside(parent, resolve('/tmp/project-other/index.ts')), false);
});

test('blocked path helpers detect secrets and generated paths', () => {
  assert.equal(getBlockedPathPart(join('src', 'index.ts')), undefined);
  assert.equal(getBlockedPathPart(join('.minicode', 'config.json')), '.minicode');
  assert.equal(getBlockedPathPart(join('nested', '.env.local')), '.env.local');
  assert.equal(getBlockedPathPart(join('node_modules', 'pkg', 'index.js')), 'node_modules');
  assert.equal(shouldSkipPath(join('dist', 'index.js')), true);
});

test('walkFiles recursively yields files while skipping blocked directories', async (t) => {
  const directory = await createTempDir(t);
  await mkdir(join(directory, 'src'), { recursive: true });
  await mkdir(join(directory, 'node_modules', 'pkg'), { recursive: true });
  await mkdir(join(directory, '.minicode'), { recursive: true });
  await writeFile(join(directory, 'src', 'index.ts'), 'export {};\n');
  await writeFile(join(directory, 'node_modules', 'pkg', 'index.js'), 'ignored\n');
  await writeFile(join(directory, '.env'), 'SECRET=1\n');
  await writeFile(join(directory, '.minicode', 'config.json'), '{}\n');

  const files: string[] = [];
  for await (const file of walkFiles(directory)) {
    files.push(toPortablePath(file.slice(directory.length + 1)));
  }

  assert.deepEqual(files, ['src/index.ts']);
});

test('escapeRegExp escapes regular expression metacharacters', () => {
  assert.equal(escapeRegExp('src/index.ts?'), 'src/index\\.ts\\?');
});

test('globPatternToRegExp supports common star and question mark patterns', () => {
  assert.equal(globPatternToRegExp('src/**/*.ts').test('src/index.ts'), true);
  assert.equal(globPatternToRegExp('src/**/*.ts').test('src/agent/tool.ts'), true);
  assert.equal(globPatternToRegExp('src/*.ts').test('src/agent/tool.ts'), false);
  assert.equal(globPatternToRegExp('src/file?.ts').test('src/file1.ts'), true);
  assert.equal(globPatternToRegExp('src/file?.ts').test('src/file10.ts'), false);
});
