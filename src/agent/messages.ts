import type { ModelMessage } from 'ai';

const maxConversationMessages = 20;

export const agentSystemPrompt =
  'You are a helpful coding assistant. Use available tools to inspect project files before answering questions that depend on file contents.';

export function createSingleTurnMessages(userInput: string): ModelMessage[] {
  return [{ role: 'user', content: userInput }];
}

export function createConversationMessages(history: ModelMessage[], userInput: string): ModelMessage[] {
  return [...history, { role: 'user', content: userInput }];
}

export function trimConversationHistory(history: ModelMessage[]) {
  return history.slice(-maxConversationMessages);
}
