import assert from 'node:assert/strict';
import test from 'node:test';
import { captureConsoleLog } from '../test/helpers.js';
import {
  findExactSlashCommand,
  findSlashCommand,
  getSlashCommandMatches,
  handleSlashCommand,
  normalizeSlashInput,
  parseSlashInput,
  scoreCommandTerm,
  showSlashCommandHelp,
} from './slash-commands.js';

test('parseSlashInput parses slash command names and args', () => {
  assert.equal(parseSlashInput('hello'), null);
  assert.deepEqual(parseSlashInput('/login'), { commandName: 'login', args: '' });
  assert.deepEqual(parseSlashInput('  ///INIT now'), { commandName: 'init', args: 'now' });
  assert.deepEqual(parseSlashInput('/help with extra words'), {
    commandName: 'help',
    args: 'with extra words',
  });
});

test('normalizeSlashInput returns the parsed command name or empty string', () => {
  assert.equal(normalizeSlashInput('/LoGiN'), 'login');
  assert.equal(normalizeSlashInput('plain text'), '');
});

test('scoreCommandTerm ranks exact, prefix, substring, and fuzzy matches', () => {
  assert.equal(scoreCommandTerm('login', 'login'), 100);
  assert.equal(scoreCommandTerm('log', 'login') > scoreCommandTerm('ogi', 'login'), true);
  assert.equal(scoreCommandTerm('og', 'login') > scoreCommandTerm('lg', 'login'), true);
  assert.equal(scoreCommandTerm('xyz', 'login'), 0);
});

test('getSlashCommandMatches returns suggestions for incomplete slash input', () => {
  assert.deepEqual(
    getSlashCommandMatches('/lo').map((command) => command.name),
    ['login'],
  );
  assert.deepEqual(
    getSlashCommandMatches('/').map((command) => command.name),
    ['init', 'login', 'help', 'exit'],
  );
  assert.deepEqual(getSlashCommandMatches('/login now'), []);
});

test('findSlashCommand and findExactSlashCommand resolve aliases', () => {
  assert.equal(findSlashCommand('/?')?.name, 'help');
  assert.equal(findExactSlashCommand('/q')?.name, 'exit');
  assert.equal(findExactSlashCommand('/does-not-exist'), null);
});

test('showSlashCommandHelp prints all slash commands', (t) => {
  const logs = captureConsoleLog(t);

  showSlashCommandHelp();

  assert.match(logs.join('\n'), /Available slash commands/);
  assert.match(logs.join('\n'), /\/init/);
  assert.match(logs.join('\n'), /\/login/);
  assert.match(logs.join('\n'), /\/help/);
  assert.match(logs.join('\n'), /\/exit/);
});

test('handleSlashCommand ignores non-slash input', async () => {
  assert.deepEqual(await handleSlashCommand('plain text'), { handled: false, shouldExit: false });
});

test('handleSlashCommand executes exit aliases', async () => {
  assert.deepEqual(await handleSlashCommand('/quit'), { handled: true, shouldExit: true });
});

test('handleSlashCommand handles unknown slash commands with help', async (t) => {
  const logs = captureConsoleLog(t);

  assert.deepEqual(await handleSlashCommand('/missing'), { handled: true, shouldExit: false });
  assert.match(logs.join('\n'), /Unknown command: \/missing/);
  assert.match(logs.join('\n'), /Available slash commands/);
});
