import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';
import scopeCatalog from '../data/cloudflare-oauth-scopes.json' with { type: 'json' };
import moduleCatalog from '../data/cloudflare-oauth-modules.json' with { type: 'json' };

export const DEFAULT_OAUTH_PORTS = [8765, 8766, 8767, 8768, 8769];
export const DEFAULT_OAUTH_SCOPES = [
  'account-settings.read', 'user-details.read', 'zone.read', 'zone.write',
  'zone-settings.read', 'zone-settings.write', 'dns.read', 'dns.write',
  'account-rulesets.read', 'account-rulesets.write', 'account-rule-lists.read', 'account-rule-lists.write',
  'zone-waf.read', 'zone-waf.write', 'ssl-and-certificates.read', 'ssl-and-certificates.write',
  'cache.purge', 'healthcheck.read', 'healthcheck.write', 'account-logs.read',
  'load-balancing-monitors-and-pools.read', 'load-balancing-monitors-and-pools.write',
  'argotunnel.read', 'argotunnel.write', 'workers-scripts.read', 'workers-scripts.write', 'workers-scripts.bind',
  'page.read', 'page.write', 'workers-r2.read', 'workers-r2.write', 'd1.read', 'd1.write',
  'queues.read', 'queues.write', 'stream.read', 'stream.write', 'images.read', 'images.write',
  'ai.read', 'ai.write', 'access.read', 'access.write',
];
export const DEFAULT_OAUTH_CLIENT_ID = 'f4fb39624f6674b6fb50d5a793a23389';
const AUTH_URL = 'https://dash.cloudflare.com/oauth2/auth';
const TOKEN_URL = 'https://dash.cloudflare.com/oauth2/token';
const USER_URL = 'https://api.cloudflare.com/client/v4/user';

