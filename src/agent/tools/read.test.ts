import assert from 'node:assert/strict';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { createTempDir } from '../../test/helpers.js';
import { readTool } from './read.js';

type ReadResult = {
  path: string;
  startLine: number;
  endLine: number;
  totalLines: number;
  truncated: boolean;
  content: string;
};

test('readTool reads a whole project file', async (t) => {
  const cwd = await createTempDir(t);
  await writeFile(join(cwd, 'notes.txt'), 'one\ntwo\nthree\n');

  const result = (await readTool.execute({ path: 'notes.txt' }, { cwd })) as ReadResult;

  assert.deepEqual(result, {
    path: 'notes.txt',
    startLine: 1,
    endLine: 4,
    totalLines: 4,
    truncated: false,
    content: 'one\ntwo\nthree\n',
  });
});

test('readTool reads an inclusive line range', async (t) => {
  const cwd = await createTempDir(t);
  await writeFile(join(cwd, 'notes.txt'), 'one\ntwo\nthree\n');

  const result = (await readTool.execute({ path: 'notes.txt', startLine: 2, endLine: 3 }, { cwd })) as ReadResult;

  assert.equal(result.startLine, 2);
  assert.equal(result.endLine, 3);
  assert.equal(result.content, 'two\nthree');
});

test('readTool blocks paths outside the project', async (t) => {
  const cwd = await createTempDir(t);
  const outside = await createTempDir(t);
  await writeFile(join(outside, 'secret.txt'), 'secret\n');

  await assert.rejects(
    readTool.execute({ path: join(outside, 'secret.txt') }, { cwd }),
    /inside the current project/,
  );
});

test('readTool blocks symlinks that resolve outside the project', async (t) => {
  const cwd = await createTempDir(t);
  const outside = await createTempDir(t);
  await writeFile(join(outside, 'secret.txt'), 'secret\n');
  await symlink(join(outside, 'secret.txt'), join(cwd, 'linked-secret.txt'));

  await assert.rejects(
    readTool.execute({ path: 'linked-secret.txt' }, { cwd }),
    /inside the current project/,
  );
});

test('readTool blocks secret and generated output paths', async (t) => {
  const cwd = await createTempDir(t);
  await writeFile(join(cwd, '.env'), 'OPENAI_API_KEY=secret\n');

  await assert.rejects(readTool.execute({ path: '.env' }, { cwd }), /Reading \.env is blocked/);
});

test('readTool requires a file path', async (t) => {
  const cwd = await createTempDir(t);
  await mkdir(join(cwd, 'src'));

  await assert.rejects(readTool.execute({ path: 'src' }, { cwd }), /must point to a file/);
});

test('readTool rejects an invalid line range', async (t) => {
  const cwd = await createTempDir(t);
  await writeFile(join(cwd, 'notes.txt'), 'one\ntwo\n');

  await assert.rejects(
    readTool.execute({ path: 'notes.txt', startLine: 3, endLine: 2 }, { cwd }),
    /startLine must be less than or equal to endLine/,
  );
});

test('readTool truncates very large output', async (t) => {
  const cwd = await createTempDir(t);
  await writeFile(join(cwd, 'large.txt'), 'x'.repeat(40_010));

  const result = (await readTool.execute({ path: 'large.txt' }, { cwd })) as ReadResult;

  assert.equal(result.content.length, 40_000);
  assert.equal(result.truncated, true);
});

test('readTool input schema rejects invalid line ranges before execution', () => {
  assert.equal(readTool.inputSchema.safeParse({ path: 'file.txt', startLine: 0 }).success, false);
  assert.equal(readTool.inputSchema.safeParse({ path: 'file.txt', startLine: 1.5 }).success, false);
  assert.equal(readTool.inputSchema.safeParse({ path: 'file.txt', endLine: -1 }).success, false);
  assert.equal(readTool.inputSchema.safeParse({ startLine: 1 }).success, false);
  assert.equal(readTool.inputSchema.safeParse({ path: 'file.txt', startLine: 1, endLine: 2 }).success, true);
});
