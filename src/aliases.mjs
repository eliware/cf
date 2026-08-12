import { fs } from '@eliware/common';
import { configRoot } from './config.mjs';

function aliasesPath(homeDir) { return `${configRoot(homeDir)}/aliases.json`; }
export function readAliases(homeDir, fsImpl = fs) {
  const path = aliasesPath(homeDir); if (typeof fsImpl.existsSync !== 'function' || !fsImpl.existsSync(path)) return {};
  return JSON.parse(fsImpl.readFileSync(path, 'utf8'));
}
export function writeAliases(aliases, homeDir, fsImpl = fs) {
  const path = aliasesPath(homeDir); fsImpl.mkdirSync(configRoot(homeDir), { recursive: true }); fsImpl.writeFileSync(path, `${JSON.stringify(aliases, null, 2)}\n`, { mode: 0o600 });
  if (typeof fsImpl.chmodSync === 'function') fsImpl.chmodSync(path, 0o600);
}
