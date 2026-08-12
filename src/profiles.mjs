import os from 'node:os';
import { fs } from '@eliware/common';

export function profilesPath(homeDir = os.homedir()) { return `${homeDir}/.config/cf/profiles.json`; }

export function readProfiles(homeDir = os.homedir(), fsImpl = fs) {
  const path = profilesPath(homeDir);
  if (typeof fsImpl.existsSync !== 'function' || !fsImpl.existsSync(path)) return { active: null, profiles: {} };
  return JSON.parse(fsImpl.readFileSync(path, 'utf8'));
}

export function writeProfiles(data, homeDir = os.homedir(), fsImpl = fs) {
  const path = profilesPath(homeDir); const dir = path.slice(0, path.lastIndexOf('/'));
  fsImpl.mkdirSync(dir, { recursive: true });
  fsImpl.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  if (typeof fsImpl.chmodSync === 'function') fsImpl.chmodSync(path, 0o600);
}

export function activeProfile(env = process.env, homeDir = os.homedir(), fsImpl = fs) {
  const data = readProfiles(homeDir, fsImpl);
  const name = env.CLOUDFLARE_PROFILE || data.active;
  return name && data.profiles[name] ? { name, ...data.profiles[name] } : null;
}

export function applyActiveProfile(env = process.env, homeDir = os.homedir(), fsImpl = fs) {
  const profile = activeProfile(env, homeDir, fsImpl);
  if (!profile) return null;
  for (const [key, value] of Object.entries({
    CLOUDFLARE_EMAIL: profile.email, CLOUDFLARE_API_KEY: profile.apiKey,
    CLOUDFLARE_API_TOKEN: profile.apiToken, CLOUDFLARE_ACCOUNT_ID: profile.accountId,
    CLOUDFLARE_ZONE_ID: profile.zoneId,
  })) if (value && !env[key]) env[key] = value;
  return profile;
}
