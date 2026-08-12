import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';

export const DEFAULT_OAUTH_PORTS = [8765, 8766, 8767, 8768, 8769];
export const DEFAULT_OAUTH_SCOPES = ['account-settings.read', 'zone.read', 'account-rule-lists.read', 'user-details.read'];
export const DEFAULT_OAUTH_CLIENT_ID = 'f4fb39624f6674b6fb50d5a793a23389';
const AUTH_URL = 'https://dash.cloudflare.com/oauth2/auth';
const TOKEN_URL = 'https://dash.cloudflare.com/oauth2/token';

function base64url(value) { return value.toString('base64url'); }
function openBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  return spawn(command, [url], { detached: true, stdio: 'ignore', shell: process.platform === 'win32' }).unref();
}

export async function refreshOAuth({ refreshToken, clientId = DEFAULT_OAUTH_CLIENT_ID, fetchImpl = fetch }) {
  const response = await fetchImpl(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', client_id: clientId, refresh_token: refreshToken }) });
  if (!response.ok) throw new Error(`OAuth token refresh failed (${response.status})`);
  const tokens = await response.json(); if (!tokens.access_token) throw new Error('OAuth refresh response did not include access_token');
  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token || refreshToken, expiresIn: tokens.expires_in, expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000 };
}

export async function revokeOAuth({ accessToken, clientId = DEFAULT_OAUTH_CLIENT_ID, fetchImpl = fetch }) {
  const response = await fetchImpl('https://dash.cloudflare.com/oauth2/revoke', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: accessToken, client_id: clientId }) });
  return response.ok;
}

export async function loginOAuth({ clientId, scopes = DEFAULT_OAUTH_SCOPES, ports = DEFAULT_OAUTH_PORTS, bindHost = '127.0.0.1', redirectHost = '127.0.0.1', fetchImpl = fetch, open = openBrowser, print = console.log, serverFactory = http.createServer }) {
  if (!clientId) throw new Error('Missing CF_OAUTH_CLIENT_ID');
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  const state = base64url(crypto.randomBytes(24));
  let server; let port;
  for (const candidate of ports) {
    try {
      server = serverFactory();
      await new Promise((resolve, reject) => { const onError = error => { server.removeListener('listening', onListen); reject(error); }; const onListen = () => { server.removeListener('error', onError); resolve(); }; server.once('error', onError); server.once('listening', onListen); server.listen(candidate, bindHost); });
      port = server.address()?.port || candidate; break;
    } catch (error) { if (server) server.close(); if (error.code !== 'EADDRINUSE') throw error; }
  }
  if (!server || !port) throw new Error('No OAuth callback port available (tried 8765-8769)');
  const redirectUri = `http://${redirectHost}:${port}/oauth/callback`;
  const authorization = new URL(AUTH_URL); authorization.search = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: scopes.join(' '), code_challenge: challenge, code_challenge_method: 'S256', state }).toString();
  print(`Open this URL to authorize cf:\n${authorization}`);
  const callback = new Promise((resolve, reject) => server.on('request', (request, response) => {
    const url = new URL(request.url, redirectUri);
    if (url.pathname !== '/oauth/callback') { response.writeHead(404); response.end(); return; }
    if (url.searchParams.get('state') !== state) { response.writeHead(400); response.end('Invalid OAuth state'); reject(new Error('Invalid OAuth state')); return; }
    const error = url.searchParams.get('error'); if (error) { response.writeHead(400); response.end('Cloudflare authorization failed'); reject(new Error(`Cloudflare authorization failed: ${error}`)); return; }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end('<!doctype html><title>cf authorization complete</title><p>Cloudflare authorization complete. This window will close automatically.</p><script>window.close();</script>'); resolve(url.searchParams.get('code'));
  }));
  open(authorization.toString());
  try {
    const code = await callback; const response = await fetchImpl(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, code, redirect_uri: redirectUri, code_verifier: verifier }) });
    if (!response.ok) throw new Error(`OAuth token exchange failed (${response.status})`);
    const tokens = await response.json(); if (!tokens.access_token) throw new Error('OAuth token response did not include access_token');
    return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresIn: tokens.expires_in, expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000 };
  } finally { server.close(); }
}
