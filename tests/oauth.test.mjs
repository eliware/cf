import { jest } from '@jest/globals';
import { refreshOAuth, revokeOAuth, loginOAuth } from '../src/oauth.mjs';
import http from 'node:http';

test('OAuth refresh and revoke use Cloudflare token endpoints', async () => {
  const fetchImpl = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'new', refresh_token: 'next', expires_in: 120 }) }).mockResolvedValueOnce({ ok: true });
  const refreshed = await refreshOAuth({ refreshToken: 'old', clientId: 'client', fetchImpl });
  expect(refreshed.accessToken).toBe('new'); await revokeOAuth({ accessToken: 'new', clientId: 'client', fetchImpl });
  expect(fetchImpl).toHaveBeenCalledTimes(2); expect(fetchImpl.mock.calls[0][1].body.get('grant_type')).toBe('refresh_token');
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
