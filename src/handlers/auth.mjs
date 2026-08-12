import { readProfiles, writeProfiles } from '../profiles.mjs';
import { printTable } from '../output.mjs';
import { deleteCredential, writeCredential } from '../credentials.mjs';

export async function handleAuth({ cf, action, opts, outputJson, printer, toJsonOutput, fail, profileHome, profileFs, read = readProfiles, write = writeProfiles }) {
  const data = read(profileHome, profileFs);
  if (action === 'list') {
    const profiles = Object.entries(data.profiles).map(([name, value]) => ({ name, email: value.email || null, active: name === data.active }));
    if (!profiles.length) profiles.push({ name: 'environment', email: process.env.CLOUDFLARE_EMAIL || null, active: true });
    return outputJson ? toJsonOutput(profiles) : printTable(['ACTIVE', 'NAME', 'EMAIL'], profiles.map(profile => [profile.active ? '*' : '', profile.name, profile.email || '(not configured)']), printer.log);
  }
  if (action === 'login') {
    const name = opts?.profile || 'default';
    if (!process.env.CLOUDFLARE_API_TOKEN && (!process.env.CLOUDFLARE_EMAIL || !process.env.CLOUDFLARE_API_KEY)) { fail('To log in, set CLOUDFLARE_API_TOKEN or CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY, then run: cf auth login'); return; }
    const credential = { email: process.env.CLOUDFLARE_EMAIL, apiKey: process.env.CLOUDFLARE_API_KEY, apiToken: process.env.CLOUDFLARE_API_TOKEN };
    const storedInKeychain = await writeCredential(name, credential);
    data.profiles[name] = { accountId: process.env.CLOUDFLARE_ACCOUNT_ID, zoneId: process.env.CLOUDFLARE_ZONE_ID, ...(storedInKeychain ? {} : credential) };
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
