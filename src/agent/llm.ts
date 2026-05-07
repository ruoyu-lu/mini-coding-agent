import { streamText, stepCountIs } from 'ai';
import type { ModelMessage } from 'ai';
import { agentSystemPrompt, createSingleTurnMessages } from './prompt.js';
import { createAgentTools } from './tools/index.js';
import { getLanguageModel } from '../provider/provider.js';
import { getProviderOptions } from '../provider/transform.js';

export type StreamAgentResponseOptions = {
  messages?: ModelMessage[];
  onTextDelta: (text: string) => void;
  onError?: (error: unknown) => void;
};

export async function streamAgentResponse(userInput: string, options: StreamAgentResponseOptions) {
  const { model, providerName, modelName } = getLanguageModel();

  const result = streamText({
    model,
    system: agentSystemPrompt,
    messages: options.messages ?? createSingleTurnMessages(userInput),
    tools: createAgentTools(),
    stopWhen: stepCountIs(3),
    providerOptions: getProviderOptions(providerName, modelName),
    onError({ error }) {
      options.onError?.(error);
    },
  });

  let text = '';

  for await (const textDelta of result.textStream) {
    text += textDelta;
    options.onTextDelta(textDelta);
  }

  return text;
}

export async function generateAgentResponse(userInput: string) {
  return streamAgentResponse(userInput, {
    onTextDelta() {},
  });
}
