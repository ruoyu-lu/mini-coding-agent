import OpenAI from 'openai';

const defaultBaseUrl = 'https://api.deepseek.com';
const defaultModel = 'deepseek-v4-pro';

function getEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function resolveLlmConfig() {
  const baseURL = getEnv('OPENAI_BASE_URL') ?? getEnv('DEEPSEEK_BASE_URL') ?? defaultBaseUrl;
  const apiKey = getEnv('OPENAI_API_KEY') ?? getEnv('DEEPSEEK_API_KEY');
  const model = getEnv('OPENAI_MODEL') ?? getEnv('DEEPSEEK_MODEL') ?? defaultModel;

  if (!apiKey) {
    throw new Error('Missing API key. Run /login or set OPENAI_API_KEY/DEEPSEEK_API_KEY.');
  }

  return { baseURL, apiKey, model };
}

function getTextContent(content: OpenAI.Chat.Completions.ChatCompletionMessage['content']) {
  return content ?? '';
}

export async function generateAgentResponse(userInput: string) {
  const { baseURL, apiKey, model } = resolveLlmConfig();
  const openai = new OpenAI({ baseURL, apiKey });

  const request = {
    messages: [
      { role: 'system', content: 'You are a helpful coding assistant.' },
      { role: 'user', content: userInput },
    ],
    model,
    thinking: { type: 'enabled' },
    reasoning_effort: 'high',
    stream: false,
  };

  const completion = await openai.chat.completions.create(
    request as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  );

  return getTextContent(completion.choices[0]?.message.content);
}