function base64url(value) { return value.toString('base64url'); }
export function openBrowser(url, options, spawnImpl = spawn) {
  const { platform = process.platform, spawnImpl: configuredSpawnImpl = spawnImpl } = options ?? {};
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  return configuredSpawnImpl(command, [url], { detached: true, stdio: 'ignore', shell: platform === 'win32' }).unref();
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

/* istanbul ignore next */
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
function successPage({ account, scopes }) {
  const name = account?.name || account?.email || 'your Cloudflare account';
  const scopeCount = scopes.length;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cloudflare connected · cf</title><style> :root{color-scheme:dark;--bg:#09111f;--card:#111d31;--muted:#a9b8d0;--accent:#f6821f}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 15% 0,#263a63 0,transparent 42%),var(--bg);color:#f6f8fc;font:16px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;place-items:center;padding:24px}.card{max-width:680px;width:100%;background:rgba(17,29,49,.92);border:1px solid #2c4165;border-radius:28px;padding:42px;box-shadow:0 24px 80px #0006}.mark{width:54px;height:54px;border-radius:16px;background:var(--accent);display:grid;place-items:center;font-weight:800;font-size:24px}.check{color:#73e6a1;font-size:40px;margin:28px 0 4px}h1{font-size:clamp(30px,6vw,52px);line-height:1.03;margin:0 0 14px}p{color:var(--muted);line-height:1.6}.account{color:#fff;font-weight:700}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:28px 0}.stat{background:#192943;border-radius:16px;padding:16px}.stat strong{display:block;font-size:24px}.stat span{color:var(--muted);font-size:13px}.next{border-top:1px solid #2c4165;padding-top:22px}.next code{color:#ffd39e;background:#0b1526;padding:3px 6px;border-radius:6px}small{color:#7f91ad}@media(max-width:520px){.card{padding:28px}.grid{grid-template-columns:1fr}}</style></head><body><main class="card"><div class="mark">cf</div><div class="check">✓</div><h1>Cloudflare connected.</h1><p>You’re signed in as <span class="account">${escapeHtml(name)}</span>. Your profile is ready to use from the command line.</p><div class="grid"><div class="stat"><strong>${scopeCount}</strong><span>approved scopes</span></div><div class="stat"><strong>Ready</strong><span>OAuth profile active</span></div></div><section class="next"><h2>Get started</h2><p>Close this tab and try <code>cf zone list</code>. Use <code>cf auth status --json</code> to inspect the active profile. For additional raw API capabilities, log in again with extra scopes using <code>cf auth login --scopes scope.one,scope.two</code>.</p><small>Your access token stays in the local credential store and is never shown here.</small></section></main></body></html>`;
}

const SCOPE_CATALOG = {
  'Built-in commands': DEFAULT_OAUTH_SCOPES,
  'DNS & zones': ['zone.write', 'zone-settings.read', 'zone-settings.write', 'dns.read', 'dns.write'],
  'Rules & security': ['account-rulesets.read', 'account-rulesets.write', 'account-rule-lists.write', 'zone-waf.read', 'zone-waf.write'],
  'SSL & performance': ['ssl-and-certificates.read', 'ssl-and-certificates.write', 'cache.purge', 'healthcheck.read', 'healthcheck.write'],
  'Platform services': ['workers-scripts.read', 'workers-scripts.write', 'workers-scripts.bind', 'page.read', 'page.write', 'workers-r2.read', 'workers-r2.write', 'd1.read', 'd1.write', 'queues.read', 'queues.write', 'stream.read', 'stream.write', 'images.read', 'images.write', 'ai.read', 'ai.write', 'argotunnel.read', 'argotunnel.write', 'access.read', 'access.write'],
};
const SCOPE_CATALOG_DATA = scopeCatalog.categories;
const MODULE_CATALOG = moduleCatalog.modules;
const ALLOWED_OAUTH_SCOPES = new Set(Object.values(SCOPE_CATALOG_DATA).flatMap(features => features.flatMap(feature => feature.scopes.map(scope => scope.scope))));
/* istanbul ignore next */
function scopePickerPage(scopes) {
  const groups = Object.entries(SCOPE_CATALOG).map(([name, values]) => `<fieldset><legend>${escapeHtml(name)}</legend>${values.map(scope => `<label><input type="checkbox" name="scope" value="${escapeHtml(scope)}" ${scopes.includes(scope) ? 'checked' : ''}> ${escapeHtml(scope)}</label>`).join('')}</fieldset>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Set up cf</title><style>:root{color-scheme:dark;--bg:#09111f;--card:#111d31;--muted:#a9b8d0;--accent:#f6821f}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 15% 0,#263a63,transparent 42%),var(--bg);color:#f6f8fc;font:15px system-ui,sans-serif;padding:24px}main{max-width:820px;margin:0 auto;background:#111d31ef;border:1px solid #2c4165;border-radius:28px;padding:clamp(24px,5vw,48px);box-shadow:0 24px 80px #0006}h1{font-size:clamp(32px,6vw,52px);margin:12px 0}p{color:var(--muted);line-height:1.6}.mark{color:#fff;background:var(--accent);display:inline-grid;place-items:center;width:54px;height:54px;border-radius:16px;font-weight:800;font-size:23px}fieldset{border:1px solid #2c4165;border-radius:15px;margin:16px 0;padding:14px}legend{color:#ffd39e;font-weight:700;padding:0 8px}label{display:inline-block;background:#192943;border-radius:8px;padding:9px;margin:4px;color:#dce6f6}input{accent-color:var(--accent)}button{border:0;border-radius:12px;background:var(--accent);color:#fff;font-weight:700;font-size:16px;padding:14px 20px;cursor:pointer}#count{color:#73e6a1;font-weight:700}</style></head><body><main><div class="mark">cf</div><h1>Set up your Cloudflare CLI</h1><p>Choose the capabilities you want to grant. Built-in command scopes are selected for you. Add advanced scopes when you plan to use <code>cf api</code>.</p><form method="post" action="/oauth/start">${groups}<p><span id="count"></span> selected</p><button type="submit">Continue to Cloudflare</button></form><script>const boxes=[...document.querySelectorAll('input')];const count=()=>document.querySelector('#count').textContent=boxes.filter(x=>x.checked).length;boxes.forEach(x=>x.addEventListener('change',count));count();</script></main></body></html>`;
}
void scopePickerPage;
function groupedScopePickerPage() {
  const moduleButtons = tier => MODULE_CATALOG.filter(module => module.tier === tier).map(module => `<button type="button" class="module" data-module="${escapeHtml(module.id)}"><span class="check">✓</span><strong>${escapeHtml(module.name)}</strong><small>${escapeHtml(module.description)}</small></button>`).join('');
  const categories = Object.entries(SCOPE_CATALOG_DATA).map(([name, features]) => `<details class="category"><summary>${escapeHtml(name)} <b data-count="${escapeHtml(name)}">0</b></summary><div class="category-actions"><button type="button" data-category-enable="${escapeHtml(name)}">Enable all</button><button type="button" data-category-disable="${escapeHtml(name)}">Disable all</button></div>${features.map(feature => `<div class="feature"><strong>${escapeHtml(feature.name)}</strong><span>${feature.scopes.map(scope => `<label><input type="checkbox" data-scope value="${escapeHtml(scope.scope)}"> ${escapeHtml(scope.label)}</label>`).join('')}</span></div>`).join('')}</details>`).join('');
  const model = JSON.stringify({ categories: SCOPE_CATALOG_DATA, modules: MODULE_CATALOG }).replace(/</g, '\\u003c');
  return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Set up cf</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;padding:16px;background:#09111f;color:#f6f8fc;font:15px system-ui}main{max-width:980px;margin:auto;padding:clamp(20px,4vw,44px);background:#111d31;border:1px solid #2c4165;border-radius:24px}h1{font-size:clamp(32px,6vw,56px)}p{color:#a9b8d0;line-height:1.5}.hero,.tools,.category-actions{display:flex;flex-wrap:wrap;gap:10px}.hero button,.tools button,.category-actions button,.login{padding:11px 14px;border:1px solid #2c4165;border-radius:12px;background:#192943;color:inherit;font-weight:700;cursor:pointer}.module{min-width:190px;min-height:74px;text-align:left;display:grid;grid-template-columns:28px 1fr;gap:4px}.module small{grid-column:2;color:#a9b8d0;font-weight:400}.module.active{border-color:#f6821f;background:#3b2b1d}.check{color:#647895}.active .check{color:#fff}.login{width:100%;margin:20px 0;background:#2878ee}.login:disabled{opacity:.45;cursor:not-allowed}.count{color:#73e6a1;font-weight:700}.category{border-top:1px dashed #2c4165;padding:14px 0}.category summary{cursor:pointer;font-weight:700}.category summary b{float:right;color:#a9b8d0}.feature{padding:12px 0;border-top:1px dashed #233653}.feature span{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.feature label{padding:7px 9px;border-radius:8px;background:#192943;color:#dce6f6;font-size:13px}@media(max-width:600px){.module{min-width:calc(50% - 5px)}.feature strong{display:block}}button:focus-visible{outline:2px solid #f6821f}</style><main><h1>Choose what cf can do</h1><p>Choose a ready-to-use module or fine-tune individual Cloudflare permissions. Nothing is selected by default.</p><h2>Basic modules</h2><div class="hero"><button type="button" data-tier="basic" data-enable>Enable all basic</button><button type="button" data-tier="basic" data-disable>Disable all basic</button>${moduleButtons('basic')}</div><h2>Advanced modules</h2><div class="hero"><button type="button" data-tier="advanced" data-enable>Enable all advanced</button><button type="button" data-tier="advanced" data-disable>Disable all advanced</button>${moduleButtons('advanced')}</div><form method="post" action="/oauth/start"><button class="login" type="submit" disabled>Log in with Cloudflare</button><p class="count"><span id="selected">0</span> scopes selected</p><div class="tools"><button type="button" data-all-enable>Enable all scopes</button><button type="button" data-all-disable>Disable all scopes</button><button type="button" data-expand>Expand all</button><button type="button" data-collapse>Collapse all</button></div>${categories}<button class="login" type="submit" disabled>Log in with Cloudflare</button></form></main><script>const model=${model},boxes=[...document.querySelectorAll('[data-scope]')],selected=new Set(),enabled=new Set(),owners=new Map();model.modules.forEach(m=>m.scopes.forEach(s=>{if(!owners.has(s))owners.set(s,[]);owners.get(s).push(m.id)}));const byId=new Map(model.modules.map(m=>[m.id,m]));const render=()=>{boxes.forEach(b=>b.checked=selected.has(b.value));document.querySelector('#selected').textContent=selected.size;document.querySelectorAll('.login').forEach(b=>b.disabled=!selected.size);document.querySelectorAll('[data-module]').forEach(b=>b.classList.toggle('active',enabled.has(b.dataset.module)))};const enable=id=>{const m=byId.get(id);if(!m)return;enabled.add(id);m.scopes.forEach(s=>selected.add(s))};const disable=id=>{const m=byId.get(id);if(!m)return;enabled.delete(id);m.scopes.forEach(s=>{if(!(owners.get(s)||[]).some(id=>enabled.has(id)))selected.delete(s)})};document.querySelectorAll('[data-module]').forEach(b=>b.onclick=()=>{enabled.has(b.dataset.module)?disable(b.dataset.module):enable(b.dataset.module);render()});document.querySelectorAll('[data-tier]').forEach(b=>b.onclick=()=>{model.modules.filter(m=>m.tier===b.dataset.tier).forEach(m=>b.hasAttribute('data-enable')?enable(m.id):disable(m.id));render()});document.querySelectorAll('[data-scope]').forEach(b=>b.onchange=()=>{b.checked?selected.add(b.value):selected.delete(b.value);if(!b.checked)(owners.get(b.value)||[]).forEach(id=>enabled.delete(id));render()});document.querySelector('[data-all-enable]').onclick=()=>{boxes.forEach(b=>selected.add(b.value));render()};document.querySelector('[data-all-disable]').onclick=()=>{selected.clear();enabled.clear();render()};document.querySelector('[data-expand]').onclick=()=>document.querySelectorAll('.category').forEach(c=>c.open=true);document.querySelector('[data-collapse]').onclick=()=>document.querySelectorAll('.category').forEach(c=>c.open=false);render()</script>`;
}
function readRequestBody(request) { return new Promise(resolve => { let body = ''; request.on('data', chunk => { body += chunk; }); request.on('end', () => resolve(new URLSearchParams(body))); }); }

export async function loginOAuth({ clientId, scopes = DEFAULT_OAUTH_SCOPES, scopePicker = false, ports = DEFAULT_OAUTH_PORTS, bindHost = '127.0.0.1', redirectHost = '127.0.0.1', fetchImpl = fetch, open = openBrowser, print = console.log, serverFactory = http.createServer }) {
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
  const makeAuthorization = selected => { const authorization = new URL(AUTH_URL); authorization.search = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: selected.join(' '), code_challenge: challenge, code_challenge_method: 'S256', state }).toString(); return authorization; };
  let selectedScopes = [...scopes];
  print(`Open this URL to ${scopePicker ? 'set up cf' : 'authorize cf'}:\n${scopePicker ? `http://${redirectHost}:${port}/` : makeAuthorization(selectedScopes)}`);
  const callback = new Promise((resolve, reject) => server.on('request', (request, response) => {
    const url = new URL(request.url, redirectUri);
    if (scopePicker && url.pathname === '/' && request.method === 'GET') { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(groupedScopePickerPage()); return; }
    if (scopePicker && url.pathname === '/oauth/start' && request.method === 'POST') { readRequestBody(request).then(form => { const requested = form.getAll('scope').filter(scope => ALLOWED_OAUTH_SCOPES.has(scope)); selectedScopes = [...new Set(requested.length ? requested : scopes)]; response.writeHead(302, { location: makeAuthorization(selectedScopes).toString() }); response.end(); }); return; }
    if (url.pathname !== '/oauth/callback') { response.writeHead(404); response.end(); return; }
    if (url.searchParams.get('state') !== state) { response.writeHead(400); response.end('Invalid OAuth state'); reject(new Error('Invalid OAuth state')); return; }
    const error = url.searchParams.get('error'); if (error) { response.writeHead(400); response.end('Cloudflare authorization failed'); reject(new Error(`Cloudflare authorization failed: ${error}`)); return; }
    resolve({ code: url.searchParams.get('code'), response });
  }));
  open(scopePicker ? `http://${redirectHost}:${port}/` : makeAuthorization(selectedScopes).toString());
  try {
    const { code, response: callbackResponse } = await callback;
    try {
      const response = await fetchImpl(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, code, redirect_uri: redirectUri, code_verifier: verifier }) });
      if (!response.ok) throw new Error(`OAuth token exchange failed (${response.status})`);
      const tokens = await response.json(); if (!tokens.access_token) throw new Error('OAuth token response did not include access_token');
      let account = null;
      try { const accountResponse = await fetchImpl(USER_URL, { headers: { authorization: `Bearer ${tokens.access_token}` } }); if (accountResponse.ok) account = (await accountResponse.json())?.result; } catch { /* account confirmation is best effort */ }
      callbackResponse.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); callbackResponse.end(successPage({ account, scopes: selectedScopes }));
      return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresIn: tokens.expires_in, expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000, scopes: selectedScopes, account };
    } catch (error) {
      callbackResponse.writeHead(400, { 'content-type': 'text/html; charset=utf-8' }); callbackResponse.end('<!doctype html><title>cf authorization failed</title><p>Cloudflare authorization could not be completed. You may close this window and try again.</p>');
      throw error;
    }
  } finally { server.close(); }
}
