import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function collectTestFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const testFiles = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      testFiles.push(...await collectTestFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      testFiles.push(entryPath);
    }
  }

  return testFiles;
}

const testFiles = (await collectTestFiles('src')).sort();

if (testFiles.length === 0) {
  console.error('No test files found.');
  process.exit(1);
}

const child = spawn(process.execPath, ['--import', 'tsx', '--test', ...testFiles], {
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
