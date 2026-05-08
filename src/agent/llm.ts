import type { ModelMessage } from 'ai';
import type { AgentLoopDependencies } from './deps.js';
import { runAgentLoop } from './loop.js';
import { createSingleTurnMessages } from './prompt.js';

export type StreamAgentResponseOptions = {
  messages?: ModelMessage[];
  onTextDelta: (text: string) => void;
  onError?: (error: unknown) => void;
};

export async function streamAgentResponse(
  userInput: string,
  options: StreamAgentResponseOptions,
  dependencies: Partial<AgentLoopDependencies> = {},
) {
  const messages = options.messages ?? createSingleTurnMessages(userInput);
  let text = '';

  try {
    for await (const event of runAgentLoop(
      { messages, onError: options.onError },
      dependencies,
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
  dependencies: Partial<AgentLoopDependencies> = {},
) {
  return streamAgentResponse(userInput, {
    onTextDelta() {},
  }, dependencies);
}
