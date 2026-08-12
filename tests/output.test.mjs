import { jest } from '@jest/globals';
import { log } from '@eliware/common';
import { toJsonOutput, printTextList, selectJson, renderTemplate, renderTable, printTable } from '../src/output.mjs';
import { createTerminalOutput, fitTerminal, styleTerminalText, terminalColorMode, terminalWidth } from '../src/terminal.mjs';

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

test('terminal helpers honor color, width, and safe defaults', () => {
  expect(terminalColorMode('never', { isTTY: true })).toBe(false);
  expect(terminalColorMode('always', { isTTY: false })).toBe(true);
  expect(terminalColorMode(undefined, { isTTY: false, noColor: false })).toBe(false);
  expect(terminalWidth('80')).toBe(80);
  expect(terminalWidth('20')).toBe(120);
  expect(fitTerminal('abcdef', 5)).toBe('abcd…');
  expect(styleTerminalText('ID\n1', { color: false, width: 80 })).toBe('ID\n1');
  expect(styleTerminalText('ID\n1', { color: true, width: 80 })).toContain('\u001b[36mID');
  expect(terminalColorMode('true', { isTTY: false })).toBe(true);
  expect(terminalColorMode('false', { isTTY: true })).toBe(false);
  expect(terminalColorMode(undefined, { isTTY: true, noColor: true })).toBe(false);
  expect(terminalWidth('80', 90)).toBe(80);
  expect(fitTerminal('short', 80)).toBe('short');
  expect(styleTerminalText('ID', { color: true, width: 80 })).toBe('ID');
});

test('terminal output preserves JSON and can buffer human-readable output', async () => {
  const printer = { log: jest.fn(), error: jest.fn() };
  const json = createTerminalOutput({ printer, json: true });
  json.log({ ok: true });
  expect(printer.log).toHaveBeenCalledWith('[object Object]');
  const human = createTerminalOutput({ printer, width: 40 });
  human.log('ID\nexample');
  expect(printer.log).toHaveBeenCalledWith('ID\nexample');
  human.error('diagnostic');
  expect(printer.error).toHaveBeenCalledWith('diagnostic');
  await human.flush();
});

test('terminal pager resolves successful exits and reports failed exits', async () => {
  const printer = { log: jest.fn(), error: jest.fn() };
  const successful = createTerminalOutput({ printer, pager: 'true' });
  successful.log('output'); await expect(successful.flush()).resolves.toBeUndefined();
  const failed = createTerminalOutput({ printer, pager: 'false' });
  failed.log('output'); await expect(failed.flush()).rejects.toThrow('Pager exited');
});
