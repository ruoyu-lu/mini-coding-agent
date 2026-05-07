import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { createTempDir } from '../../test/helpers.js';
import { grepTool } from './grep.js';

type GrepResult = {
  pattern: string;
  include: string;
  matches: Array<{ path: string; line: number; column: number; text: string }>;
  count: number;
  truncated: boolean;
};

test('grepTool finds case-insensitive text matches by default', async (t) => {
  const cwd = await createTempDir(t);
  await mkdir(join(cwd, 'src'));
  await writeFile(join(cwd, 'src', 'index.ts'), 'const answer = 42;\nconsole.log(answer);\n');

  const result = (await grepTool.execute({ pattern: 'ANSWER', include: 'src/**/*.ts' }, { cwd })) as GrepResult;

  assert.deepEqual(result.matches, [
    { path: 'src/index.ts', line: 1, column: 7, text: 'const answer = 42;' },
    { path: 'src/index.ts', line: 2, column: 13, text: 'console.log(answer);' },
  ]);
  assert.equal(result.count, 2);
  assert.equal(result.truncated, false);
});

test('grepTool supports case-sensitive regular expressions', async (t) => {
  const cwd = await createTempDir(t);
  await writeFile(join(cwd, 'notes.txt'), 'TODO: first\ntodo: second\n');

  const result = (await grepTool.execute(
    { pattern: '^TODO', include: '*.txt', caseSensitive: true, useRegex: true },
    { cwd },
  )) as GrepResult;

  assert.deepEqual(result.matches, [{ path: 'notes.txt', line: 1, column: 1, text: 'TODO: first' }]);
});

test('grepTool skips binary and blocked files', async (t) => {
  const cwd = await createTempDir(t);
  await mkdir(join(cwd, 'node_modules', 'pkg'), { recursive: true });
  await writeFile(join(cwd, 'binary.txt'), 'match\0ignored');
  await writeFile(join(cwd, '.env'), 'MATCH=secret\n');
  await writeFile(join(cwd, 'node_modules', 'pkg', 'file.txt'), 'match\n');

  const result = (await grepTool.execute({ pattern: 'match', include: '**/*.txt' }, { cwd })) as GrepResult;

  assert.deepEqual(result.matches, []);
});

test('grepTool truncates long matching lines', async (t) => {
  const cwd = await createTempDir(t);
  await writeFile(join(cwd, 'large.txt'), `${'x'.repeat(510)} needle\n`);

  const result = (await grepTool.execute({ pattern: 'needle', include: '*.txt' }, { cwd })) as GrepResult;

  assert.equal(result.matches[0]?.text.length, 503);
  assert.equal(result.matches[0]?.text.endsWith('...'), true);
});

test('grepTool respects maxResults', async (t) => {
  const cwd = await createTempDir(t);
  await writeFile(join(cwd, 'notes.txt'), 'match one\nmatch two\n');

  const result = (await grepTool.execute({ pattern: 'match', include: '*.txt', maxResults: 1 }, { cwd })) as GrepResult;

  assert.equal(result.matches.length, 1);
  assert.equal(result.truncated, true);
});

test('grepTool reports invalid regular expressions', async (t) => {
  const cwd = await createTempDir(t);

  await assert.rejects(
    grepTool.execute({ pattern: '[', useRegex: true }, { cwd }),
    /Invalid grep pattern/,
  );
});
