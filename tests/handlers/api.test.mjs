import { jest } from '@jest/globals';
import { handleApi } from '../../src/handlers/api.mjs';

function context(overrides = {}) {
  return {
    cf: { get: jest.fn().mockResolvedValue({ result: ['ok'] }), post: jest.fn() },
    action: 'zones', opts: {}, body: null, outputJson: true,
    printer: { log: jest.fn(), error: jest.fn() }, fail: jest.fn(), ...overrides,
  };
}

test('calls a relative GET path and normalizes it', async () => {
  const ctx = context();
  await handleApi(ctx);
  expect(ctx.cf.get).toHaveBeenCalledWith('/zones', undefined);
  expect(ctx.printer.log).toHaveBeenCalledWith(expect.stringContaining('ok'));
});

test('API GET can paginate', async () => {
  const ctx = context({ opts: { paginate: true } });
  ctx.cf.get.mockResolvedValueOnce({ result: [{ page: 1 }], result_info: { total_pages: 2, total_count: 2 } }).mockResolvedValue({ result: [{ page: 2 }], result_info: { total_pages: 2 } });
  await handleApi(ctx);
  expect(ctx.cf.get).toHaveBeenCalledWith('/zones?page=2&per_page=100', undefined);
  expect(ctx.printer.log).toHaveBeenCalledWith(expect.stringContaining('page'));
});

test('API supports template output', async () => {
  const ctx = context({ opts: { template: '{{.name}}' } }); ctx.cf.get.mockResolvedValue({ name: 'example.com' });
  await handleApi(ctx); expect(ctx.printer.log).toHaveBeenCalledWith('example.com');
});

test('API errors propagate to the caller for diagnostics', async () => {
  const ctx = context(); const error = new Error('rate limited'); ctx.cf.get.mockRejectedValue(error);
  await expect(handleApi(ctx)).rejects.toBe(error);
});

test('calls mutation with JSON body', async () => {
  const ctx = context({ action: '/zones', opts: { method: 'post' }, body: { name: 'x' } });
  await handleApi(ctx);
  expect(ctx.cf.post).toHaveBeenCalledWith('/zones', { body: { name: 'x' } });
});

test('supports dry-run without calling the client', async () => {
  const ctx = context({ action: 'zones/1', opts: { method: 'DELETE', dryRun: true } });
  await handleApi(ctx);
  expect(ctx.cf.get).not.toHaveBeenCalled();
  expect(ctx.printer.log).toHaveBeenCalledWith(expect.stringContaining('dryRun'));
});

test.each([
  [{ action: '' }, 'requires a path'],
  [{ action: 'https://example.com' }, 'relative'],
  [{ opts: { method: 'TRACE' } }, 'Unsupported'],
  [{ body: {}, opts: {} }, 'GET requests'],
  [{ opts: { method: 'DELETE' } }, 'DELETE'],
])('rejects invalid API request %#', async (overrides, message) => {
  const ctx = context(overrides);
  await handleApi(ctx);
  expect(ctx.fail).toHaveBeenCalledWith(expect.stringContaining(message));
});

test('rejects an unsupported client method', async () => {
  const ctx = context({ action: 'zones', opts: { method: 'PUT' }, cf: {} });
  await handleApi(ctx);
  expect(ctx.fail).toHaveBeenCalledWith(expect.stringContaining('client does not support'));
});
