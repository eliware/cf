import os from 'node:os';
import { fs } from '@eliware/common';
import { discoverExtensions, extensionRoot } from '../extensions.mjs';
import { printTable } from '../output.mjs';

export function handleExtension({ action, opts, outputJson, printer, toJsonOutput, fail, fsImpl = fs, homeDir = os.homedir() }) {
  if (action === 'list') {
    const manifests = discoverExtensions(homeDir, fsImpl);
    return outputJson ? toJsonOutput(manifests) : printTable(['NAME', 'VERSION'], manifests.map(manifest => [manifest.name, manifest.version]), printer.log);
  }
  if (action === 'info') {
    if (!opts.name) { fail('Missing --name'); return; }
    const manifest = discoverExtensions(homeDir, fsImpl).find(item => item.name === opts.name);
    if (!manifest) { fail(`Unknown extension: ${opts.name}`); return; }
    return outputJson ? toJsonOutput(manifest) : printer.log(`${manifest.name} ${manifest.version}\n${manifest.description || '(no description)'}`);
  }
  if (action === 'install' || action === 'upgrade') {
    if (!opts.path) { fail('Missing --path to an extension directory'); return; }
    const source = opts.path; const manifest = JSON.parse(fsImpl.readFileSync(`${source}/cf-extension.json`, 'utf8'));
    if (!manifest.name || !manifest.version || !manifest.commands) { fail('Invalid cf extension manifest'); return; }
    const destination = `${extensionRoot(homeDir)}/${manifest.name}`;
    fsImpl.mkdirSync(extensionRoot(homeDir), { recursive: true });
    fsImpl.rmSync(destination, { recursive: true, force: true }); fsImpl.cpSync(source, destination, { recursive: true });
    return printer.log(`${action === 'install' ? 'Installed' : 'Upgraded'} extension ${manifest.name}`);
  }
  if (action === 'remove') {
    if (!opts.name) { fail('Missing --name'); return; }
    if (!opts.force) { fail('Refusing extension removal without --force'); return; }
    fsImpl.rmSync(`${extensionRoot(homeDir)}/${opts.name}`, { recursive: true, force: true });
    return printer.log(`Removed extension ${opts.name}`);
  }
  fail(`Unknown extension action: ${action}`);
}
