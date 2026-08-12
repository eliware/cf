import { jest } from '@jest/globals';
import { fs } from '@eliware/common';
import os from 'node:os';
import path from 'node:path';
import { activeProfile, applyActiveProfile, profilesPath, readProfiles, writeProfiles } from '../src/profiles.mjs';

test('profile storage writes private JSON and applies active values', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-profile-'));
  const data = { active: 'work', profiles: { work: { apiToken: 'token', accountId: 'a1', zoneId: 'z1' } } };
  writeProfiles(data, home);
  expect(profilesPath(home)).toContain('/.config/cf/profiles.json');
  expect(readProfiles(home)).toEqual(data);
  const env = {}; expect(activeProfile(env, home)).toMatchObject({ name: 'work', apiToken: 'token' });
  await applyActiveProfile(env, home);
  expect(env).toEqual({ CLOUDFLARE_API_TOKEN: 'token', CLOUDFLARE_ACCOUNT_ID: 'a1', CLOUDFLARE_ZONE_ID: 'z1' });
});

test('profile selection honors explicit profile and missing storage', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-profile-empty-'));
  expect(readProfiles(home)).toEqual({ active: null, profiles: {} });
  expect(activeProfile({ CLOUDFLARE_PROFILE: 'none' }, home)).toBeNull();
  expect(await applyActiveProfile({ CLOUDFLARE_ACCOUNT_ID: 'existing' }, home)).toBeNull();
  expect(readProfiles(home, {})).toEqual({ active: null, profiles: {} });
  expect(profilesPath()).toContain('/.config/cf/profiles.json');
  expect(readProfiles(undefined, {})).toEqual({ active: null, profiles: {} });
  expect(activeProfile({}, undefined, {})).toBeNull();
  expect(await applyActiveProfile({}, undefined, {})).toBeNull();
  expect(activeProfile({}, home, {})).toBeNull();
  expect(await applyActiveProfile({}, home, {})).toBeNull();
  expect(await applyActiveProfile({}, home, {})).toBeNull();
});

test('profile writer tolerates adapters without chmod', () => {
  const files = new Map();
  const adapter = {
    mkdirSync: jest.fn(), writeFileSync: jest.fn((name, value) => files.set(name, value)),
  };
  writeProfiles({ active: null, profiles: {} }, '/tmp/cf-test-home', adapter);
  writeProfiles({ active: null, profiles: {} }, undefined, adapter);
  expect(adapter.mkdirSync).toHaveBeenCalled(); expect(files.size).toBe(2);
});

test('profile application preserves explicit environment values', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-profile-values-'));
  writeProfiles({ active: 'work', profiles: { work: { apiToken: 'token', accountId: 'a1' } } }, home);
  const env = { CLOUDFLARE_API_TOKEN: 'existing', CLOUDFLARE_ACCOUNT_ID: 'existing-account' };
  await applyActiveProfile(env, home);
  expect(env).toEqual({ CLOUDFLARE_API_TOKEN: 'existing', CLOUDFLARE_ACCOUNT_ID: 'existing-account' });
});
