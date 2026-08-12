import { fs } from '@eliware/common';
import os from 'node:os';
import path from 'node:path';
import { discoverExtensions, extensionRoot, loadExtensionCommand, readExtensionManifest } from '../src/extensions.mjs';

test('extension discovery and module loading use the manifest contract', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-ext-load-')); const root = extensionRoot(home); fs.mkdirSync(path.join(root, 'hello'), { recursive: true });
  fs.writeFileSync(path.join(root, 'hello', 'cf-extension.json'), JSON.stringify({ name: 'hello', version: '1.0.0', commands: { hello: 'hello.mjs' } }));
  fs.writeFileSync(path.join(root, 'hello', 'hello.mjs'), 'export default ({ printer }) => printer.log("hello")');
  expect(readExtensionManifest(root, 'hello').name).toBe('hello'); expect(discoverExtensions(home)).toHaveLength(1);
  const handler = await loadExtensionCommand({ name: 'hello', commands: { hello: 'hello.mjs' } }, 'hello', home); expect(typeof handler).toBe('function');
  expect(await loadExtensionCommand({ name: 'hello', commands: {} }, 'missing', home)).toBeNull();
  expect(extensionRoot()).toContain('.config/cf/extensions'); expect(discoverExtensions(home, {})).toEqual([]); expect(discoverExtensions(undefined, {})).toEqual([]);
  const invalid = path.join(root, 'bad'); fs.mkdirSync(invalid); fs.writeFileSync(path.join(invalid, 'cf-extension.json'), '{}');
  expect(() => readExtensionManifest(root, 'bad')).toThrow('Invalid cf extension manifest');
});

test('extension loader accepts named handlers and null modules', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-ext-exports-')); const root = extensionRoot(home); fs.mkdirSync(path.join(root, 'x'), { recursive: true });
  fs.writeFileSync(path.join(root, 'x', 'run.mjs'), 'export function run() {}');
  fs.writeFileSync(path.join(root, 'x', 'handler.mjs'), 'export function handler() {}');
  fs.writeFileSync(path.join(root, 'x', 'empty.mjs'), 'export const value = 1');
  expect(typeof await loadExtensionCommand({ name: 'x', commands: { x: 'run.mjs' } }, 'x', home)).toBe('function');
  expect(typeof await loadExtensionCommand({ name: 'x', commands: { x: 'handler.mjs' } }, 'x', home)).toBe('function');
  expect(await loadExtensionCommand({ name: 'x', commands: { x: 'empty.mjs' } }, 'x', home)).toBeNull();
  expect(await loadExtensionCommand({ name: 'x', commands: {} }, 'missing')).toBeNull();
});
