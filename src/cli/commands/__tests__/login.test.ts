import assert from 'node:assert/strict';
import test from 'node:test';
import { restoreProcessEnv } from '../../../test/helpers.js';
import { runLoginCommand, validateBaseUrl, validateRequired } from '../login.js';

const loginEnvKeys = ['OPENAI_BASE_URL', 'OPENAI_API_KEY', 'OPENAI_MODEL'];

function clearLoginEnv() {
  for (const key of loginEnvKeys) {
    delete process.env[key];
  }
}

test('validateBaseUrl requires an http or https URL', () => {
  assert.equal(validateBaseUrl(undefined), 'Base URL is required.');
  assert.equal(validateBaseUrl('not-a-url'), 'Enter a valid URL, for example https://api.openai.com/v1.');
  assert.equal(validateBaseUrl('ftp://example.test'), 'Base URL must start with http:// or https://.');
  assert.equal(validateBaseUrl('https://api.example.test/v1'), undefined);
});

test('validateRequired rejects empty input', () => {
  const validate = validateRequired('Model name');

  assert.equal(validate(undefined), 'Model name is required.');
  assert.equal(validate('   '), 'Model name is required.');
  assert.equal(validate('gpt-test'), undefined);
});

test('runLoginCommand writes prompted values and updates process env', async (t) => {
  restoreProcessEnv(t, loginEnvKeys);
  clearLoginEnv();
  const textValues = ['https://api.example.test/v1', 'gpt-test'];
  const writes: Array<Record<string, string>> = [];
  const logs: string[] = [];

  await runLoginCommand({
    readUserEnv: async () => ({}),
    writeUserEnv: async (updates) => {
      writes.push(updates);
    },
    text: async () => textValues.shift() ?? '',
    password: async () => 'secret-key',
    isCancel: (value: unknown): value is symbol => false,
    userEnvPath: '/tmp/minicode/.env',
    log: (message) => logs.push(message),
  });

  assert.deepEqual(writes, [
    {
      OPENAI_BASE_URL: 'https://api.example.test/v1',
      OPENAI_API_KEY: 'secret-key',
      OPENAI_MODEL: 'gpt-test',
    },
  ]);
  assert.equal(process.env.OPENAI_BASE_URL, 'https://api.example.test/v1');
  assert.equal(process.env.OPENAI_API_KEY, 'secret-key');
  assert.equal(process.env.OPENAI_MODEL, 'gpt-test');
  assert.match(logs[0] ?? '', /OpenAI-compatible login saved/);
});

test('runLoginCommand uses env values before existing saved values for prompt defaults', async (t) => {
  restoreProcessEnv(t, loginEnvKeys);
  clearLoginEnv();
  process.env.OPENAI_BASE_URL = 'https://env.example.test/v1';
  process.env.OPENAI_MODEL = 'env-model';
  const initialValues: Array<string | undefined> = [];
  const textValues = ['https://api.example.test/v1', 'gpt-test'];

  await runLoginCommand({
    readUserEnv: async () => ({
      OPENAI_BASE_URL: 'https://saved.example.test/v1',
      OPENAI_MODEL: 'saved-model',
    }),
    writeUserEnv: async () => {},
    text: async (options) => {
      initialValues.push(options.initialValue);
      return textValues.shift() ?? '';
    },
    password: async () => 'secret-key',
    isCancel: (value: unknown): value is symbol => false,
    log: () => {},
  });

  assert.deepEqual(initialValues, ['https://env.example.test/v1', 'env-model']);
});

test('runLoginCommand cancels without writing when a prompt is cancelled', async (t) => {
  restoreProcessEnv(t, loginEnvKeys);
  clearLoginEnv();
  const cancelToken = Symbol('cancelled');
  let didWrite = false;
  const logs: string[] = [];

  await runLoginCommand({
    readUserEnv: async () => ({}),
    writeUserEnv: async () => {
      didWrite = true;
    },
    text: async () => cancelToken,
    password: async () => 'secret-key',
    isCancel: (value: unknown): value is symbol => value === cancelToken,
    log: (message) => logs.push(message),
  });

  assert.equal(didWrite, false);
  assert.match(logs[0] ?? '', /Login cancelled/);
});
