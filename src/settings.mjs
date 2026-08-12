import { fs } from '@eliware/common';
import { configRoot } from './config.mjs';

function settingsPath(homeDir) { return `${configRoot(homeDir)}/config.json`; }
export function readSettings(homeDir, fsImpl = fs) { const path = settingsPath(homeDir); if (typeof fsImpl.existsSync !== 'function' || !fsImpl.existsSync(path)) return {}; return JSON.parse(fsImpl.readFileSync(path, 'utf8')); }
export function writeSettings(settings, homeDir, fsImpl = fs) { const path = settingsPath(homeDir); fsImpl.mkdirSync(configRoot(homeDir), { recursive: true }); fsImpl.writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 }); if (typeof fsImpl.chmodSync === 'function') fsImpl.chmodSync(path, 0o600); }
