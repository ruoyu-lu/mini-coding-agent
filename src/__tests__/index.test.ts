import assert from 'node:assert/strict';
import { symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { createTempDir } from '../test/helpers.js';
import { createProgram, isMainModuleUrl } from '../index.js';

test('createProgram configures the CLI name, description, and version', () => {
  const program = createProgram();

  assert.equal(program.name(), 'minicode');
  assert.equal(program.description(), 'A small interactive coding agent CLI.');
  assert.equal(program.version(), '1.0.0');
});

test('createProgram registers init and login subcommands', () => {
  const program = createProgram();

  assert.deepEqual(
    program.commands.map((command) => command.name()),
    ['init', 'login'],
  );
});

test('isMainModuleUrl matches direct entrypoint paths', async (t) => {
  const directory = await createTempDir(t);
  const entryPoint = join(directory, 'index.js');
  await writeFile(entryPoint, 'export {};\n');

  assert.equal(isMainModuleUrl(pathToFileURL(entryPoint).href, entryPoint), true);
});

test('isMainModuleUrl matches symlinked entrypoint paths by realpath', async (t) => {
  const directory = await createTempDir(t);
  const entryPoint = join(directory, 'index.js');
  const symlinkPath = join(directory, 'minicode');
  await writeFile(entryPoint, 'export {};\n');
  await symlink(entryPoint, symlinkPath);

  assert.equal(isMainModuleUrl(pathToFileURL(entryPoint).href, symlinkPath), true);
});

test('isMainModuleUrl rejects missing and different entrypoints', async (t) => {
  const directory = await createTempDir(t);
  const entryPoint = join(directory, 'index.js');
  const otherEntryPoint = join(directory, 'other.js');
  await writeFile(entryPoint, 'export {};\n');
  await writeFile(otherEntryPoint, 'export {};\n');

  assert.equal(isMainModuleUrl(pathToFileURL(entryPoint).href, undefined), false);
  assert.equal(isMainModuleUrl(pathToFileURL(entryPoint).href, otherEntryPoint), false);
  assert.equal(isMainModuleUrl(pathToFileURL(entryPoint).href, resolve(directory, 'missing.js')), false);
});
