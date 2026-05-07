#!/usr/bin/env node

import { outro } from '@clack/prompts';
import { Command } from 'commander';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

function resolveRealPath(path: string) {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

export function isMainModuleUrl(moduleUrl: string, entryPoint: string | undefined) {
  if (!entryPoint) return false;

  return resolveRealPath(fileURLToPath(moduleUrl)) === resolveRealPath(entryPoint);
}

function isMainModule() {
  return isMainModuleUrl(import.meta.url, process.argv[1]);
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
