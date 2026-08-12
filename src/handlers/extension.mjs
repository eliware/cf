import os from 'node:os';
import { fs } from '@eliware/common';

export function handleExtension({ action, outputJson, printer, toJsonOutput, fail, fsImpl = fs, homeDir = os.homedir() }) {
  if (action !== 'list') { fail(`Unknown extension action: ${action}`); return; }
  const path = `${homeDir}/.config/cf/extensions`;
  const names = typeof fsImpl.existsSync === 'function' && fsImpl.existsSync(path) ? fsImpl.readdirSync(path) : [];
  return outputJson ? toJsonOutput(names.map(name => ({ name }))) : names.forEach(name => printer.log(name));
}
