import { streamText } from 'ai';
import type { ModelMessage } from 'ai';
import { agentSystemPrompt } from './prompt.js';
import { getProviderOptions } from '../llm/options.js';
import { getLanguageModel } from '../llm/provider.js';
import { miniTools } from '../tools/index.js';
import { resolveModelTools } from '../tools/tool.js';

export type CallModelInput = {
  messages: ModelMessage[];
  abortSignal?: AbortSignal;
  onError?: (error: unknown) => void;
};

export type CallModelResult = {
  fullStream: AsyncIterable<unknown>;
};

export type AgentLoopDependencies = {
  callModel: (input: CallModelInput) => CallModelResult | Promise<CallModelResult>;
};

export function callModel({ messages, abortSignal, onError }: CallModelInput): CallModelResult {
  const { model, providerName, modelName } = getLanguageModel();

  return streamText({
    model,
    system: agentSystemPrompt,
    messages,
    tools: resolveModelTools(miniTools),
    providerOptions: getProviderOptions(providerName, modelName),
    abortSignal,
    onError({ error }) {
      onError?.(error);
    },
  });
}

export const defaultAgentLoopDependencies: AgentLoopDependencies = {
  callModel,
};
