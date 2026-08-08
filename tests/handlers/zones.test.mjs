import { handleZones } from '../../src/handlers/zones.mjs';

test('handleZones is exported', () => {
  expect(typeof handleZones).toBe('function');
});
