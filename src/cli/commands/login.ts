import { isCancel, password, text } from '@clack/prompts';
import pc from 'picocolors';
import { readUserEnv, userEnvPath, writeUserEnv } from '../../config/user-env.js';

export function validateBaseUrl(value: string | undefined) {
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

export function validateRequired(label: string) {
  return (value: string | undefined) => {
    if (!value?.trim()) return `${label} is required.`;
    return undefined;
  };
}

type LoginCommandDependencies = {
  readUserEnv: typeof readUserEnv;
  writeUserEnv: typeof writeUserEnv;
  text: typeof text;
  password: typeof password;
  isCancel: typeof isCancel;
  userEnvPath: string;
  log: (message: string) => void;
};

const defaultLoginCommandDependencies: LoginCommandDependencies = {
  readUserEnv,
  writeUserEnv,
  text,
  password,
  isCancel,
  userEnvPath,
  log: console.log,
};

function cancelLogin(log: (message: string) => void) {
  log(pc.yellow('Login cancelled.'));
}

export async function runLoginCommand(dependencies: Partial<LoginCommandDependencies> = {}) {
  const {
    readUserEnv: readEnv,
    writeUserEnv: writeEnv,
    text: promptText,
    password: promptPassword,
    isCancel: isPromptCancel,
    userEnvPath: envPath,
    log,
  } = { ...defaultLoginCommandDependencies, ...dependencies };

  const existingUserEnv = await readEnv();

  const baseUrl = await promptText({
    message: 'OpenAI-compatible base URL',
    placeholder: 'https://api.openai.com/v1',
    initialValue: process.env.OPENAI_BASE_URL ?? existingUserEnv.OPENAI_BASE_URL,
    validate: validateBaseUrl,
  });

  if (isPromptCancel(baseUrl)) {
    cancelLogin(log);
    return;
  }

  const apiKey = await promptPassword({
    message: 'API key',
    validate: validateRequired('API key'),
  });

  if (isPromptCancel(apiKey)) {
    cancelLogin(log);
    return;
  }

  const model = await promptText({
    message: 'Model name',
    placeholder: 'gpt-4.1',
    initialValue: process.env.OPENAI_MODEL ?? existingUserEnv.OPENAI_MODEL,
    validate: validateRequired('Model name'),
  });

  if (isPromptCancel(model)) {
    cancelLogin(log);
    return;
  }

  await writeEnv({
    OPENAI_BASE_URL: baseUrl,
    OPENAI_API_KEY: apiKey,
    OPENAI_MODEL: model,
  });

  process.env.OPENAI_BASE_URL = baseUrl;
  process.env.OPENAI_API_KEY = apiKey;
  process.env.OPENAI_MODEL = model;

  log(pc.green(`OpenAI-compatible login saved to ${envPath}.`));
}
