import { isCancel, text } from '@clack/prompts';
import readline from 'node:readline';
import pc from 'picocolors';
import { getSlashCommandMatches } from '../cli/slash-commands.js';

export async function promptForInput(message: string) {
  if (!process.stdin.isTTY) {
    const value = await text({
      message,
      placeholder: 'Type /init or /help',
    });

    return isCancel(value) ? null : value;
  }

  return readInputWithSlashSuggestions(message);
}

export async function readInputWithSlashSuggestions(message: string) {
  let input = '';
  let cursorOffset = 0;
  let selectedIndex = 0;
  let didSelectSuggestion = false;
  let renderedLines = 0;

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  const resetSelection = () => {
    selectedIndex = 0;
    didSelectSuggestion = false;
  };

  const getSuggestionInput = () => input.slice(0, cursorOffset);

  const getSuggestions = () => getSlashCommandMatches(getSuggestionInput()).slice(0, 6);

  const applyCommandSuggestion = (commandName: string) => {
    const beforeCursor = input.slice(0, cursorOffset);
    const afterCursor = input.slice(cursorOffset);
    const commandStartMatch = beforeCursor.match(/^\s*\/+/);
    if (!commandStartMatch) return;

    const commandStart = commandStartMatch[0].replace(/\/+$/, '').length;
    const afterCommandMatch = afterCursor.match(/^\S*/);
    const commandEnd = cursorOffset + (afterCommandMatch?.[0].length ?? 0);
    const replacement = `/${commandName} `;

    input = input.slice(0, commandStart) + replacement + input.slice(commandEnd);
    cursorOffset = commandStart + replacement.length;
    resetSelection();
  };

  const insertText = (textToInsert: string) => {
    input = input.slice(0, cursorOffset) + textToInsert + input.slice(cursorOffset);
    cursorOffset += textToInsert.length;
    resetSelection();
  };

  const deleteBeforeCursor = () => {
    if (cursorOffset === 0) return;
    input = input.slice(0, cursorOffset - 1) + input.slice(cursorOffset);
    cursorOffset -= 1;
    resetSelection();
  };

  const deleteAtCursor = () => {
    if (cursorOffset >= input.length) return;
    input = input.slice(0, cursorOffset) + input.slice(cursorOffset + 1);
    resetSelection();
  };

  const render = () => {
    if (renderedLines > 0) {
      readline.moveCursor(process.stdout, 0, -1);
      readline.cursorTo(process.stdout, 0);
      readline.clearScreenDown(process.stdout);
    }

    const suggestions = getSuggestions();
    if (selectedIndex >= suggestions.length) selectedIndex = 0;
    if (suggestions.length === 0) didSelectSuggestion = false;

    const lines = [`${pc.cyan('?')} ${message}`, `${pc.dim('>')} ${input}`];

    if (suggestions.length > 0) {
      lines.push(
        '',
        ...suggestions.map((command, index) => {
          const isSelected = didSelectSuggestion && index === selectedIndex;
          const prefix = isSelected ? pc.blue('›') : ' ';
          const name = `/${command.name.padEnd(10)}`;
          return `${prefix} ${isSelected ? pc.blue(name) : pc.gray(name)} ${pc.gray(command.description)}`;
        }),
      );
    }

    process.stdout.write(lines.join('\n'));
    renderedLines = lines.length;

    readline.moveCursor(process.stdout, 0, -(lines.length - 2));
    readline.cursorTo(process.stdout, 2 + cursorOffset);
  };

  return new Promise<string | null>((resolve) => {
    const cleanup = () => {
      process.stdin.off('keypress', onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      readline.moveCursor(process.stdout, 0, renderedLines - 2);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write('\n');
    };

    const onKeypress = (char: string | undefined, key: readline.Key) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        resolve(null);
        return;
      }

      if (key.name === 'return') {
        const selectedCommand = didSelectSuggestion ? getSuggestions()[selectedIndex] : undefined;
        if (selectedCommand) {
          applyCommandSuggestion(selectedCommand.name);
        }
        cleanup();
        resolve(input);
        return;
      }

      if (key.name === 'tab') {
        const selectedCommand = getSuggestions()[selectedIndex];
        if (selectedCommand) {
          applyCommandSuggestion(selectedCommand.name);
          render();
        }
        return;
      }

      if (key.name === 'left') {
        cursorOffset = Math.max(0, cursorOffset - 1);
        render();
        return;
      }

      if (key.name === 'right') {
        cursorOffset = Math.min(input.length, cursorOffset + 1);
        render();
        return;
      }

      if (key.name === 'home' || (key.ctrl && key.name === 'a')) {
        cursorOffset = 0;
        render();
        return;
      }

      if (key.name === 'end' || (key.ctrl && key.name === 'e')) {
        cursorOffset = input.length;
        render();
        return;
      }

      if (key.name === 'delete') {
        deleteAtCursor();
        render();
        return;
      }

      if (key.name === 'up') {
        const suggestions = getSuggestions();
        if (suggestions.length > 0) {
          selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
          didSelectSuggestion = true;
          render();
        }
        return;
      }

      if (key.name === 'down') {
        const suggestions = getSuggestions();
        if (suggestions.length > 0) {
          selectedIndex = (selectedIndex + 1) % suggestions.length;
          didSelectSuggestion = true;
          render();
        }
        return;
      }

      if (key.name === 'backspace') {
        deleteBeforeCursor();
        render();
        return;
      }

      if (char && !key.ctrl && !key.meta) {
        insertText(char);
        render();
      }
    };

    render();
    process.stdin.on('keypress', onKeypress);
  });
}
