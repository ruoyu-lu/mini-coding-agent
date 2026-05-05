import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import pc from 'picocolors';

const appDirName = '.minicode';

const defaultConfig = {
  version: 1,
  model: null,
  memory: true,
};

const defaultMemory = {
  entries: [],
};

function isFileExistsError(error: unknown) {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'EEXIST'
  );
}

export async function createJsonFile(path: string, data: unknown) {
  try {
    await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    console.log(pc.green(`created ${path}`));
  } catch (error) {
    if (isFileExistsError(error)) {
      console.log(pc.yellow(`skipped ${path} already exists`));
      return;
    }

    throw error;
  }
}

export async function initProject(projectRoot = process.cwd()) {
  const appDir = join(projectRoot, appDirName);

  await mkdir(appDir, { recursive: true, mode: 0o700 });
  await chmod(appDir, 0o700);
  await createJsonFile(join(appDir, 'config.json'), defaultConfig);
  await createJsonFile(join(appDir, 'memory.json'), defaultMemory);
}
