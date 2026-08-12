import os from 'node:os';
import { fs } from '@eliware/common';
import { configRoot } from './config.mjs';
import { readCredential, writeCredential } from './credentials.mjs';
import { refreshOAuth } from './oauth.mjs';

export function profilesPath(homeDir = os.homedir()) { return `${configRoot(homeDir)}/profiles.json`; }

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

export async function applyActiveProfile(env = process.env, homeDir = os.homedir(), fsImpl = fs, effects = {}) {
  const credentialReader = effects.readCredential || readCredential;
  const credentialWriter = effects.writeCredential || writeCredential;
  const refresh = effects.refreshOAuth || refreshOAuth;
  const now = effects.now || Date.now;
  const profile = activeProfile(env, homeDir, fsImpl);
  if (!profile) return null;
  const credential = await credentialReader(profile.name);
  let activeCredential = credential;
  if (credential?.oauthRefreshToken && credential.expiresAt && credential.expiresAt <= now() + 60_000) {
    try {
      const refreshed = await refresh({ refreshToken: credential.oauthRefreshToken });
      activeCredential = { ...refreshed, oauthAccessToken: refreshed.accessToken, oauthRefreshToken: refreshed.refreshToken };
      await credentialWriter(profile.name, { ...credential, ...activeCredential });
    } catch { activeCredential = credential; }
  }
  const values = { ...activeCredential, ...profile };
  for (const [key, value] of Object.entries({
    CLOUDFLARE_EMAIL: values.email, CLOUDFLARE_API_KEY: values.apiKey,
    CLOUDFLARE_API_TOKEN: values.apiToken || values.oauthAccessToken, CLOUDFLARE_ACCOUNT_ID: values.accountId,
    CLOUDFLARE_ZONE_ID: values.zoneId,
  })) if (value && !env[key]) env[key] = value;
  return { ...profile, ...credential };
}
