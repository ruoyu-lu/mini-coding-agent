import pc from 'picocolors';
import { runInitCommand } from './commands/init.js';

export type SlashCommand = {
  name: string;
  description: string;
  aliases?: string[];
  action: () => Promise<void> | void;
};

export const slashCommands: SlashCommand[] = [
  {
    name: 'init',
    description: 'Create local Minicode config files.',
    action: runInitCommand,
  },
  {
    name: 'help',
    aliases: ['?'],
    description: 'Show available slash commands.',
    action: showSlashCommandHelp,
  },
];

export function showSlashCommandHelp() {
  console.log(pc.bold('Available slash commands:'));

  for (const command of slashCommands) {
    console.log(`  /${command.name.padEnd(8)} ${command.description}`);
  }
}

export function normalizeSlashInput(input: string) {
  return input.trim().replace(/^\/+/, '').toLowerCase();
}

function getCommandTerms(command: SlashCommand) {
  return [command.name, ...(command.aliases ?? [])];
}

export function scoreCommandTerm(query: string, term: string) {
  if (query === term) return 100;
  if (term.startsWith(query)) return 80 - (term.length - query.length);
  if (term.includes(query)) return 60 - term.indexOf(query);

  let queryIndex = 0;
  for (const char of term) {
    if (char === query[queryIndex]) queryIndex += 1;
    if (queryIndex === query.length) return 40 - (term.length - query.length);
  }

  return 0;
}

export function findSlashCommand(input: string) {
  return getSlashCommandMatches(input)[0] ?? null;
}

export function getSlashCommandMatches(input: string) {
  if (!input.trim().startsWith('/')) return [];

  const query = normalizeSlashInput(input);
  if (!query) return slashCommands;

  return slashCommands
    .map((command) => ({
      command,
      score: Math.max(...getCommandTerms(command).map((term) => scoreCommandTerm(query, term))),
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((match) => match.command);
}

export async function handleSlashCommand(input: string) {
  if (!input.trim().startsWith('/')) return false;

  const command = findSlashCommand(input);

  if (!command) {
    console.log(pc.yellow(`Unknown command: ${input.trim()}`));
    showSlashCommandHelp();
    return true;
  }

  await command.action();
  return true;
}
