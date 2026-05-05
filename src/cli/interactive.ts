import { intro, outro, spinner } from '@clack/prompts';
import pc from 'picocolors';
import { promptForInput } from '../agent/prompt.js';
import { handleSlashCommand } from './slash-commands.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

    // TODO: Replace this with a real LLM call.
    await sleep(1000);

    s.stop('Thinking complete!');

    console.log(pc.green(`You said: ${userInput}\n(LLM implementation coming soon...)`));
  }
}
