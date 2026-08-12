import { jest } from '@jest/globals';
import { handleAuth } from '../../src/handlers/auth.mjs';

const base = () => ({ cf: { get: jest.fn().mockResolvedValue({ result: { id: 'user-1' } }) },
  outputJson: true, printer: { log: jest.fn() }, toJsonOutput: jest.fn(), fail: jest.fn() });

test('auth status verifies identity without exposing the key', async () => {
  const old = { email: process.env.CLOUDFLARE_EMAIL, key: process.env.CLOUDFLARE_API_KEY };
  process.env.CLOUDFLARE_EMAIL = 'user@example.com'; process.env.CLOUDFLARE_API_KEY = 'secret';
  const ctx = base(); await handleAuth({ ...ctx, action: 'status' });
  expect(ctx.cf.get).toHaveBeenCalledWith('/user');
  expect(ctx.toJsonOutput).toHaveBeenCalledWith({ authenticated: true, method: 'api-key', email: 'user@example.com', id: 'user-1' });
  process.env.CLOUDFLARE_EMAIL = old.email; process.env.CLOUDFLARE_API_KEY = old.key;
});

test('auth status supports API-token authentication', async () => {
  const old = { email: process.env.CLOUDFLARE_EMAIL, key: process.env.CLOUDFLARE_API_KEY, token: process.env.CLOUDFLARE_API_TOKEN };
  delete process.env.CLOUDFLARE_EMAIL; delete process.env.CLOUDFLARE_API_KEY; process.env.CLOUDFLARE_API_TOKEN = 'token';
  const ctx = base(); await handleAuth({ ...ctx, action: 'status' });
  expect(ctx.toJsonOutput).toHaveBeenCalledWith({ authenticated: true, method: 'api-token', email: null, id: 'user-1' });
  process.env.CLOUDFLARE_EMAIL = old.email; process.env.CLOUDFLARE_API_KEY = old.key; process.env.CLOUDFLARE_API_TOKEN = old.token;
});

test('auth list reports the active context', async () => {
  const old = process.env.CLOUDFLARE_EMAIL; process.env.CLOUDFLARE_EMAIL = 'user@example.com';
  const ctx = base(); await handleAuth({ ...ctx, action: 'list' });
  expect(ctx.toJsonOutput).toHaveBeenCalledWith([{ name: 'default', email: 'user@example.com', active: true }]);
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
  expect(ctx.printer.log).toHaveBeenCalledWith('default (not configured)');
  process.env.CLOUDFLARE_EMAIL = old.email; process.env.CLOUDFLARE_API_KEY = old.key;
});
