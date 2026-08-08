import { handleDnsRecords } from '../../src/handlers/dns-records.mjs';

test('handleDnsRecords is exported', () => {
  expect(typeof handleDnsRecords).toBe('function');
});
