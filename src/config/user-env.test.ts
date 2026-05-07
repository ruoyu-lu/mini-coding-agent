import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import test from 'node:test';
import { createTempDir, restoreProcessEnv } from '../test/helpers.js';

type UserEnvModule = typeof import('./user-env.js');

async function importFreshUserEnv(configHome: string): Promise<UserEnvModule> {
  process.env.XDG_CONFIG_HOME = configHome;
  return import(`./user-env.js?test=${randomUUID()}`);
}

test('userEnvPath is resolved from XDG_CONFIG_HOME at import time', async (t) => {
  restoreProcessEnv(t, ['XDG_CONFIG_HOME']);
  const configHome = await createTempDir(t);
  const userEnv = await importFreshUserEnv(configHome);

  assert.equal(userEnv.userEnvPath, join(configHome, 'minicode', '.env'));
});

test('readUserEnv returns an empty object when the file does not exist', async (t) => {
  restoreProcessEnv(t, ['XDG_CONFIG_HOME']);
  const configHome = await createTempDir(t);
  const userEnv = await importFreshUserEnv(configHome);

  assert.deepEqual(await userEnv.readUserEnv(), {});
});

test('writeUserEnv creates, serializes, and merges user env values', async (t) => {
  restoreProcessEnv(t, ['XDG_CONFIG_HOME']);
  const configHome = await createTempDir(t);
  const userEnv = await importFreshUserEnv(configHome);

  await userEnv.writeUserEnv({
    OPENAI_BASE_URL: 'https://api.example.test/v1',
    OPENAI_API_KEY: 'secret with spaces',
  });
  await userEnv.writeUserEnv({
    OPENAI_MODEL: 'gpt-test',
  });

  assert.deepEqual(await userEnv.readUserEnv(), {
    OPENAI_BASE_URL: 'https://api.example.test/v1',
    OPENAI_API_KEY: 'secret with spaces',
    OPENAI_MODEL: 'gpt-test',
  });
  assert.equal(
    await readFile(userEnv.userEnvPath, 'utf8'),
    'OPENAI_BASE_URL=https://api.example.test/v1\nOPENAI_API_KEY="secret with spaces"\nOPENAI_MODEL=gpt-test\n',
  );
});

test('loadUserEnv loads the configured env file', async (t) => {
  restoreProcessEnv(t, ['XDG_CONFIG_HOME', 'OPENAI_MODEL']);
  delete process.env.OPENAI_MODEL;
  const configHome = await createTempDir(t);
  const userEnv = await importFreshUserEnv(configHome);

  await mkdir(dirname(userEnv.userEnvPath), { recursive: true });
  await writeFile(userEnv.userEnvPath, 'OPENAI_MODEL=gpt-loaded\n');
  userEnv.loadUserEnv();

  assert.equal(process.env.OPENAI_MODEL, 'gpt-loaded');
});
