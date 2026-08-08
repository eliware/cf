import { jest } from '@jest/globals';
import { printHelp, printResourceHelp } from '../src/help.mjs';

describe('help output', () => {
  test('prints general help', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

    printHelp();

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain('cf-admin - Cloudflare admin utility');
    spy.mockRestore();
  });

  test('prints resource help', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

    printResourceHelp('zones');

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('zones'));
    spy.mockRestore();
  });
});

test('prints unknown resource help', () => {
  const printer = { log: jest.fn() };
  printResourceHelp('unknown', printer);
  expect(printer.log).toHaveBeenCalledWith('Unknown resource: unknown');
});
