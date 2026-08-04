import { jest } from '@jest/globals';
import { toJsonOutput, printTextList } from '../src/output.mjs';

describe('output helpers', () => {
  test('toJsonOutput uses injected printer', () => {
    const printer = jest.fn();
    toJsonOutput({ a: 1 }, printer);
    expect(printer).toHaveBeenCalledWith(JSON.stringify({ a: 1 }, null, 2));
  });

  test('printTextList uses injected printer', () => {
    const printer = jest.fn();
    printTextList([{ id: 1 }], x => `id:${x.id}`, printer);
    expect(printer).toHaveBeenCalledWith('id:1');
  });
});

test('output helpers support default console printers', () => {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  toJsonOutput({ ok: true });
  printTextList([{ id: 2 }], x => `id:${x.id}`);
  expect(spy).toHaveBeenCalledTimes(2);
  spy.mockRestore();
});
