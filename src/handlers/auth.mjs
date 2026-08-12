import { readProfiles, writeProfiles } from '../profiles.mjs';
import { printTable } from '../output.mjs';
import { deleteCredential, writeCredential } from '../credentials.mjs';
import { fs } from '@eliware/common';
import { DEFAULT_OAUTH_SCOPES, loginOAuth } from '../oauth.mjs';

export async function handleAuth({ cf, action, opts, outputJson, printer, toJsonOutput, fail, profileHome, profileFs, read = readProfiles, write = writeProfiles, readToken = () => fs.readFileSync(0, 'utf8').trim(), oauthLogin = loginOAuth }) {
  const data = read(profileHome, profileFs);
  if (action === 'list') {
    const profiles = Object.entries(data.profiles).map(([name, value]) => ({ name, email: value.email || null, active: name === data.active }));
    if (!profiles.length) profiles.push({ name: 'environment', email: process.env.CLOUDFLARE_EMAIL || null, active: true });
    return outputJson ? toJsonOutput(profiles) : printTable(['ACTIVE', 'NAME', 'EMAIL'], profiles.map(profile => [profile.active ? '*' : '', profile.name, profile.email || '(not configured)']), printer.log);
  }
  if (action === 'login') {
    const name = opts?.profile || 'default';
    if (opts?.oauth) {
      const scopes = (process.env.CF_OAUTH_SCOPES || DEFAULT_OAUTH_SCOPES.join(',')).split(',').map(scope => scope.trim()).filter(Boolean);
      const oauth = await oauthLogin({ clientId: process.env.CF_OAUTH_CLIENT_ID, scopes, bindHost: process.env.CF_OAUTH_BIND_HOST || '127.0.0.1', redirectHost: process.env.CF_OAUTH_REDIRECT_HOST || process.env.CF_OAUTH_BIND_HOST || '127.0.0.1' });
      const storedInKeychain = await writeCredential(name, { oauthAccessToken: oauth.accessToken, oauthRefreshToken: oauth.refreshToken, expiresIn: oauth.expiresIn });
      data.profiles[name] = { authMethod: 'oauth', ...(storedInKeychain ? {} : { apiToken: oauth.accessToken }), accountId: opts?.['account-id'] || process.env.CLOUDFLARE_ACCOUNT_ID, zoneId: opts?.['zone-id'] || process.env.CLOUDFLARE_ZONE_ID };
      data.active = name; write(data, profileHome, profileFs); return printer.log(`Saved and activated profile ${name}`);
    }
    const stdinToken = opts?.['token-stdin'] ? readToken() : null;
    if (!stdinToken && !process.env.CLOUDFLARE_API_TOKEN && (!process.env.CLOUDFLARE_EMAIL || !process.env.CLOUDFLARE_API_KEY)) { fail('To log in, set CLOUDFLARE_API_TOKEN or CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY, or pipe a token with --token-stdin'); return; }
    const credential = { email: process.env.CLOUDFLARE_EMAIL, apiKey: process.env.CLOUDFLARE_API_KEY, apiToken: process.env.CLOUDFLARE_API_TOKEN };
    if (stdinToken) { credential.email = undefined; credential.apiKey = undefined; credential.apiToken = stdinToken; }
    const storedInKeychain = await writeCredential(name, credential);
    data.profiles[name] = { accountId: opts?.['account-id'] || process.env.CLOUDFLARE_ACCOUNT_ID, zoneId: opts?.['zone-id'] || process.env.CLOUDFLARE_ZONE_ID, ...(storedInKeychain ? {} : credential) };
    data.active = name; write(data, profileHome, profileFs); return printer.log(`Saved and activated profile ${name}`);
  }
  if (action === 'switch') {
    const name = opts?.profile;
    if (!name || !data.profiles[name]) { fail(`Unknown profile: ${name || '(missing --profile)'}`); return; }
    data.active = name; write(data, profileHome, profileFs); return printer.log(`Activated profile ${name}`);
  }
  if (action === 'logout') {
    const name = opts?.profile || data.active;
    if (!name || !data.profiles[name]) { fail(`Unknown profile: ${name || '(none)'}`); return; }
    delete data.profiles[name]; await deleteCredential(name); if (data.active === name) data.active = Object.keys(data.profiles)[0] || null;
    write(data, profileHome, profileFs); return printer.log(`Removed profile ${name}`);
  }
  if (action === 'status') {
    if (!process.env.CLOUDFLARE_API_TOKEN && (!process.env.CLOUDFLARE_EMAIL || !process.env.CLOUDFLARE_API_KEY)) {
      fail('You are not logged into Cloudflare. To log in, set credentials and run: cf auth login'); return;
    }
    const identity = await cf.get('/user');
    const status = { authenticated: true, profile: process.env.CLOUDFLARE_PROFILE || data.active || 'environment', method: process.env.CLOUDFLARE_API_TOKEN ? 'api-token' : 'api-key', email: process.env.CLOUDFLARE_EMAIL || null, id: identity?.result?.id || null };
    return outputJson ? toJsonOutput(status) : printer.log(`${status.profile} authenticated${status.email ? ` as ${status.email}` : ''}`);
  }
  if (action === 'verify') {
    if (!process.env.CLOUDFLARE_API_TOKEN) { fail('cf auth verify requires CLOUDFLARE_API_TOKEN'); return; }
    const result = await cf.get('/user/tokens/verify');
    const verified = { verified: result?.result?.status === 'active', status: result?.result?.status || 'unknown' };
    return outputJson ? toJsonOutput(verified) : printer.log(`${verified.status}`);
  }
  fail(`Unknown auth action: ${action}`);
}
