import { jest } from '@jest/globals';
import { handleOriginCa } from '../../src/handlers/origin-ca.mjs';

const base = () => ({ cf: { get: jest.fn().mockResolvedValue({ result: [] }), post: jest.fn().mockResolvedValue({ id: 'new' }), delete: jest.fn().mockResolvedValue({ success: true }) }, opts: { id: 'c1', force: true }, body: { hostnames: ['example.com'] }, outputJson: true, toJsonOutput: jest.fn(), printer: { log: jest.fn() }, fail: jest.fn() });

test('Origin CA lists, creates, and revokes certificates', async () => {
  const ctx = base(); await handleOriginCa({ ...ctx, action: 'list' }); await handleOriginCa({ ...ctx, action: 'create' }); await handleOriginCa({ ...ctx, action: 'revoke' });
  expect(ctx.cf.get).toHaveBeenCalledWith('/certificates'); expect(ctx.cf.post).toHaveBeenCalledWith('/certificates', { body: ctx.body }); expect(ctx.cf.delete).toHaveBeenCalledWith('/certificates/c1');
});

test('Origin CA create dry-run and unsafe revoke are blocked', async () => {
  const ctx = base(); await handleOriginCa({ ...ctx, action: 'create', opts: { 'dry-run': true } });
  const unsafe = base(); await handleOriginCa({ ...unsafe, action: 'revoke', opts: { id: 'c1' } });
  expect(ctx.cf.post).not.toHaveBeenCalled(); expect(unsafe.fail).toHaveBeenCalledWith(expect.stringContaining('force'));
  const text = base(); text.outputJson = false; await handleOriginCa({ ...text, action: 'list' }); await handleOriginCa({ ...text, action: 'create' }); await handleOriginCa({ ...text, action: 'revoke' });
  expect(text.printer.log).toHaveBeenCalled();
  const unknown = base(); await handleOriginCa({ ...unknown, action: 'unknown' }); expect(unknown.fail).toHaveBeenCalledWith('Unknown origin-ca action: unknown');
});
