import { fs, fileUrlToPath } from '@eliware/common';

export function loadEnvFile(filePath, env = process.env, fsImpl = fs) {
  if (!fsImpl.existsSync(filePath)) return false;
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
  return true;
}

export function loadProjectEnv(projectRoot, env = process.env, fsImpl = fs) {
  const rootUrl = new URL(`file://${projectRoot.replaceAll('\\', '/')}/`);
  return loadEnvFile(fileUrlToPath(new URL('.env', rootUrl)), env, fsImpl);
}

export function requireEnv(name, env = process.env) {
  const value = env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
