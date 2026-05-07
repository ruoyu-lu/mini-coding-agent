import dotenv from 'dotenv';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const appConfigDir = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'minicode');
export const userEnvPath = join(appConfigDir, '.env');

export function loadUserEnv() {
  if (!existsSync(userEnvPath)) return;
  dotenv.config({ path: userEnvPath, quiet: true });
}

function escapeEnvValue(value: string) {
  if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

function serializeEnv(values: Record<string, string>) {
  return `${Object.entries(values)
    .map(([key, value]) => `${key}=${escapeEnvValue(value)}`)
    .join('\n')}\n`;
}

export async function readUserEnv() {
  try {
    const rawEnv = await readFile(userEnvPath, 'utf8');
    return dotenv.parse(rawEnv);
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return {};
    }

    throw error;
  }
}

export async function writeUserEnv(updates: Record<string, string>) {
  const currentEnv = await readUserEnv();
  const nextEnv = { ...currentEnv, ...updates };

  await mkdir(dirname(userEnvPath), { recursive: true });
  await writeFile(userEnvPath, serializeEnv(nextEnv), { mode: 0o600 });
  await chmod(userEnvPath, 0o600);
}
