import { jest } from '@jest/globals';
import { deleteCredential, readCredential, writeCredential } from '../src/credentials.mjs';

test('credential adapter reads, writes, and deletes keychain entries', async () => {
  const store = { getPassword: jest.fn().mockResolvedValue(JSON.stringify({ token: 'secret' })), setPassword: jest.fn().mockResolvedValue(), deletePassword: jest.fn().mockResolvedValue(true) };
  const load = jest.fn().mockResolvedValue(store);
  await expect(readCredential('work', load)).resolves.toEqual({ token: 'secret' });
  await expect(writeCredential('work', { token: 'new' }, load)).resolves.toBe(true);
  await expect(deleteCredential('work', load)).resolves.toBe(true);
  expect(store.setPassword).toHaveBeenCalledWith('cf', 'work', JSON.stringify({ token: 'new' }));
});

test('credential adapter safely handles unavailable and failing keychains', async () => {
  const unavailable = jest.fn().mockResolvedValue(null);
  await expect(readCredential('work', unavailable)).resolves.toBeNull();
  await expect(writeCredential('work', {}, unavailable)).resolves.toBe(false);
  await expect(deleteCredential('work', unavailable)).resolves.toBe(false);
  const failing = jest.fn().mockRejectedValue(new Error('unavailable'));
  await expect(readCredential('work', failing)).resolves.toBeNull();
  await expect(writeCredential('work', {}, failing)).resolves.toBe(false);
  await expect(deleteCredential('work', failing)).resolves.toBe(false);
});

test('credential adapter treats an empty keychain value as absent', async () => {
  const store = { getPassword: jest.fn().mockResolvedValue('') };
  await expect(readCredential('work', jest.fn().mockResolvedValue(store))).resolves.toBeNull();
});

test('credential adapter rejects malformed keychain values safely', async () => {
  const store = { getPassword: jest.fn().mockResolvedValue('{bad-json') };
  await expect(readCredential('work', jest.fn().mockResolvedValue(store))).resolves.toBeNull();
});

test('credential adapter uses its default keychain loader safely', async () => {
  await readCredential('missing-profile');
  await writeCredential('missing-profile', {});
  await deleteCredential('missing-profile');
});
