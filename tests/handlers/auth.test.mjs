import { jest } from '@jest/globals';
import { handleAuth } from '../../src/handlers/auth.mjs';

const base = () => ({ cf: { get: jest.fn().mockResolvedValue({ result: { id: 'user-1' } }) },
  outputJson: true, printer: { log: jest.fn() }, toJsonOutput: jest.fn(), fail: jest.fn() });

const stored = () => ({ active: 'work', profiles: { work: { email: 'work@example.com', apiKey: 'key' }, other: { email: 'other@example.com' } } });

test('auth status verifies identity without exposing the key', async () => {
  const old = { email: process.env.CLOUDFLARE_EMAIL, key: process.env.CLOUDFLARE_API_KEY };
  process.env.CLOUDFLARE_EMAIL = 'user@example.com'; process.env.CLOUDFLARE_API_KEY = 'secret';
  const ctx = base(); await handleAuth({ ...ctx, action: 'status' });
  expect(ctx.cf.get).toHaveBeenCalledWith('/user');
  expect(ctx.toJsonOutput).toHaveBeenCalledWith({ authenticated: true, profile: 'environment', method: 'api-key', email: 'user@example.com', id: 'user-1' });
  process.env.CLOUDFLARE_EMAIL = old.email; process.env.CLOUDFLARE_API_KEY = old.key;
});

test('auth lists saved profiles in JSON and text formats', async () => {
  const read = jest.fn(() => stored());
  const json = base(); await handleAuth({ ...json, action: 'list', read });
  expect(json.toJsonOutput).toHaveBeenCalledWith(expect.arrayContaining([{ name: 'work', email: 'work@example.com', active: true }]));
  const text = base(); text.outputJson = false; await handleAuth({ ...text, action: 'list', read });
  expect(text.printer.log).toHaveBeenCalledWith('ACTIVE  NAME   EMAIL\n------  ----   -----\n*       work   work@example.com\n        other  other@example.com');
  const missingEmail = base(); missingEmail.outputJson = false;
  await handleAuth({ ...missingEmail, action: 'list', read: () => ({ active: 'blank', profiles: { blank: {} } }) });
  expect(missingEmail.printer.log).toHaveBeenCalledWith('ACTIVE  NAME   EMAIL\n------  ----   -----\n*       blank  (not configured)');
});

test('auth status supports API-token authentication', async () => {
  const old = { email: process.env.CLOUDFLARE_EMAIL, key: process.env.CLOUDFLARE_API_KEY, token: process.env.CLOUDFLARE_API_TOKEN };
  delete process.env.CLOUDFLARE_EMAIL; delete process.env.CLOUDFLARE_API_KEY; process.env.CLOUDFLARE_API_TOKEN = 'token';
  const ctx = base(); await handleAuth({ ...ctx, action: 'status' });
  expect(ctx.toJsonOutput).toHaveBeenCalledWith({ authenticated: true, profile: 'environment', method: 'api-token', email: null, id: 'user-1' });
  process.env.CLOUDFLARE_EMAIL = old.email; process.env.CLOUDFLARE_API_KEY = old.key; process.env.CLOUDFLARE_API_TOKEN = old.token;
});

test('auth verify checks active API tokens', async () => {
  const old = process.env.CLOUDFLARE_API_TOKEN; process.env.CLOUDFLARE_API_TOKEN = 'token';
  const ctx = base(); ctx.cf.get.mockResolvedValue({ result: { status: 'active' } });
  await handleAuth({ ...ctx, action: 'verify' });
  expect(ctx.cf.get).toHaveBeenCalledWith('/user/tokens/verify');
  expect(ctx.toJsonOutput).toHaveBeenCalledWith({ verified: true, status: 'active' });
  ctx.outputJson = false; ctx.cf.get.mockResolvedValue({ result: { status: 'inactive' } });
  await handleAuth({ ...ctx, action: 'verify' });
  expect(ctx.printer.log).toHaveBeenCalledWith('inactive');
  ctx.outputJson = true; ctx.cf.get.mockResolvedValue({ result: {} });
  await handleAuth({ ...ctx, action: 'verify' });
  expect(ctx.toJsonOutput).toHaveBeenCalledWith({ verified: false, status: 'unknown' });
  delete process.env.CLOUDFLARE_API_TOKEN;
  await handleAuth({ ...ctx, action: 'verify' });
  expect(ctx.fail).toHaveBeenCalledWith(expect.stringContaining('requires'));
  process.env.CLOUDFLARE_API_TOKEN = old;
});

