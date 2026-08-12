import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fs } from '@eliware/common';

export function extensionRoot(homeDir = os.homedir()) { return `${homeDir}/.config/cf/extensions`; }

function manifestPath(root, name) { return path.join(root, name, 'cf-extension.json'); }

export function readExtensionManifest(root, name, fsImpl = fs) {
  const manifest = JSON.parse(fsImpl.readFileSync(manifestPath(root, name), 'utf8'));
  if (!manifest.name || manifest.name !== name || !manifest.version || !manifest.commands) throw new Error(`Invalid cf extension manifest: ${name}`);
  return manifest;
}

export function discoverExtensions(homeDir = os.homedir(), fsImpl = fs) {
  const root = extensionRoot(homeDir);
  if (typeof fsImpl.existsSync !== 'function' || !fsImpl.existsSync(root)) return [];
  return fsImpl.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory())
    .map(entry => readExtensionManifest(root, entry.name, fsImpl));
}

export async function loadExtensionCommand(manifest, command, homeDir = os.homedir()) {
  const relative = manifest.commands[command];
  if (!relative) return null;
  const modulePath = path.resolve(extensionRoot(homeDir), manifest.name, relative);
  const module = await import(pathToFileURL(modulePath).href);
  return module.default || module.run || module.handler || null;
}
