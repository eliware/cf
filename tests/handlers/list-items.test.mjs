import { handleListItems } from '../../src/handlers/list-items.mjs';

test('handleListItems is exported', () => {
  expect(typeof handleListItems).toBe('function');
});
