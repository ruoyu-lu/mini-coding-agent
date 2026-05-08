import assert from 'node:assert/strict';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { captureConsoleLog, createTempDir } from '../../test/helpers.js';
import { createJsonFile, initProject } from '../project.js';

test('createJsonFile writes pretty JSON with a trailing newline', async (t) => {
  const directory = await createTempDir(t);
  const filePath = join(directory, 'config.json');
  const logs = captureConsoleLog(t);

  await createJsonFile(filePath, { version: 1, memory: true });

  assert.equal(await readFile(filePath, 'utf8'), '{\n  "version": 1,\n  "memory": true\n}\n');
  assert.equal(logs.length, 1);
  assert.match(logs[0], /created .*config\.json/);
});

test('createJsonFile skips existing files without overwriting them', async (t) => {
  const directory = await createTempDir(t);
  const filePath = join(directory, 'memory.json');
  const logs = captureConsoleLog(t);

  await createJsonFile(filePath, { entries: ['existing'] });
  await createJsonFile(filePath, { entries: [] });

  assert.equal(await readFile(filePath, 'utf8'), '{\n  "entries": [\n    "existing"\n  ]\n}\n');
  assert.match(logs[1], /skipped .*memory\.json already exists/);
});

test('initProject creates the local app directory and default files', async (t) => {
  const directory = await createTempDir(t);
  captureConsoleLog(t);

  await initProject(directory);

  const appDirectory = join(directory, '.minicode');
  assert.equal((await stat(appDirectory)).isDirectory(), true);
  assert.equal(await readFile(join(appDirectory, 'config.json'), 'utf8'), '{\n  "version": 1,\n  "model": null,\n  "memory": true\n}\n');
  assert.equal(await readFile(join(appDirectory, 'memory.json'), 'utf8'), '{\n  "entries": []\n}\n');
});

test('initProject preserves existing default files', async (t) => {
  const directory = await createTempDir(t);
  const appDirectory = join(directory, '.minicode');
  captureConsoleLog(t);
  await mkdir(appDirectory);
  await createJsonFile(join(appDirectory, 'config.json'), { version: 99 });

  await initProject(directory);

  assert.equal(await readFile(join(appDirectory, 'config.json'), 'utf8'), '{\n  "version": 99\n}\n');
});
