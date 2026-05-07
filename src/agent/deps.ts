import { streamText } from 'ai';
import type { ModelMessage } from 'ai';
import { agentSystemPrompt } from './prompt.js';
import { miniTools } from './tools/index.js';
import { resolveModelTools } from './tools/tool.js';
import { getLanguageModel } from '../provider/provider.js';
import { getProviderOptions } from '../provider/transform.js';

export type CallModelInput = {
  messages: ModelMessage[];
  abortSignal?: AbortSignal;
};

export type CallModelResult = {
  fullStream: AsyncIterable<unknown>;
};

export type AgentLoopDependencies = {
  callModel: (input: CallModelInput) => CallModelResult | Promise<CallModelResult>;
};

export function callModel({ messages, abortSignal }: CallModelInput): CallModelResult {
  const { model, providerName, modelName } = getLanguageModel();

  return streamText({
    model,
    system: agentSystemPrompt,
    messages,
    tools: resolveModelTools(miniTools),
    providerOptions: getProviderOptions(providerName, modelName),
    abortSignal,
  });
}

export const defaultAgentLoopDependencies: AgentLoopDependencies = {
  callModel,
};
