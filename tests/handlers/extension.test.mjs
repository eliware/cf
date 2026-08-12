import { jest } from '@jest/globals';
import { handleExtension } from '../../src/handlers/extension.mjs';

test('extension list returns installed names', () => {
  const toJsonOutput = jest.fn(); const fsImpl = { existsSync: () => true, readdirSync: () => ['gitops', 'vyos'] };
  handleExtension({ action: 'list', outputJson: true, toJsonOutput, printer: { log: jest.fn() }, fail: jest.fn(), fsImpl, homeDir: '/tmp' });
  expect(toJsonOutput).toHaveBeenCalledWith([{ name: 'gitops' }, { name: 'vyos' }]);
});

test('extension list supports text, missing directory, and unknown action', () => {
  const printer = { log: jest.fn() }; const fail = jest.fn();
  handleExtension({ action: 'list', outputJson: false, printer, toJsonOutput: jest.fn(), fail, fsImpl: { existsSync: () => true, readdirSync: () => ['x'] }, homeDir: '/tmp' });
  handleExtension({ action: 'list', outputJson: true, printer, toJsonOutput: jest.fn(), fail, fsImpl: {}, homeDir: '/tmp' });
  handleExtension({ action: 'add', outputJson: true, printer, toJsonOutput: jest.fn(), fail, fsImpl: {}, homeDir: '/tmp' });
  expect(printer.log).toHaveBeenCalledWith('x'); expect(fail).toHaveBeenCalledWith('Unknown extension action: add');
});
