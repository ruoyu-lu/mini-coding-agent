import { isCancel, password, text } from '@clack/prompts';
import pc from 'picocolors';
import { readUserEnv, userEnvPath, writeUserEnv } from '../../config/user-env.js';

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
  const existingUserEnv = await readUserEnv();

  const baseUrl = await text({
    message: 'OpenAI-compatible base URL',
    placeholder: 'https://api.openai.com/v1',
    initialValue: process.env.OPENAI_BASE_URL ?? existingUserEnv.OPENAI_BASE_URL,
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
    initialValue: process.env.OPENAI_MODEL ?? existingUserEnv.OPENAI_MODEL,
    validate: validateRequired('Model name'),
  });

  if (isCancel(model)) {
    cancelLogin();
    return;
  }

  await writeUserEnv({
    OPENAI_BASE_URL: baseUrl,
    OPENAI_API_KEY: apiKey,
    OPENAI_MODEL: model,
  });

  process.env.OPENAI_BASE_URL = baseUrl;
  process.env.OPENAI_API_KEY = apiKey;
  process.env.OPENAI_MODEL = model;

  console.log(pc.green(`OpenAI-compatible login saved to ${userEnvPath}.`));
}
