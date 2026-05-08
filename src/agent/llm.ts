import { streamText as aiStreamText } from 'ai';
import type { ModelMessage } from 'ai';
import { runAgentLoop } from './loop.js';
import { agentSystemPrompt, createSingleTurnMessages } from './prompt.js';
import { miniTools } from './tools/index.js';
import { resolveModelTools } from './tools/tool.js';
import { getLanguageModel } from '../provider/provider.js';
import { getProviderOptions } from '../provider/transform.js';

export type StreamAgentResponseOptions = {
  messages?: ModelMessage[];
  onTextDelta: (text: string) => void;
  onError?: (error: unknown) => void;
};

type StreamAgentResponseDependencies = {
  getLanguageModel: typeof getLanguageModel;
  getProviderOptions: typeof getProviderOptions;
  streamText: typeof aiStreamText;
};

const defaultStreamAgentResponseDependencies: StreamAgentResponseDependencies = {
  getLanguageModel,
  getProviderOptions,
  streamText: aiStreamText,
};

function hasFullStream(result: unknown): result is { fullStream: AsyncIterable<unknown> } {
  if (typeof result !== 'object' || result === null) return false;

  const fullStream = (result as { fullStream?: unknown }).fullStream;
  return fullStream !== undefined && Symbol.asyncIterator in Object(fullStream);
}

function hasTextStream(result: unknown): result is { textStream: AsyncIterable<string> } {
  if (typeof result !== 'object' || result === null) return false;

  const textStream = (result as { textStream?: unknown }).textStream;
  return textStream !== undefined && Symbol.asyncIterator in Object(textStream);
}

async function* fullStreamFromTextStream(textStream: AsyncIterable<string>) {
  for await (const text of textStream) {
    yield {
      type: 'text-delta',
      text,
    };
  }
}

export async function streamAgentResponse(
  userInput: string,
  options: StreamAgentResponseOptions,
  dependencies: Partial<StreamAgentResponseDependencies> = {},
) {
  const {
    getLanguageModel: resolveLanguageModel,
    getProviderOptions: resolveProviderOptions,
    streamText,
  } = { ...defaultStreamAgentResponseDependencies, ...dependencies };

  const messages = options.messages ?? createSingleTurnMessages(userInput);
  let text = '';

  try {
    for await (const event of runAgentLoop(
      { messages },
      {
        callModel({ messages: modelMessages, abortSignal }) {
          const { model, providerName, modelName } = resolveLanguageModel();

          const result: unknown = streamText({
            model,
            system: agentSystemPrompt,
            messages: modelMessages,
            tools: resolveModelTools(miniTools),
            providerOptions: resolveProviderOptions(providerName, modelName),
            abortSignal,
            onError({ error }) {
              options.onError?.(error);
            },
          });

          if (hasFullStream(result)) return result;
          if (hasTextStream(result)) return { fullStream: fullStreamFromTextStream(result.textStream) };

          return result as never;
        },
      },
    )) {
      if (event.type !== 'assistant_text_delta') continue;

      text += event.text;
      options.onTextDelta(event.text);
    }
  } catch (error) {
    options.onError?.(error);
    throw error;
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
