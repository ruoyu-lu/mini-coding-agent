import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgram } from './index.js';

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
