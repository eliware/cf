import { jest } from '@jest/globals';
import { fs } from '@eliware/common';
import path from 'node:path';
import os from 'os';
import { fileURLToPath } from 'url';
import { loadEnvFile, projectRootFromMeta } from '../src/runtime.mjs';
import { run } from '../src/cli.mjs';

describe('runtime helpers', () => {
  test('loadEnvFile respects existing env values', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-runtime-'));
    const file = path.join(tmp, '.env');
    fs.writeFileSync(file, 'A=1\nB=2\n');
    const env = { B: 'existing' };
    loadEnvFile(file, env, fs);
    expect(env).toEqual({ B: 'existing', A: '1' });
  });

  test('projectRootFromMeta returns the parent directory', () => {
    const expected = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    expect(projectRootFromMeta(new URL('../bin/cf-admin.mjs', import.meta.url).href)).toBe(expected);
  });
});

test('runtime helpers ignore missing and malformed dotenv lines', async () => {
  const { loadEnvFile: loadRuntimeEnv } = await import('../src/runtime.mjs');
  const fsImpl = {
    existsSync: jest.fn(() => true),
    readFileSync: jest.fn(() => '# comment\n\nINVALID\nA=1\nA=2\n'),
  };
  const env = {};
  loadRuntimeEnv('/tmp/.env', env, fsImpl);
  expect(env).toEqual({ A: '1' });
});

test('runtime loadEnvFile handles missing files', () => {
  const fsImpl = { existsSync: jest.fn(() => false) };
  expect(loadEnvFile('/missing/.env', {}, fsImpl)).toBeUndefined();
});

test('runtime loadEnvFile uses default environment and filesystem dependencies', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-runtime-default-'));
  const file = path.join(tmp, '.env');
  const key = 'CF_RUNTIME_DEFAULT_TEST';
  fs.writeFileSync(file, `${key}=ok\n`);
  delete process.env[key];
  loadEnvFile(file);
  expect(process.env[key]).toBe('ok');
  delete process.env[key];
});

test('run prints version without loading configuration', async () => {
  const printer = { log: jest.fn(), error: jest.fn() };
  const loadEnv = jest.fn();
  const cfFactory = jest.fn();
  await run({ argv: ['--version'], printer, loadEnv, cfFactory });
  expect(printer.log).toHaveBeenCalledWith('1.1.1');
  expect(loadEnv).not.toHaveBeenCalled();
  expect(cfFactory).not.toHaveBeenCalled();
});
