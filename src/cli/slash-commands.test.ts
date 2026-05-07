import assert from 'node:assert/strict';
import test from 'node:test';
import { captureConsoleLog, createRandomString, createSeededRandom } from '../test/helpers.js';
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

test('slash command parser fuzz: arbitrary input never throws', () => {
  const random = createSeededRandom(0x5eed);
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 /?._-\t\n';

  for (let index = 0; index < 500; index += 1) {
    const input = createRandomString(random, alphabet, 80);

    assert.doesNotThrow(() => parseSlashInput(input), `parseSlashInput threw for ${JSON.stringify(input)}`);
    assert.doesNotThrow(() => normalizeSlashInput(input), `normalizeSlashInput threw for ${JSON.stringify(input)}`);
    assert.doesNotThrow(() => getSlashCommandMatches(input), `getSlashCommandMatches threw for ${JSON.stringify(input)}`);
    assert.doesNotThrow(() => findSlashCommand(input), `findSlashCommand threw for ${JSON.stringify(input)}`);
    assert.doesNotThrow(() => findExactSlashCommand(input), `findExactSlashCommand threw for ${JSON.stringify(input)}`);
  }
});

test('slash command parser property: non-slash input never parses as a command', () => {
  const random = createSeededRandom(0x51a57);
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ?._-\t\n';

  for (let index = 0; index < 300; index += 1) {
    const input = createRandomString(random, alphabet, 80);
    if (input.trimStart().startsWith('/')) continue;

    assert.equal(parseSlashInput(input), null);
    assert.equal(normalizeSlashInput(input), '');
    assert.deepEqual(getSlashCommandMatches(input), []);
  }
});

test('slash command parser property: parsed command names are lowercase and whitespace-free', () => {
  const random = createSeededRandom(0x10ad);
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 /?._-\t\n';

  for (let index = 0; index < 300; index += 1) {
    const input = `/${createRandomString(random, alphabet, 80)}`;
    const parsed = parseSlashInput(input);

    assert.notEqual(parsed, null);
    assert.equal(parsed?.commandName, parsed?.commandName.toLowerCase());
    assert.equal(/\s/.test(parsed?.commandName ?? ''), false);
  }
});
