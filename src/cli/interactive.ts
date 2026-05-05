import { intro, outro, spinner } from '@clack/prompts';
import pc from 'picocolors';
import { generateAgentResponse } from '../agent/llm.js';
import { promptForInput } from '../agent/prompt.js';
import { handleSlashCommand } from './slash-commands.js';

export async function runInteractiveMode() {
  console.clear();
  intro(pc.bgCyan(pc.black(' Mini Code Agent')));

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
      const response = await generateAgentResponse(userInput);
      s.stop('Thinking complete!');
      console.log(`${pc.green('Assistant:')} ${response || pc.dim('(empty response)')}`);
    } catch (error) {
      s.stop('Agent failed.');
      console.log(pc.red(error instanceof Error ? error.message : 'Unexpected LLM error'));
    }
  }
}
