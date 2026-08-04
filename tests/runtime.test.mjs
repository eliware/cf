import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvFile, projectRootFromMeta } from '../src/runtime.mjs';

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
    expect(projectRootFromMeta(new URL('../bin/cf_list.mjs', import.meta.url).href)).toBe(expected);
  });
});
