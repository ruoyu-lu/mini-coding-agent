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
  let value = '';
  let selectedIndex = 0;
  let didSelectSuggestion = false;
  let renderedLines = 0;

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  const render = () => {
    if (renderedLines > 0) {
      readline.moveCursor(process.stdout, 0, -1);
      readline.cursorTo(process.stdout, 0);
      readline.clearScreenDown(process.stdout);
    }

    const suggestions = getSlashCommandMatches(value).slice(0, 6);
    if (selectedIndex >= suggestions.length) selectedIndex = 0;
    if (suggestions.length === 0) didSelectSuggestion = false;

    const lines = [`${pc.cyan('?')} ${message}`, `${pc.dim('>')} ${value}`];

    if (suggestions.length > 0) {
      lines.push(
        '',
        ...suggestions.map((command, index) => {
          const prefix = didSelectSuggestion && index === selectedIndex ? pc.cyan('›') : ' ';
          const name = pc.cyan(`/${command.name.padEnd(10)}`);
          return `${prefix} ${name} ${pc.dim(command.description)}`;
        }),
      );
    }

    process.stdout.write(lines.join('\n'));
    renderedLines = lines.length;

    readline.moveCursor(process.stdout, 0, -(lines.length - 2));
    readline.cursorTo(process.stdout, 2 + value.length);
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
        const selectedCommand = didSelectSuggestion ? getSlashCommandMatches(value)[selectedIndex] : undefined;
        cleanup();
        resolve(selectedCommand ? `/${selectedCommand.name}` : value);
        return;
      }

      if (key.name === 'tab') {
        const selectedCommand = getSlashCommandMatches(value)[selectedIndex];
        if (selectedCommand) {
          value = `/${selectedCommand.name} `;
          selectedIndex = 0;
          didSelectSuggestion = false;
          render();
        }
        return;
      }

      if (key.name === 'up') {
        const suggestions = getSlashCommandMatches(value);
        if (suggestions.length > 0) {
          selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
          didSelectSuggestion = true;
          render();
        }
        return;
      }

      if (key.name === 'down') {
        const suggestions = getSlashCommandMatches(value);
        if (suggestions.length > 0) {
          selectedIndex = (selectedIndex + 1) % suggestions.length;
          didSelectSuggestion = true;
          render();
        }
        return;
      }

      if (key.name === 'backspace') {
        value = value.slice(0, -1);
        selectedIndex = 0;
        didSelectSuggestion = false;
        render();
        return;
      }

      if (char && !key.ctrl && !key.meta) {
        value += char;
        selectedIndex = 0;
        didSelectSuggestion = false;
        render();
      }
    };

    render();
    process.stdin.on('keypress', onKeypress);
  });
}
