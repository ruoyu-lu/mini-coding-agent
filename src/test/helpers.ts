import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestContext } from 'node:test';

export async function createTempDir(t: TestContext, prefix = 'minicode-test-') {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  return directory;
}

export function captureConsoleLog(t: TestContext) {
  const originalLog = console.log;
  const messages: string[] = [];

  console.log = (...args: unknown[]) => {
    messages.push(args.map(String).join(' '));
  };

  t.after(() => {
    console.log = originalLog;
  });

  return messages;
}

export function restoreProcessEnv(t: TestContext, keys: string[]) {
  const previousValues = new Map<string, string | undefined>();

  for (const key of keys) {
    previousValues.set(key, process.env[key]);
  }

  t.after(() => {
    for (const [key, value] of previousValues) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}
