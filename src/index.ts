#!/usr/bin/env node

import { intro, isCancel, outro, spinner, text } from '@clack/prompts';
import { Command } from 'commander';
import pc from 'picocolors';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runInteractiveMode() {
  console.clear();
  intro(pc.bgCyan(pc.black(' Mini Code Agent')));

  const userInput = await text({
    message: 'What do you want me to do?',
    placeholder: 'e.g., Check index.ts for bugs...',
  });

  if (isCancel(userInput)) {
    outro(pc.yellow('Goodbye!'));
    process.exit(0);
  }

  const s = spinner();
  s.start('Agent is thinking...');

  // TODO: Replace this with a real LLM call.
  await sleep(1000);

  s.stop('Thinking complete!');

  outro(pc.green(`You said: ${userInput}\n(LLM implementation coming soon...)`));
}

const program = new Command();

program
  .name('minicode')
  .description('A small interactive coding agent CLI.')
  .version('1.0.0')
  .action(runInteractiveMode);

program.parseAsync(process.argv).catch((error) => {
  outro(pc.red(error instanceof Error ? error.message : 'Unexpected error'));
  process.exit(1);
});
