import { jest } from '@jest/globals';
import { refreshOAuth, revokeOAuth, loginOAuth } from '../src/oauth.mjs';

test('OAuth refresh and revoke use Cloudflare token endpoints', async () => {
  const fetchImpl = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'new', refresh_token: 'next', expires_in: 120 }) }).mockResolvedValueOnce({ ok: true });
  const refreshed = await refreshOAuth({ refreshToken: 'old', clientId: 'client', fetchImpl });
  expect(refreshed.accessToken).toBe('new'); await revokeOAuth({ accessToken: 'new', clientId: 'client', fetchImpl });
  expect(fetchImpl).toHaveBeenCalledTimes(2); expect(fetchImpl.mock.calls[0][1].body.get('grant_type')).toBe('refresh_token');
});

test('OAuth login validates client configuration before opening a browser', async () => {
  await expect(loginOAuth({ clientId: '' })).rejects.toThrow('Missing CF_OAUTH_CLIENT_ID');
});
