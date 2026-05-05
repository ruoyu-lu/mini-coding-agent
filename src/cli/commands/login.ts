import { isCancel, password, text } from '@clack/prompts';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import pc from 'picocolors';

const appDirName = '.minicode';
const configFileName = 'config.json';

type MinicodeConfig = {
  version: number;
  model: string | null;
  memory: boolean;
  provider?: {
    type: 'openai';
    baseUrl: string;
    apiKey: string;
    model: string;
  };
};

const defaultConfig: MinicodeConfig = {
  version: 1,
  model: null,
  memory: true,
};

function asStringRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined;
}

function readExistingOpenAIProvider(config: MinicodeConfig) {
  return config.provider?.type === 'openai' ? config.provider : undefined;
}

async function readConfig(projectRoot = process.cwd()): Promise<MinicodeConfig> {
  const configPath = join(projectRoot, appDirName, configFileName);

  try {
    const rawConfig = await readFile(configPath, 'utf8');
    const parsedConfig = asStringRecord(JSON.parse(rawConfig));
    if (!parsedConfig) return defaultConfig;

    const provider = asStringRecord(parsedConfig.provider);
    const providerType = readString(provider?.type);

    return {
      version: typeof parsedConfig.version === 'number' ? parsedConfig.version : defaultConfig.version,
      model: readString(parsedConfig.model) ?? null,
      memory: readBoolean(parsedConfig.memory) ?? defaultConfig.memory,
      provider:
        providerType === 'openai'
          ? {
              type: 'openai',
              baseUrl: readString(provider?.baseUrl) ?? '',
              apiKey: readString(provider?.apiKey) ?? '',
              model: readString(provider?.model) ?? '',
            }
          : undefined,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return defaultConfig;
    }

    throw error;
  }
}

async function writeConfig(config: MinicodeConfig, projectRoot = process.cwd()) {
  const appDir = join(projectRoot, appDirName);
  const configPath = join(appDir, configFileName);

  await mkdir(appDir, { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  await chmod(configPath, 0o600);
}

function validateBaseUrl(value: string | undefined) {
  if (!value) return 'Base URL is required.';

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'Base URL must start with http:// or https://.';
    }
  } catch {
    return 'Enter a valid URL, for example https://api.openai.com/v1.';
  }

  return undefined;
}

function validateRequired(label: string) {
  return (value: string | undefined) => {
    if (!value?.trim()) return `${label} is required.`;
    return undefined;
  };
}

function cancelLogin() {
  console.log(pc.yellow('Login cancelled.'));
}

export async function runLoginCommand() {
  const existingConfig = await readConfig();
  const existingOpenAIProvider = readExistingOpenAIProvider(existingConfig);

  const baseUrl = await text({
    message: 'OpenAI-compatible base URL',
    placeholder: 'https://api.openai.com/v1',
    initialValue: existingOpenAIProvider?.baseUrl ?? process.env.OPENAI_BASE_URL,
    validate: validateBaseUrl,
  });

  if (isCancel(baseUrl)) {
    cancelLogin();
    return;
  }

  const apiKey = await password({
    message: 'API key',
    validate: validateRequired('API key'),
  });

  if (isCancel(apiKey)) {
    cancelLogin();
    return;
  }

  const model = await text({
    message: 'Model name',
    placeholder: 'gpt-4.1',
    initialValue: existingOpenAIProvider?.model ?? process.env.OPENAI_MODEL,
    validate: validateRequired('Model name'),
  });

  if (isCancel(model)) {
    cancelLogin();
    return;
  }

  const updatedConfig: MinicodeConfig = {
    ...existingConfig,
    model,
    provider: {
      type: 'openai',
      baseUrl,
      apiKey,
      model,
    },
  };

  await writeConfig(updatedConfig);

  process.env.OPENAI_BASE_URL = baseUrl;
  process.env.OPENAI_API_KEY = apiKey;
  process.env.OPENAI_MODEL = model;

  console.log(pc.green('OpenAI-compatible login saved to .minicode/config.json.'));
}
