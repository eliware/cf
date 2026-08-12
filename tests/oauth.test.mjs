import { jest } from '@jest/globals';
import { openBrowser, refreshOAuth, revokeOAuth, loginOAuth } from '../src/oauth.mjs';
import http from 'node:http';
import { EventEmitter } from 'node:events';

test('OAuth refresh and revoke use Cloudflare token endpoints', async () => {
  const fetchImpl = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'new', refresh_token: 'next', expires_in: 120 }) }).mockResolvedValueOnce({ ok: true });
  const refreshed = await refreshOAuth({ refreshToken: 'old', clientId: 'client', fetchImpl });
  expect(refreshed.accessToken).toBe('new'); await revokeOAuth({ accessToken: 'new', clientId: 'client', fetchImpl });
  expect(fetchImpl).toHaveBeenCalledTimes(2); expect(fetchImpl.mock.calls[0][1].body.get('grant_type')).toBe('refresh_token');
});

test('browser launcher selects the native command for each platform', () => {
  for (const platform of ['darwin', 'win32', 'linux']) {
    const unref = jest.fn(); const spawnImpl = jest.fn(() => ({ unref }));
    openBrowser('https://example.test', { platform, spawnImpl });
    expect(spawnImpl).toHaveBeenCalledWith(platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open', ['https://example.test'], expect.objectContaining({ shell: platform === 'win32' }));
    expect(unref).toHaveBeenCalled();
  }
});

test('OAuth login validates client configuration before opening a browser', async () => {
  await expect(loginOAuth({ clientId: '' })).rejects.toThrow('Missing CF_OAUTH_CLIENT_ID');
});

test('OAuth login serves a state-protected callback and exchanges the code', async () => {
  const printed = [];
  const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: 'access', refresh_token: 'refresh', expires_in: 30 }) });
  const resultPromise = loginOAuth({ clientId: 'client', ports: [0], open: jest.fn(), print: value => printed.push(value), fetchImpl });
  await new Promise(resolve => setTimeout(resolve, 10));
  const authorization = new URL(printed[0].split('\n')[1]);
  await new Promise((resolve, reject) => http.get(`${authorization.searchParams.get('redirect_uri').replace('/oauth/callback', '/wrong')}?state=${authorization.searchParams.get('state')}`, response => { expect(response.statusCode).toBe(404); response.resume(); response.on('end', resolve); }).on('error', reject));
  await new Promise((resolve, reject) => http.get(`${authorization.searchParams.get('redirect_uri')}?state=${authorization.searchParams.get('state')}&code=code`, response => { response.resume(); response.on('end', resolve); }).on('error', reject));
  await expect(resultPromise).resolves.toMatchObject({ accessToken: 'access', refreshToken: 'refresh' });
  expect(fetchImpl).toHaveBeenCalledWith('https://dash.cloudflare.com/oauth2/token', expect.any(Object));
});

test('OAuth token helpers report failed and malformed responses', async () => {
  await expect(refreshOAuth({ refreshToken: 'old', fetchImpl: jest.fn().mockResolvedValue({ ok: false, status: 401 }) })).rejects.toThrow('401');
  await expect(refreshOAuth({ refreshToken: 'old', fetchImpl: jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) })).rejects.toThrow('access_token');
  await expect(revokeOAuth({ accessToken: 'access', fetchImpl: jest.fn().mockResolvedValue({ ok: false }) })).resolves.toBe(false);
});

test('OAuth login falls back when the first callback port is busy', async () => {
  const occupied = http.createServer();
  await new Promise(resolve => occupied.listen(8765, '127.0.0.1', resolve));
  try {
    const printed = [];
    const promise = loginOAuth({ clientId: 'client', ports: [8765, 0], open: jest.fn(), print: value => printed.push(value), fetchImpl: jest.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: 'access' }) }) });
    await new Promise(resolve => setTimeout(resolve, 10));
    const authorization = new URL(printed[0].split('\n')[1]);
    await new Promise((resolve, reject) => http.get(`${authorization.searchParams.get('redirect_uri')}?state=${authorization.searchParams.get('state')}&code=code`, response => { response.resume(); response.on('end', resolve); }).on('error', reject));
    await expect(promise).resolves.toMatchObject({ accessToken: 'access' });
  } finally {
    await new Promise(resolve => occupied.close(resolve));
  }
});

test('OAuth callback rejects invalid state and provider errors', async () => {
  for (const providerError of [false, true]) {
    const printed = [];
    const promise = loginOAuth({ clientId: 'client', ports: [0], open: jest.fn(), print: value => printed.push(value) });
    await new Promise(resolve => setTimeout(resolve, 10));
    const authorization = new URL(printed[0].split('\n')[1]);
    const rejection = expect(promise).rejects.toThrow(providerError ? 'Cloudflare authorization failed' : 'Invalid OAuth state');
    const query = providerError ? `state=${authorization.searchParams.get('state')}&error=access_denied` : 'state=wrong&code=code';
    await new Promise((resolve, reject) => http.get(`${authorization.searchParams.get('redirect_uri')}?${query}`, response => { response.resume(); response.on('end', resolve); }).on('error', reject));
    await rejection;
  }
});

test('OAuth callback reports token exchange and response errors', async () => {
  for (const [fetchImpl, message] of [
    [jest.fn().mockResolvedValue({ ok: false, status: 500 }), 'OAuth token exchange failed'],
    [jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }), 'OAuth token response did not include'],
  ]) {
    const printed = [];
    const promise = loginOAuth({ clientId: 'client', ports: [0], open: jest.fn(), print: value => printed.push(value), fetchImpl });
    await new Promise(resolve => setTimeout(resolve, 10));
    const authorization = new URL(printed[0].split('\n')[1]);
    const rejection = expect(promise).rejects.toThrow(message);
    await new Promise((resolve, reject) => http.get(`${authorization.searchParams.get('redirect_uri')}?state=${authorization.searchParams.get('state')}&code=code`, response => { response.resume(); response.on('end', resolve); }).on('error', reject));
    await rejection;
  }
});

test('OAuth login reports exhausted and non-retryable callback listeners', async () => {
  class FailingServer extends EventEmitter {
    constructor(code) { super(); this.code = code; }
    listen() { process.nextTick(() => this.emit('error', Object.assign(new Error(this.code), { code: this.code }))); }
    close() {}
  }
  await expect(loginOAuth({ clientId: 'client', ports: [1, 2], serverFactory: () => new FailingServer('EADDRINUSE'), open: jest.fn() })).rejects.toThrow('No OAuth callback port available');
  await expect(loginOAuth({ clientId: 'client', ports: [1], serverFactory: () => new FailingServer('EACCES'), open: jest.fn() })).rejects.toThrow('EACCES');
});
