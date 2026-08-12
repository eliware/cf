import { jest } from '@jest/globals';
import { log } from '@eliware/common';
import { toJsonOutput, printTextList, selectJson, renderTemplate, renderTable, printTable } from '../src/output.mjs';

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

  test('table helpers align columns and print one human-readable table', () => {
    const printer = jest.fn();
    expect(renderTable(['ID', 'NAME'], [['1', 'alpha'], ['22', null]])).toBe('ID  NAME\n--  ----\n1   alpha\n22');
    printTable(['ID'], [['1']], printer);
    expect(printer).toHaveBeenCalledWith('ID\n--\n1');
  });
});

test('output helpers support default console printers', () => {
  const spy = jest.spyOn(log, 'info').mockImplementation(() => {});
  toJsonOutput({ ok: true });
  printTextList([{ id: 2 }], x => `id:${x.id}`);
  printTable(['ID'], [['2']]);
  expect(spy).toHaveBeenCalledTimes(3);
  spy.mockRestore();
});

test('selectJson supports nested values and arrays', () => {
  const value = { result: [{ name: 'a' }, { name: 'b' }], meta: { count: 2 } };
  expect(selectJson(value, '.meta.count')).toBe(2);
  expect(selectJson(value, '.result[]')).toEqual(value.result);
  expect(selectJson(value, '.result[].name')).toEqual(['a', 'b']);
  expect(selectJson(value, '.missing[]')).toEqual([]);
  expect(selectJson(value, '.')).toBe(value);
});

test('renderTemplate interpolates selected fields', () => {
  expect(renderTemplate({ name: 'example.com', count: 2 }, '{{.name}} ({{count}})')).toBe('example.com (2)');
  expect(renderTemplate({ name: null }, '{{.name}}')).toBe('');
});
