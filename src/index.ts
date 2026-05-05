#!/usr/bin/env node

import { outro } from '@clack/prompts';
import { Command } from 'commander';
import pc from 'picocolors';
import { runInitCommand } from './cli/commands/init.js';
import { runLoginCommand } from './cli/commands/login.js';
import { runInteractiveMode } from './cli/interactive.js';

export function createProgram() {
  const program = new Command();

  program
    .name('minicode')
    .description('A small interactive coding agent CLI.')
    .version('1.0.0')
    .action(runInteractiveMode);

  program
    .command('init')
    .description('Create local Minicode config files.')
    .action(runInitCommand);

  program
    .command('login')
    .description('Configure an OpenAI-compatible provider.')
    .action(runLoginCommand);

  return program;
}

createProgram().parseAsync(process.argv).catch((error) => {
  outro(pc.red(error instanceof Error ? error.message : 'Unexpected error'));
  process.exit(1);
});
