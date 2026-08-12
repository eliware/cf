const SERVICE = 'cf';

/* istanbul ignore next */
async function keychain() {
  try { return (await import('keytar')).default; } catch { return null; }
}

export async function readCredential(profile, load = keychain) {
  try { const store = await load(); if (!store) return null; const value = await store.getPassword(SERVICE, profile); return value ? JSON.parse(value) : null; } catch { return null; }
}

export async function writeCredential(profile, value, load = keychain) {
  try { const store = await load(); if (!store) return false; await store.setPassword(SERVICE, profile, JSON.stringify(value)); return true; } catch { return false; }
}

export async function deleteCredential(profile, load = keychain) {
  try { const store = await load(); return store ? await store.deletePassword(SERVICE, profile) : false; } catch { return false; }
}
