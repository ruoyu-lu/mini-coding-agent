import assert from 'node:assert/strict';
import test from 'node:test';
import { restoreProcessEnv } from '../../test/helpers.js';
import { getLanguageModel } from '../provider.js';

const providerEnvKeys = [
  'OPENAI_BASE_URL',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'DEEPSEEK_BASE_URL',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_MODEL',
];

function clearProviderEnv() {
  for (const key of providerEnvKeys) {
    delete process.env[key];
  }
}

test('getLanguageModel reports missing provider configuration in order', (t) => {
  restoreProcessEnv(t, providerEnvKeys);
  clearProviderEnv();

  assert.throws(() => getLanguageModel(), /Missing base URL/);

  process.env.OPENAI_BASE_URL = 'https://api.example.test/v1';
  assert.throws(() => getLanguageModel(), /Missing API key/);

  process.env.OPENAI_API_KEY = 'secret';
  assert.throws(() => getLanguageModel(), /Missing model/);
});

test('getLanguageModel trims env values and returns an OpenAI-compatible model config', (t) => {
  restoreProcessEnv(t, providerEnvKeys);
  clearProviderEnv();
  process.env.OPENAI_BASE_URL = ' https://api.example.test/v1 ';
  process.env.OPENAI_API_KEY = ' secret ';
  process.env.OPENAI_MODEL = ' gpt-test ';

  const config = getLanguageModel();

  assert.equal(config.providerName, 'openaiCompatible');
  assert.equal(config.modelName, 'gpt-test');
  assert.equal(typeof config.model, 'object');
});

test('getLanguageModel falls back to DeepSeek env names', (t) => {
  restoreProcessEnv(t, providerEnvKeys);
  clearProviderEnv();
  process.env.DEEPSEEK_BASE_URL = 'https://deepseek.example.test';
  process.env.DEEPSEEK_API_KEY = 'deepseek-secret';
  process.env.DEEPSEEK_MODEL = 'deepseek-chat';

  const config = getLanguageModel();

  assert.equal(config.modelName, 'deepseek-chat');
});
