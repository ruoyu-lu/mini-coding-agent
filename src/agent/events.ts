export type AgentLoopEvent =
  | {
      type: 'assistant_text_delta';
      text: string;
    }
  | {
      type: 'tool_call_started';
      toolCallId: string;
      toolName: string;
      input: unknown;
    }
  | {
      type: 'tool_call_finished';
      toolCallId: string;
      toolName: string;
      output: unknown;
      isError: boolean;
    }
  | {
      type: 'agent_turn_finished';
      stopReason: 'end_turn' | 'max_turns' | 'aborted';
    };
