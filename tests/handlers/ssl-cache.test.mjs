import { jest } from '@jest/globals';
import { handleSsl } from '../../src/handlers/ssl.mjs';
import { handleCache } from '../../src/handlers/cache.mjs';

const base = () => ({ cf: { get: jest.fn().mockResolvedValue({ ok: true }), patch: jest.fn().mockResolvedValue({ ok: true }), post: jest.fn().mockResolvedValue({ ok: true }) },
  opts: { 'zone-id': 'z1' }, body: { value: 'full' }, outputJson: true, printer: { log: jest.fn() }, toJsonOutput: jest.fn(), fail: jest.fn() });

test('ssl get and set use zone settings API', async () => {
  const ctx = base(); await handleSsl({ ...ctx, action: 'get' }); await handleSsl({ ...ctx, action: 'set' });
  expect(ctx.cf.get).toHaveBeenCalledWith('/zones/z1/settings/ssl');
  expect(ctx.cf.patch).toHaveBeenCalledWith('/zones/z1/settings/ssl', { body: { value: 'full' } });
});

test('ssl supports setting override and dry-run', async () => {
  const ctx = base(); await handleSsl({ ...ctx, action: 'get', opts: { 'zone-id': 'z1', setting: 'min_tls_version' } });
  await handleSsl({ ...ctx, action: 'set', opts: { 'zone-id': 'z1', setting: 'ssl', 'dry-run': true } });
  expect(ctx.cf.get).toHaveBeenCalledWith('/zones/z1/settings/min_tls_version');
  expect(ctx.cf.patch).not.toHaveBeenCalled();
});

test('ssl text output and unknown action are handled', async () => {
  const text = base(); text.outputJson = false;
  await handleSsl({ ...text, action: 'get' });
  await handleSsl({ ...text, action: 'set', opts: { 'zone-id': 'z1' } });
  expect(text.printer.log).toHaveBeenCalledWith(JSON.stringify({ ok: true }, null, 2));
  const unknown = base(); await handleSsl({ ...unknown, action: 'delete' });
  expect(unknown.fail).toHaveBeenCalledWith('Unknown ssl action: delete');
});

test('cache purge requires force and supports dry-run', async () => {
  const denied = base(); await handleCache({ ...denied, action: 'purge', opts: { 'zone-id': 'z1' } });
  expect(denied.fail).toHaveBeenCalledWith(expect.stringContaining('force'));
  const ctx = base(); await handleCache({ ...ctx, action: 'purge', opts: { 'zone-id': 'z1', 'dry-run': true } });
  expect(ctx.cf.post).not.toHaveBeenCalled();
  const live = base(); await handleCache({ ...live, action: 'purge', opts: { 'zone-id': 'z1', force: true } });
  expect(live.cf.post).toHaveBeenCalledWith('/zones/z1/purge_cache', { body: { value: 'full' } });
});

test('cache handles unknown action and text output', async () => {
  const unknown = base(); await handleCache({ ...unknown, action: 'get' });
  expect(unknown.fail).toHaveBeenCalledWith('Unknown cache action: get');
  const text = base(); text.outputJson = false;
  await handleCache({ ...text, action: 'purge', opts: { 'zone-id': 'z1', force: true } });
  expect(text.printer.log).toHaveBeenCalledWith(JSON.stringify({ ok: true }, null, 2));
});
