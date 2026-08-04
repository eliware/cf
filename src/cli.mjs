import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './args.mjs';
import { loadProjectEnv } from './env.mjs';
import { createCloudflareClient } from './cloudflare.mjs';
import { printHelp, printResourceHelp } from './help.mjs';
import { toJsonOutput } from './output.mjs';
import { handleZones } from './handlers/zones.mjs';
import { handleZoneSettings } from './handlers/zone-settings.mjs';
import { handleDnsRecords } from './handlers/dns-records.mjs';
import { handleRulesets } from './handlers/rulesets.mjs';
import { handleLists } from './handlers/lists.mjs';
import { handleListItems } from './handlers/list-items.mjs';

export function resolveProjectRoot(importMetaUrl) {
  return path.resolve(path.dirname(fileURLToPath(importMetaUrl)), '..');
}

export function loadBody(opts, fsImpl = fs) {
  if (opts.data) return JSON.parse(opts.data);
  if (opts.file) return JSON.parse(fsImpl.readFileSync(opts.file, 'utf8'));
  return null;
}

export async function run({
  argv = process.argv.slice(2), env = process.env,
  cfFactory = createCloudflareClient, loadEnv = loadProjectEnv,
  printer = console, fsImpl = fs, handlers = {},
  projectRoot = resolveProjectRoot(import.meta.url),
  exit = code => process.exit(code),
} = {}) {
  const { args, opts } = parseArgs(argv);
  if (opts.help || args.length === 0) return printHelp(printer);
  const resource = args[0];
  const action = args[1];
  if (args.length === 1 || opts.help) return printResourceHelp(resource, printer);

  loadEnv(projectRoot, env, fsImpl);
  const cf = cfFactory({ env });
  const outputJson = opts.json || opts.output === 'json';
  const body = loadBody(opts, fsImpl);
  const fail = (message, code = 1) => { printer.error(message); exit(code); };
  const common = { cf, action, opts, body, outputJson, printer,
    toJsonOutput: value => toJsonOutput(value, printer.log), fail };
  const dispatch = {
    zones: handlers.zones || handleZones,
    'zone-settings': handlers.zoneSettings || handleZoneSettings,
    'dns-records': handlers.dnsRecords || handleDnsRecords,
    rulesets: handlers.rulesets || handleRulesets,
    lists: handlers.lists || handleLists,
    'list-items': handlers.listItems || handleListItems,
  };
  if (dispatch[resource]) return dispatch[resource](common);
  printHelp(printer);
  exit(1);
}
