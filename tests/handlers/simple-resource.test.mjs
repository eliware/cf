import { jest } from '@jest/globals';
import { makeSimpleResource } from '../../src/handlers/simple-resource.mjs';

const base = () => ({ cf: { get: jest.fn().mockResolvedValue({ ok: true }), post: jest.fn().mockResolvedValue({ ok: true }), put: jest.fn().mockResolvedValue({ ok: true }), delete: jest.fn().mockResolvedValue({ ok: true }) }, opts: { 'zone-id': 'z1', id: 'r1', force: true }, body: { name: 'x' }, outputJson: true, toJsonOutput: jest.fn(), printer: { log: jest.fn() }, fail: jest.fn() });

test('simple resource supports CRUD and dry-run', async () => {
  const handle = makeSimpleResource({ name: 'load-balancer', scope: 'zone', path: id => `/zones/${id}/load_balancers` }); const ctx = base();
  for (const action of ['list', 'get', 'create', 'update', 'delete']) await handle({ ...ctx, action });
  expect(ctx.cf.get).toHaveBeenCalledWith('/zones/z1/load_balancers/r1'); expect(ctx.cf.post).toHaveBeenCalled(); expect(ctx.cf.put).toHaveBeenCalled(); expect(ctx.cf.delete).toHaveBeenCalled();
  await handle({ ...ctx, action: 'create', opts: { 'zone-id': 'z1', 'dry-run': true } });
  expect(ctx.cf.post).toHaveBeenCalledTimes(1);
  const text = { ...ctx, outputJson: false, printer: { log: jest.fn() } };
  await handle({ ...text, action: 'list' }); await handle({ ...text, action: 'create' }); await handle({ ...text, action: 'delete' });
  expect(text.printer.log).toHaveBeenCalled();
});

test('simple resource rejects unknown actions and unsafe deletes', async () => {
  const handle = makeSimpleResource({ name: 'tunnel', scope: 'account', path: id => `/accounts/${id}/cfd_tunnel` });
  const unknown = base(); await handle({ ...unknown, action: 'nope', opts: { 'account-id': 'a1' } });
  expect(unknown.fail).toHaveBeenCalledWith('Unknown tunnel action: nope');
  const unsafe = base(); await handle({ ...unsafe, action: 'delete', opts: { 'account-id': 'a1', id: 'r1' } });
  expect(unsafe.fail).toHaveBeenCalledWith(expect.stringContaining('force'));
});
