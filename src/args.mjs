export function parseArgs(argv) {
  const args = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      args.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      opts[arg.slice(2, eq)] = arg.slice(eq + 1);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      opts[key] = next;
      i++;
    } else {
      opts[key] = true;
    }
  }
  return { args, opts };
}

export function tokenizeCommand(command) {
  const tokens = []; let token = ''; let quote = null; let escaped = false;
  for (const character of command) {
    if (escaped) { token += character; escaped = false; continue; }
    if (character === '\\' && quote !== "'") { escaped = true; continue; }
    if (quote) { if (character === quote) quote = null; else token += character; continue; }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (/\s/.test(character)) { if (token) { tokens.push(token); token = ''; } continue; }
    token += character;
  }
  if (escaped) token += '\\';
  if (quote) throw new Error('Unterminated quote in command alias');
  if (token) tokens.push(token);
  return tokens;
}
