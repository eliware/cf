import { jest } from '@jest/globals';
import { fs } from '@eliware/common';
import os from 'node:os';
import path from 'node:path';
import { handleExtension } from '../../src/handlers/extension.mjs';

function setup() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-ext-'));
  const source = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-ext-source-'));
  fs.writeFileSync(path.join(source, 'cf-extension.json'), JSON.stringify({ name: 'hello', version: '1.0.0', commands: { hello: 'hello.mjs' } }));
  fs.writeFileSync(path.join(source, 'hello.mjs'), 'export default () => {}');
  return { home, source };
}

test('extension install, list, upgrade, and remove work locally', () => {
  const { home, source } = setup(); const printer = { log: jest.fn() };
  const common = { outputJson: true, toJsonOutput: jest.fn(), printer, fail: jest.fn(), homeDir: home };
  handleExtension({ ...common, action: 'install', opts: { path: source } });
  handleExtension({ ...common, action: 'list', opts: {} });
  handleExtension({ ...common, action: 'list', opts: {}, outputJson: false });
  handleExtension({ ...common, action: 'info', opts: { name: 'hello' }, outputJson: false });
  handleExtension({ ...common, action: 'upgrade', opts: { path: source } });
  handleExtension({ ...common, action: 'remove', opts: { name: 'hello', force: true } });
  expect(printer.log).toHaveBeenCalledWith('Installed extension hello');
  expect(printer.log).toHaveBeenCalledWith('hello 1.0.0\n(no description)');
  expect(common.toJsonOutput).toHaveBeenCalledWith([{ name: 'hello', version: '1.0.0', commands: { hello: 'hello.mjs' } }]);
  expect(printer.log).toHaveBeenCalledWith('Removed extension hello');
  handleExtension({ ...common, action: 'list', outputJson: false });
});

test('extension validation and safety errors are reported', () => {
  const { home, source } = setup(); const fail = jest.fn(); const common = { action: 'list', opts: {}, outputJson: true, toJsonOutput: jest.fn(), printer: { log: jest.fn() }, fail, homeDir: home };
  handleExtension({ ...common, action: 'install' });
  handleExtension({ ...common, action: 'remove', opts: { name: 'hello' } });
  handleExtension({ ...common, action: 'remove', opts: {} });
  const invalid = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-ext-invalid-')); fs.writeFileSync(path.join(invalid, 'cf-extension.json'), '{}');
  handleExtension({ ...common, action: 'install', opts: { path: invalid } });
  handleExtension({ ...common, action: 'unknown', opts: {} });
  handleExtension({ ...common, action: 'info', opts: { name: 'missing' } });
  expect(fail).toHaveBeenCalled(); expect(source).toBeTruthy();
  handleExtension({ action: 'list', opts: {}, outputJson: true, toJsonOutput: jest.fn(), printer: { log: jest.fn() }, fail: jest.fn() });
});
