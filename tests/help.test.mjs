import { jest } from '@jest/globals';
import { printCommandHelp, printHelp, printLegacyHelp, printResourceHelp } from '../src/help.mjs';

describe('help output', () => {
  test('prints general help', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

    printHelp();

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain('Manage Cloudflare from the command line.');
    printLegacyHelp();
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

test('prints command-specific help with gh-style sections', () => {
  const printer = { log: jest.fn() };
  printCommandHelp('auth', 'login', printer);
  expect(printer.log.mock.calls[0][0]).toContain('USAGE');
  expect(printer.log.mock.calls[0][0]).toContain('browser-based OAuth flow');
  printCommandHelp('unknown', 'action', printer);
  expect(printer.log.mock.calls[1][0]).toContain("Use 'cf unknown --help'");
});
