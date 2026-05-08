import type { ModelMessage } from 'ai';
import type { AgentLoopDependencies } from './deps.js';
import { defaultAgentLoopDependencies } from './deps.js';
import type { AgentLoopEvent } from './events.js';
import { miniTools } from '../tools/index.js';
import { createToolContext, runMiniTool } from '../tools/tool.js';

type AgentToolCall = {
  toolCallId: string;
  toolName: string;
  input: unknown;
};

export type AgentLoopOptions = {
  messages: ModelMessage[];
  maxTurns?: number;
  abortSignal?: AbortSignal;
  onError?: (error: unknown) => void;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

// Tool errors should become observations, not loop failures.
export async function runTools(toolCalls: AgentToolCall[]) {
  const context = createToolContext();
  const results: Array<AgentToolCall & { output: unknown; isError: boolean }> = [];

  for (const toolCall of toolCalls) {
    try {
      results.push({
        ...toolCall,
        output: await runMiniTool(miniTools, toolCall, context),
        isError: false,
      });
    } catch (error) {
      results.push({
        ...toolCall,
        output: {
          is_error: true,
          error: getErrorMessage(error),
        },
        isError: true,
      });
    }
  }

  return results;
}

// Required by reasoning providers when tool results are sent back.
function createAssistantMessage(
  text: string,
  reasoningText: string,
  toolCalls: AgentToolCall[],
): ModelMessage | undefined {
  const content: Array<{
    type: 'text' | 'reasoning' | 'tool-call';
    text?: string;
    toolCallId?: string;
    toolName?: string;
    input?: unknown;
  }> = [];

  if (text.length > 0) {
    content.push({ type: 'text', text });
  }

  if (reasoningText.length > 0) {
    content.push({ type: 'reasoning', text: reasoningText });
  }

  for (const toolCall of toolCalls) {
    content.push({
      type: 'tool-call',
      toolCallId: toolCall.toolCallId,
      toolName: toolCall.toolName,
      input: toolCall.input,
    });
  }

  if (content.length === 0) return undefined;

  return {
    role: 'assistant',
    content,
  } as ModelMessage;
}

// Keep tool outputs provider-neutral.
function createToolMessage(results: Awaited<ReturnType<typeof runTools>>): ModelMessage {
  return {
    role: 'tool',
    content: results.map((result) => ({
      type: 'tool-result',
      toolCallId: result.toolCallId,
      toolName: result.toolName,
      output: {
        type: 'json',
        value: result.isError
          ? result.output
          : {
              is_error: false,
              result: result.output,
            },
      },
    })),
  } as ModelMessage;
}

// Preserve the existing streamAgentResponse test contract.
function getModelCallMessages(options: AgentLoopOptions, messages: ModelMessage[], turn: number) {
  return turn === 0 ? options.messages : [...messages];
}

// Runtime boundary between model streaming, tool execution, and UI events.
export async function* runAgentLoop(
  options: AgentLoopOptions,
  dependencies: Partial<AgentLoopDependencies> = {},
): AsyncGenerator<AgentLoopEvent> {
  const resolvedDependencies = { ...defaultAgentLoopDependencies, ...dependencies };
  const maxTurns = options.maxTurns ?? 5;
  const messages = [...options.messages];

  for (let turn = 0; turn < maxTurns; turn += 1) {
    if (options.abortSignal?.aborted) {
      yield { type: 'agent_turn_finished', stopReason: 'aborted' };
      return;
    }

    let assistantText = '';
    let reasoningText = '';
    const toolCalls: AgentToolCall[] = [];
    let didCompleteModelCall = false;

    // Retry once for transient provider failures.
    for (let attempt = 0; attempt < 2 && !didCompleteModelCall; attempt += 1) {
      assistantText = '';
      reasoningText = '';
      toolCalls.length = 0;

      try {
        const result = await resolvedDependencies.callModel({
          messages: getModelCallMessages(options, messages, turn),
          abortSignal: options.abortSignal,
          onError: options.onError,
        });

        for await (const part of result.fullStream) {
          if (options.abortSignal?.aborted) {
            yield { type: 'agent_turn_finished', stopReason: 'aborted' };
            return;
          }

          if (!isObject(part)) continue;

          if (part.type === 'error') {
            throw part.error;
          }

          if (part.type === 'text-delta' && typeof part.text === 'string') {
            assistantText += part.text;
            yield {
              type: 'assistant_text_delta',
              text: part.text,
            };
          }

          if (part.type === 'reasoning-delta' && typeof part.text === 'string') {
            reasoningText += part.text;
          }

          if (
            part.type === 'tool-call' &&
            typeof part.toolCallId === 'string' &&
            typeof part.toolName === 'string'
          ) {
            const toolCall = {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              input: part.input,
            };

            toolCalls.push(toolCall);
            yield {
              type: 'tool_call_started',
              ...toolCall,
            };
          }

          if (part.type === 'abort') {
            yield { type: 'agent_turn_finished', stopReason: 'aborted' };
            return;
          }
        }

        didCompleteModelCall = true;
      } catch (error) {
        if (options.abortSignal?.aborted) {
          yield { type: 'agent_turn_finished', stopReason: 'aborted' };
          return;
        }

        if (attempt === 0) continue;

        throw error;
      }
    }

    const assistantMessage = createAssistantMessage(assistantText, reasoningText, toolCalls);
    if (assistantMessage) {
      messages.push(assistantMessage);
    }

    if (toolCalls.length === 0) {
      yield { type: 'agent_turn_finished', stopReason: 'end_turn' };
      return;
    }

    const toolResults = await runTools(toolCalls);
    for (const toolResult of toolResults) {
      yield {
        type: 'tool_call_finished',
        toolCallId: toolResult.toolCallId,
        toolName: toolResult.toolName,
        output: toolResult.output,
        isError: toolResult.isError,
      };
    }

    messages.push(createToolMessage(toolResults));
  }

  yield { type: 'agent_turn_finished', stopReason: 'max_turns' };
}
