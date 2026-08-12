import { spawn } from 'node:child_process';

const ANSI = { bold: '\u001b[1m', cyan: '\u001b[36m', reset: '\u001b[0m' };

export function terminalColorMode(value, { isTTY = Boolean(process.stdout?.isTTY), noColor = Boolean(process.env.NO_COLOR) } = {}) {
  if (value === 'always' || value === 'true') return true;
  if (value === 'never' || value === 'false') return false;
  return isTTY && !noColor;
}

export function terminalWidth(value, fallback = 120) {
  const width = Number.parseInt(value, 10);
  return Number.isFinite(width) && width >= 40 ? width : fallback;
}

export function fitTerminal(text, width = 120) {
  return String(text).split('\n').map(line => line.length > width ? `${line.slice(0, Math.max(1, width - 1))}…` : line).join('\n');
}

export function styleTerminalText(text, { color = false, width = 120 } = {}) {
  const fitted = fitTerminal(text, width);
  if (!color || !fitted.includes('\n')) return fitted;
  const [header, ...rest] = fitted.split('\n');
  return `${ANSI.bold}${ANSI.cyan}${header}${ANSI.reset}${rest.length ? `\n${rest.join('\n')}` : ''}`;
}

export function createTerminalOutput({ printer = console, json = false, color = false, width = 120, pager = null } = {}) {
  const lines = [];
  const normal = value => {
    const rendered = json ? String(value) : styleTerminalText(value, { color, width });
    if (pager) lines.push(rendered);
    else printer.log(rendered);
  };
  return {
    log: normal,
    error: value => printer.error(value),
    flush: async () => {
      if (!pager || lines.length === 0) return;
      await new Promise((resolve, reject) => {
        const child = spawn(pager, [], { stdio: ['pipe', 'inherit', 'inherit'] });
        child.once('error', reject);
        child.once('close', code => code === 0 || code === null ? resolve() : reject(new Error(`Pager exited with status ${code}`)));
        child.stdin.on('error', error => { if (error.code !== 'EPIPE') reject(error); });
        child.stdin.end(`${lines.join('\n')}\n`);
      });
    },
  };
}
