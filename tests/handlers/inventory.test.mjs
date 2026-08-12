import { jest } from '@jest/globals';
import { handleInventory } from '../../src/handlers/inventory.mjs';

test('inventory export combines account zones, DNS, and SSL', async () => {
  const toJsonOutput = jest.fn();
  const ctx = { cf: { zones: { list: jest.fn().mockResolvedValue({ result: [{ id: 'z1', name: 'example.com', status: 'active' }] }) }, dns: { records: { list: jest.fn().mockResolvedValue({ result: [{ name: 'www' }] }) } }, get: jest.fn().mockResolvedValue({ value: 'full' }) }, action: 'export', opts: { 'account-id': 'a1' }, outputJson: true, toJsonOutput, printer: { log: jest.fn() }, fail: jest.fn() };
  await handleInventory(ctx);
  expect(ctx.toJsonOutput).toHaveBeenCalledWith({ accountId: 'a1', zones: [{ id: 'z1', name: 'example.com', status: 'active', records: [{ name: 'www' }], ssl: { value: 'full' } }] });
  const text = { ...ctx, outputJson: false, printer: { log: jest.fn() } }; await handleInventory(text);
  expect(text.printer.log).toHaveBeenCalledWith(expect.stringContaining('example.com'));
  const empty = { ...ctx, outputJson: true, toJsonOutput: jest.fn(), cf: { ...ctx.cf, zones: { list: jest.fn().mockResolvedValue({}) } } };
  await handleInventory(empty); expect(empty.toJsonOutput).toHaveBeenCalledWith({ accountId: 'a1', zones: [] });
  const unknown = { ...ctx, action: 'list' }; await handleInventory(unknown);
  expect(unknown.fail).toHaveBeenCalledWith('Unknown inventory action: list');
  const scalar = { ...ctx, outputJson: true, toJsonOutput: jest.fn(), cf: { ...ctx.cf, zones: { list: jest.fn().mockResolvedValue({ result: [{ id: 'z1', name: 'example.com' }] }) }, dns: { records: { list: jest.fn().mockResolvedValue({}) } } } };
  await handleInventory(scalar); expect(scalar.toJsonOutput).toHaveBeenCalledWith(expect.objectContaining({ zones: [expect.objectContaining({ records: [] })] }));
});
