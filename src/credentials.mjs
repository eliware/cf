const SERVICE = 'cf';

async function keychain() {
  try { return (await import('keytar')).default; } catch { return null; }
}

export async function readCredential(profile) {
  try { const store = await keychain(); if (!store) return null; const value = await store.getPassword(SERVICE, profile); return value ? JSON.parse(value) : null; } catch { return null; }
}

export async function writeCredential(profile, value) {
  try { const store = await keychain(); if (!store) return false; await store.setPassword(SERVICE, profile, JSON.stringify(value)); return true; } catch { return false; }
}

export async function deleteCredential(profile) {
  try { const store = await keychain(); return store ? store.deletePassword(SERVICE, profile) : false; } catch { return false; }
}
