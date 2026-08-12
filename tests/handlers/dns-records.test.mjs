import { jest } from '@jest/globals';
import { handleDnsRecords } from '../../src/handlers/dns-records.mjs';

test('DNS diff plans and apply mutates only differences', async () => {
  const create = jest.fn(); const remove = jest.fn(); const toJsonOutput = jest.fn();
  const current = { type: 'A', name: 'keep', content: '192.0.2.1', ttl: 60, proxied: false, id: 'old' };
  const ctx = { cf: { dns: { records: { list: jest.fn().mockResolvedValue({ result: [current] }), create, delete: remove } } }, action: 'diff', opts: { 'zone-id': 'z1' }, body: { records: [{ ...current }, { type: 'A', name: 'new', content: '192.0.2.2', ttl: 60, proxied: false }] }, outputJson: true, toJsonOutput, printer: { log: jest.fn() }, fail: jest.fn() };
  await handleDnsRecords(ctx);
  expect(toJsonOutput).toHaveBeenCalledWith(expect.objectContaining({ add: [expect.objectContaining({ name: 'new' })], remove: [] }));
  await handleDnsRecords({ ...ctx, action: 'apply', opts: { 'zone-id': 'z1', force: true } });
  expect(create).toHaveBeenCalled();
});

test('DNS apply removes stale records and rejects unsafe apply', async () => {
  const remove = jest.fn(); const printer = { log: jest.fn() };
  const stale = { type: 'A', name: 'stale', content: '192.0.2.9', ttl: 60, proxied: false, id: 'stale-id' };
  const base = { cf: { dns: { records: { list: jest.fn().mockResolvedValue({ result: [stale] }), create: jest.fn(), delete: remove } } }, opts: { 'zone-id': 'z1' }, body: [{ type: 'A', name: 'desired', content: '192.0.2.8', ttl: 60, proxied: false }], outputJson: false, printer, toJsonOutput: jest.fn(), fail: jest.fn() };
  await handleDnsRecords({ ...base, action: 'apply' });
  expect(base.fail).toHaveBeenCalledWith(expect.stringContaining('force'));
  await handleDnsRecords({ ...base, action: 'apply', opts: { 'zone-id': 'z1', force: true } });
  expect(remove).toHaveBeenCalledWith('stale-id', { zone_id: 'z1' });
  expect(printer.log).toHaveBeenCalledWith(expect.stringContaining('applied'));
});

test('DNS diff accepts array bodies and dry-run with unusual response shapes', async () => {
  const ctx = { cf: { dns: { records: { list: jest.fn().mockResolvedValue({}), create: jest.fn(), delete: jest.fn() } } }, action: 'apply', opts: { 'zone-id': 'z1', 'dry-run': true }, body: [], outputJson: true, toJsonOutput: jest.fn(), printer: { log: jest.fn() }, fail: jest.fn() };
  await handleDnsRecords(ctx);
  expect(ctx.toJsonOutput).toHaveBeenCalledWith(expect.objectContaining({ add: [], remove: [] }));
  const text = { ...ctx, outputJson: false, printer: { log: jest.fn() } };
  await handleDnsRecords(text);
  expect(text.printer.log).toHaveBeenCalledWith(expect.stringContaining('add'));
});

test('handleDnsRecords is exported', () => {
  expect(typeof handleDnsRecords).toBe('function');
});
