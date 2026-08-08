import { handleLists } from '../../src/handlers/lists.mjs';

test('handleLists is exported', () => {
  expect(typeof handleLists).toBe('function');
});
