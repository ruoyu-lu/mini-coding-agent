import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const providerName = 'openaiCompatible';

export type LanguageModelConfig = {
  providerName: string;
  modelName: string;
  model: ReturnType<ReturnType<typeof createOpenAICompatible>>;
};

function getEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function resolveProviderConfig() {
  const baseURL = getEnv('OPENAI_BASE_URL') ?? getEnv('DEEPSEEK_BASE_URL');
  const apiKey = getEnv('OPENAI_API_KEY') ?? getEnv('DEEPSEEK_API_KEY');
  const modelName = getEnv('OPENAI_MODEL') ?? getEnv('DEEPSEEK_MODEL');

  if (!baseURL) {
    throw new Error('Missing base URL. Run /login or set OPENAI_BASE_URL/DEEPSEEK_BASE_URL.');
  }

  if (!apiKey) {
    throw new Error('Missing API key. Run /login or set OPENAI_API_KEY/DEEPSEEK_API_KEY.');
  }

  if (!modelName) {
    throw new Error('Missing model. Run /login or set OPENAI_MODEL/DEEPSEEK_MODEL.');
  }

  return { baseURL, apiKey, modelName };
}

export function getLanguageModel(): LanguageModelConfig {
  const { baseURL, apiKey, modelName } = resolveProviderConfig();
  const provider = createOpenAICompatible({
    name: providerName,
    baseURL,
    apiKey,
  });

  return {
    providerName,
    modelName,
    model: provider(modelName),
  };
}
