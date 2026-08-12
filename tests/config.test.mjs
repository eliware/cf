import os from 'node:os';
import { configRoot } from '../src/config.mjs';

test('config root follows gh-style override precedence', () => {
  const home = os.homedir();
  expect(configRoot('/tmp/cf-home', { CF_CONFIG_DIR: '/tmp/custom' })).toBe('/tmp/cf-home/.config/cf');
  expect(configRoot(home, { CF_CONFIG_DIR: '/tmp/custom' })).toBe('/tmp/custom');
  expect(configRoot(home, { XDG_CONFIG_HOME: '/tmp/xdg' })).toBe('/tmp/xdg/cf');
  expect(configRoot('/tmp/cf-home', {})).toBe('/tmp/cf-home/.config/cf');
});
