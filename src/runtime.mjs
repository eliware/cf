import { fs, resolvePath } from '@eliware/common';

export function loadEnvFile(filePath, env = process.env, fsImpl = fs) {
  if (!fsImpl.existsSync(filePath)) return;
  const lines = fsImpl.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in env)) env[key] = value;
  }
}

export function projectRootFromMeta(importMetaUrl) {
  return resolvePath({ url: importMetaUrl }, '..');
}