test('auth list reports the active context', async () => {
  const old = process.env.CLOUDFLARE_EMAIL; process.env.CLOUDFLARE_EMAIL = 'user@example.com';
  const ctx = base(); await handleAuth({ ...ctx, action: 'list' });
  expect(ctx.toJsonOutput).toHaveBeenCalledWith([{ name: 'environment', email: 'user@example.com', active: true }]);
  process.env.CLOUDFLARE_EMAIL = old;
});

test('auth status rejects missing credentials and unknown actions', async () => {
  const old = { email: process.env.CLOUDFLARE_EMAIL, key: process.env.CLOUDFLARE_API_KEY };
  delete process.env.CLOUDFLARE_EMAIL; delete process.env.CLOUDFLARE_API_KEY; delete process.env.CLOUDFLARE_API_TOKEN;
  const ctx = base(); await handleAuth({ ...ctx, action: 'status' }); await handleAuth({ ...ctx, action: 'login' });
  expect(ctx.fail).toHaveBeenCalledTimes(2);
  process.env.CLOUDFLARE_EMAIL = old.email; process.env.CLOUDFLARE_API_KEY = old.key;
});

test('auth text output and missing identity id are safe', async () => {
  const old = { email: process.env.CLOUDFLARE_EMAIL, key: process.env.CLOUDFLARE_API_KEY };
  process.env.CLOUDFLARE_EMAIL = 'user@example.com'; process.env.CLOUDFLARE_API_KEY = 'secret';
  const ctx = base(); ctx.outputJson = false; ctx.cf.get.mockResolvedValue({ result: {} });
  await handleAuth({ ...ctx, action: 'status' });
  expect(ctx.printer.log).toHaveBeenCalledWith('user@example.com authenticated');
  delete process.env.CLOUDFLARE_EMAIL;
  await handleAuth({ ...ctx, action: 'list' });
  expect(ctx.printer.log).toHaveBeenCalledWith('ACTIVE  NAME         EMAIL\n------  ----         -----\n*       environment  (not configured)');
  process.env.CLOUDFLARE_EMAIL = old.email; process.env.CLOUDFLARE_API_KEY = old.key;
});

test('auth login, switch, logout, and profile errors use injected storage', async () => {
  const old = { email: process.env.CLOUDFLARE_EMAIL, key: process.env.CLOUDFLARE_API_KEY };
  process.env.CLOUDFLARE_EMAIL = 'new@example.com'; process.env.CLOUDFLARE_API_KEY = 'new-key';
  const write = jest.fn(); const read = jest.fn(() => stored());
  const login = base(); await handleAuth({ ...login, action: 'login', opts: { profile: 'new' }, read, write });
  expect(write).toHaveBeenCalled();
  const switched = base(); await handleAuth({ ...switched, action: 'switch', opts: { profile: 'other' }, read, write });
  const logout = base(); await handleAuth({ ...logout, action: 'logout', opts: { profile: 'other' }, read, write });
  const logoutActive = base(); await handleAuth({ ...logoutActive, action: 'logout', opts: { profile: 'work' }, read, write });
  expect(write).toHaveBeenCalledTimes(4);
  const bad = base(); await handleAuth({ ...bad, action: 'switch', opts: {}, read, write });
  await handleAuth({ ...bad, action: 'logout', opts: { profile: 'missing' }, read, write });
  expect(bad.fail).toHaveBeenCalledTimes(2);
  delete process.env.CLOUDFLARE_EMAIL; delete process.env.CLOUDFLARE_API_KEY;
  await handleAuth({ ...bad, action: 'login', opts: {}, read, write });
  const defaultLogout = base(); await handleAuth({ ...defaultLogout, action: 'logout', opts: {}, read, write });
  expect(defaultLogout.fail).not.toHaveBeenCalled();
  const unknown = base(); await handleAuth({ ...unknown, action: 'unknown', opts: {}, read, write });
  expect(unknown.fail).toHaveBeenCalledWith('Unknown auth action: unknown');
  const noProfile = base(); await handleAuth({ ...noProfile, action: 'logout', opts: {}, read: () => ({ active: null, profiles: {} }), write });
  const last = base(); await handleAuth({ ...last, action: 'logout', opts: { profile: 'only' }, read: () => ({ active: 'only', profiles: { only: {} } }), write });
  process.env.CLOUDFLARE_EMAIL = old.email; process.env.CLOUDFLARE_API_KEY = old.key;
});
