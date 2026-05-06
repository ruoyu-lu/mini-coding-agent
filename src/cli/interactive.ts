import { intro, outro, spinner } from '@clack/prompts';
import type { ModelMessage } from 'ai';
import pc from 'picocolors';
import { streamAgentResponse } from '../agent/llm.js';
import { createConversationMessages, promptForInput } from '../agent/prompt.js';
import { handleSlashCommand } from './slash-commands.js';

const maxConversationMessages = 20;

function trimConversationHistory(history: ModelMessage[]) {
  return history.slice(-maxConversationMessages);
}

export async function runInteractiveMode() {
  console.clear();
  intro(pc.bgCyan(pc.black(' Mini Code Agent')));

  let conversationHistory: ModelMessage[] = [];

  while (true) {
    const userInput = await promptForInput('What do you want me to do?');

    if (userInput === null) {
      outro(pc.yellow('Goodbye!'));
      process.exit(0);
    }

    const slashCommandResult = await handleSlashCommand(userInput);
    if (slashCommandResult.shouldExit) {
      outro(pc.yellow('Goodbye!'));
      process.exit(0);
    }

    if (slashCommandResult.handled) continue;

    if (!userInput.trim()) continue;

    const s = spinner();
    s.start('Agent is thinking...');

    try {
      let didStartStreaming = false;
      let didReceiveText = false;
      const messages = createConversationMessages(conversationHistory, userInput);

      const assistantResponse = await streamAgentResponse(userInput, {
        messages,
        onTextDelta(text) {
          if (!didStartStreaming) {
            s.stop(`${pc.green('Assistant:')}`);
            didStartStreaming = true;
          }

          didReceiveText = true;
          process.stdout.write(text);
        },
        onError(error) {
          if (!didStartStreaming) {
            s.stop('Agent failed.');
            didStartStreaming = true;
          }

          console.log(pc.red(error instanceof Error ? error.message : 'Unexpected LLM error'));
        },
      });

      if (!didStartStreaming) {
        s.stop(`${pc.green('Assistant:')} ${pc.dim('(empty response)')}`);
      } else if (!didReceiveText) {
        process.stdout.write(pc.dim('(empty response)'));
      }

      process.stdout.write('\n');

      if (assistantResponse.trim()) {
        conversationHistory = trimConversationHistory([
          ...messages,
          { role: 'assistant', content: assistantResponse },
        ]);
      }
    } catch (error) {
      s.stop('Agent failed.');
      console.log(pc.red(error instanceof Error ? error.message : 'Unexpected LLM error'));
    }
  }
}
