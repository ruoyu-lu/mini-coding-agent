import { streamText as aiStreamText, stepCountIs as aiStepCountIs } from 'ai';
import type { ModelMessage } from 'ai';
import { agentSystemPrompt, createSingleTurnMessages } from './messages.js';
import { createAgentTools } from '../tools/registry.js';
import { getLanguageModel } from '../llm/provider.js';
import { getProviderOptions } from '../llm/options.js';

export type StreamAgentResponseOptions = {
  messages?: ModelMessage[];
  onTextDelta: (text: string) => void;
  onError?: (error: unknown) => void;
};

type StreamAgentResponseDependencies = {
  getLanguageModel: typeof getLanguageModel;
  getProviderOptions: typeof getProviderOptions;
  createAgentTools: typeof createAgentTools;
  streamText: typeof aiStreamText;
  stepCountIs: typeof aiStepCountIs;
};

const defaultStreamAgentResponseDependencies: StreamAgentResponseDependencies = {
  getLanguageModel,
  getProviderOptions,
  createAgentTools,
  streamText: aiStreamText,
  stepCountIs: aiStepCountIs,
};

export async function streamAgentResponse(
  userInput: string,
  options: StreamAgentResponseOptions,
  dependencies: Partial<StreamAgentResponseDependencies> = {},
) {
  const {
    getLanguageModel: resolveLanguageModel,
    getProviderOptions: resolveProviderOptions,
    createAgentTools: resolveAgentTools,
    streamText,
    stepCountIs,
  } = { ...defaultStreamAgentResponseDependencies, ...dependencies };

  const { model, providerName, modelName } = resolveLanguageModel();

  const result = streamText({
    model,
    system: agentSystemPrompt,
    messages: options.messages ?? createSingleTurnMessages(userInput),
    tools: resolveAgentTools(),
    stopWhen: stepCountIs(3),
    providerOptions: resolveProviderOptions(providerName, modelName),
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

export async function generateAgentResponse(
  userInput: string,
  dependencies: Partial<StreamAgentResponseDependencies> = {},
) {
  return streamAgentResponse(userInput, {
    onTextDelta() {},
  }, dependencies);
}
