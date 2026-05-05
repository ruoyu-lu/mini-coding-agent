import pc from 'picocolors';
import { runInitCommand } from './commands/init.js';
import { runLoginCommand } from './commands/login.js';

export type SlashCommand = {
  name: string;
  description: string;
  aliases?: string[];
  action: () => Promise<SlashCommandActionResult> | SlashCommandActionResult;
};

export type SlashCommandActionResult = 'continue' | 'exit' | void;

export type ParsedSlashInput = {
  commandName: string;
  args: string;
};

export type SlashCommandHandleResult = {
  handled: boolean;
  shouldExit: boolean;
};

export const slashCommands: SlashCommand[] = [
  {
    name: 'init',
    description: 'Create local Minicode config files.',
    action: runInitCommand,
  },
  {
    name: 'login',
    description: 'Configure an OpenAI-compatible provider.',
    action: runLoginCommand,
  },
  {
    name: 'help',
    aliases: ['?'],
    description: 'Show available slash commands.',
    action: showSlashCommandHelp,
  },
  {
    name: 'exit',
    aliases: ['quit', 'q'],
    description: 'Exit Minicode.',
    action: () => 'exit',
  },
];

export function showSlashCommandHelp() {
  console.log(pc.bold('Available slash commands:'));

  for (const command of slashCommands) {
    console.log(`  /${command.name.padEnd(8)} ${command.description}`);
  }
}

export function normalizeSlashInput(input: string) {
  return parseSlashInput(input)?.commandName ?? '';
}

export function parseSlashInput(input: string): ParsedSlashInput | null {
  const trimmedInput = input.trimStart();
  if (!trimmedInput.startsWith('/')) return null;

  const withoutSlash = trimmedInput.replace(/^\/+/, '');
  const match = withoutSlash.match(/^(\S*)(?:\s+([\s\S]*))?$/);

  return {
    commandName: match?.[1]?.toLowerCase() ?? '',
    args: match?.[2] ?? '',
  };
}

function getCommandTerms(command: SlashCommand) {
  return [command.name, ...(command.aliases ?? [])];
}

function hasCommandSeparator(input: string) {
  return /^\s*\/+\S+\s/.test(input);
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

export function findExactSlashCommand(input: string) {
  const parsedInput = parseSlashInput(input);
  if (!parsedInput) return null;

  return (
    slashCommands.find((command) =>
      getCommandTerms(command).some((term) => term.toLowerCase() === parsedInput.commandName),
    ) ?? null
  );
}

export function getSlashCommandMatches(input: string) {
  const parsedInput = parseSlashInput(input);
  if (!parsedInput) return [];
  if (hasCommandSeparator(input)) return [];

  const query = parsedInput.commandName;
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
  if (!parseSlashInput(input)) {
    return { handled: false, shouldExit: false };
  }

  const command = findExactSlashCommand(input);

  if (!command) {
    console.log(pc.yellow(`Unknown command: ${input.trim()}`));
    showSlashCommandHelp();
    return { handled: true, shouldExit: false };
  }

  const result = await command.action();
  return { handled: true, shouldExit: result === 'exit' };
}
