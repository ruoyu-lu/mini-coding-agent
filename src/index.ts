#!/usr/bin/env node

import { outro } from '@clack/prompts';
import { Command } from 'commander';
import { pathToFileURL } from 'node:url';
import pc from 'picocolors';
import { runInitCommand } from './cli/commands/init.js';
import { runLoginCommand } from './cli/commands/login.js';
import { runInteractiveMode } from './cli/interactive.js';
import { loadUserEnv } from './config/user-env.js';

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

function isMainModule() {
  const entryPoint = process.argv[1];
  return entryPoint ? import.meta.url === pathToFileURL(entryPoint).href : false;
}

export async function runCli(argv = process.argv) {
  loadUserEnv();

  try {
    await createProgram().parseAsync(argv);
  } catch (error) {
    outro(pc.red(error instanceof Error ? error.message : 'Unexpected error'));
    process.exit(1);
  }
}

if (isMainModule()) {
  void runCli();
}
