import { jest } from '@jest/globals';
import { handleSsl } from '../../src/handlers/ssl.mjs';

const base = () => ({ cf: { get: jest.fn().mockResolvedValue({ result: [{ hosts: ['example.com'], status: 'active', type: ' Universal' }] }) }, opts: { 'zone-id': 'z1' }, outputJson: true, toJsonOutput: jest.fn(), printer: { log: jest.fn() }, fail: jest.fn() });

test('ssl lists certificates and summarizes active coverage', async () => {
  const ctx = base(); await handleSsl({ ...ctx, action: 'certificates' }); await handleSsl({ ...ctx, action: 'coverage' });
  expect(ctx.cf.get).toHaveBeenCalledWith('/zones/z1/ssl/certificate_packs');
  expect(ctx.toJsonOutput).toHaveBeenCalledWith(expect.objectContaining({ complete: true }));
  const text = base(); text.outputJson = false; await handleSsl({ ...text, action: 'certificates' }); await handleSsl({ ...text, action: 'coverage' });
  expect(text.printer.log).toHaveBeenCalled();
  const empty = base(); empty.cf.get.mockResolvedValue({}); await handleSsl({ ...empty, action: 'coverage' });
  expect(empty.toJsonOutput).toHaveBeenCalledWith({ coverage: [], complete: true });
  const noHosts = base(); noHosts.cf.get.mockResolvedValue({ result: [{ status: 'active' }] }); await handleSsl({ ...noHosts, action: 'coverage' });
  expect(noHosts.toJsonOutput).toHaveBeenCalledWith({ coverage: [], complete: true });
});
