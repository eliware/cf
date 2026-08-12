import { fs } from '@eliware/common';
import os from 'node:os';
import path from 'node:path';
import { readAliases, writeAliases } from '../src/aliases.mjs';
import { readSettings, writeSettings } from '../src/settings.mjs';

test('aliases and settings persist with private files', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-config-'));
  writeAliases({ zones: 'zone list' }, home); writeSettings({ pager: 'less' }, home);
  expect(readAliases(home)).toEqual({ zones: 'zone list' }); expect(readSettings(home)).toEqual({ pager: 'less' });
  expect((fs.statSync(`${home}/.config/cf/aliases.json`).mode & 0o777).toString(8)).toBe('600');
  expect(readAliases(home, {})).toEqual({}); expect(readSettings(home, {})).toEqual({});
});
