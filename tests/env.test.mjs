import { jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadEnvFile, loadProjectEnv, requireEnv } from '../src/env.mjs';

describe('env helpers', () => {

  beforeEach(() => {
    for (const key of ['A_TEST_KEY', 'B_TEST_KEY', 'PROJECT_ONLY']) delete process.env[key];
  });

  test('loadEnvFile loads missing vars and preserves existing vars', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudflare-env-'));
    const file = path.join(tmp, '.env');
    fs.writeFileSync(file, 'A_TEST_KEY=from-file\nB_TEST_KEY=from-file\n');
    process.env.B_TEST_KEY = 'from-env';

    loadEnvFile(file);

    expect(process.env.A_TEST_KEY).toBe('from-file');
    expect(process.env.B_TEST_KEY).toBe('from-env');
  });

  test('loadProjectEnv reads .env from project root', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudflare-project-'));
    fs.writeFileSync(path.join(tmp, '.env'), 'PROJECT_ONLY=present\n');

    loadProjectEnv(tmp);

    expect(process.env.PROJECT_ONLY).toBe('present');
  });

  test('requireEnv throws when missing', () => {
    expect(() => requireEnv('A_TEST_KEY')).toThrow('Missing A_TEST_KEY');
  });
});

test('env helpers handle missing files and required values', () => {
  const missingFs = { existsSync: jest.fn(() => false) };
  expect(loadEnvFile('/missing', {}, missingFs)).toBe(false);
  expect(requireEnv('TOKEN', { TOKEN: 'ok' })).toBe('ok');
  expect(() => requireEnv('TOKEN', {})).toThrow('Missing TOKEN');
});

test('loadEnvFile skips malformed dotenv entries', () => {
  const env = {};
  const fsImpl = { existsSync: () => true, readFileSync: () => 'MALFORMED\nGOOD=value\n' };
  expect(loadEnvFile('/tmp/.env', env, fsImpl)).toBe(true);
  expect(env).toEqual({ GOOD: 'value' });
});
