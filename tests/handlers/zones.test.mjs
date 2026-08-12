import { jest } from '@jest/globals';
import { handleZones } from '../../src/handlers/zones.mjs';

test('handleZones is exported', () => {
  expect(typeof handleZones).toBe('function');
});

test('zone audit combines metadata, SSL, and DNS', async () => {
  const toJsonOutput = jest.fn();
  const ctx = {
    cf: { zones: { get: jest.fn().mockResolvedValue({ id: 'z1' }) }, get: jest.fn().mockResolvedValue({ value: 'full' }), dns: { records: { list: jest.fn().mockResolvedValue({ result: [{ name: 'example.com' }] }) } } },
    action: 'audit', opts: { 'zone-id': 'z1' }, outputJson: true, toJsonOutput, fail: jest.fn(), printer: { log: jest.fn() },
  };
  await handleZones(ctx);
  expect(toJsonOutput).toHaveBeenCalledWith({ zone: { id: 'z1' }, ssl: { value: 'full' }, dns: [{ name: 'example.com' }] });
  const text = { ...ctx, outputJson: false, toJsonOutput: jest.fn() };
  text.cf.dns.records.list.mockResolvedValue({ count: 0 });
  await handleZones(text);
  expect(text.printer.log).toHaveBeenCalledWith(JSON.stringify({ zone: { id: 'z1' }, ssl: { value: 'full' }, dns: { count: 0 } }, null, 2));
});
