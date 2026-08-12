import { jest } from '@jest/globals';
import { handleHealth } from '../../src/handlers/health.mjs';
import { handleAudit } from '../../src/handlers/audit.mjs';

const base = () => ({ cf: { get: jest.fn().mockResolvedValue({ ok: true }), post: jest.fn().mockResolvedValue({ ok: true }), delete: jest.fn().mockResolvedValue({ ok: true }) }, opts: { 'zone-id': 'z1', 'account-id': 'a1', id: 'h1', force: true }, body: { type: 'https' }, outputJson: true, printer: { log: jest.fn() }, toJsonOutput: jest.fn(), fail: jest.fn() });

test('health supports list, get, create, and delete', async () => {
  const ctx = base();
  for (const action of ['list', 'get', 'create', 'delete']) await handleHealth({ ...ctx, action });
  expect(ctx.cf.get).toHaveBeenCalledWith('/zones/z1/healthchecks');
  expect(ctx.cf.get).toHaveBeenCalledWith('/zones/z1/healthchecks/h1');
  expect(ctx.cf.post).toHaveBeenCalledWith('/zones/z1/healthchecks', { body: { type: 'https' } });
  expect(ctx.cf.delete).toHaveBeenCalledWith('/zones/z1/healthchecks/h1');
});

test('health dry-run and unknown action are safe', async () => {
  const ctx = base(); await handleHealth({ ...ctx, action: 'create', opts: { 'zone-id': 'z1', 'dry-run': true } });
  await handleHealth({ ...ctx, action: 'nope' });
  expect(ctx.cf.post).not.toHaveBeenCalled(); expect(ctx.fail).toHaveBeenCalledWith('Unknown health action: nope');
});

test('health text output covers each action', async () => {
  const ctx = base(); ctx.outputJson = false;
  for (const action of ['list', 'get', 'create', 'delete']) await handleHealth({ ...ctx, action });
  expect(ctx.printer.log).toHaveBeenCalled();
});

test('audit lists account logs', async () => {
  const ctx = base(); await handleAudit({ ...ctx, action: 'list' });
  expect(ctx.cf.get).toHaveBeenCalledWith('/accounts/a1/audit_logs');
  const unknown = base(); await handleAudit({ ...unknown, action: 'get' });
  expect(unknown.fail).toHaveBeenCalledWith('Unknown audit action: get');
  const text = base(); text.outputJson = false; await handleAudit({ ...text, action: 'list' });
  expect(text.printer.log).toHaveBeenCalled();
});
