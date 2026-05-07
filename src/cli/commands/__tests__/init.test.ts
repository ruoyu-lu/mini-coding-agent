import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { captureConsoleLog, createTempDir } from '../../../test/helpers.js';
import { runInitCommand } from '../init.js';

test('runInitCommand initializes the current project and prints completion', async (t) => {
  const cwd = process.cwd();
  const directory = await createTempDir(t);
  const logs = captureConsoleLog(t);
  process.chdir(directory);
  t.after(() => {
    process.chdir(cwd);
  });

  await runInitCommand();

  assert.equal(await readFile(join(directory, '.minicode', 'config.json'), 'utf8'), '{\n  "version": 1,\n  "model": null,\n  "memory": true\n}\n');
  assert.match(logs.at(-1) ?? '', /Minicode initialized/);
});
