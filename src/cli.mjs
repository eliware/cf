import { fs } from '@eliware/common';
import { parseArgs } from './args.mjs';
import { loadProjectEnv } from './env.mjs';
import { createCloudflareClient } from './cloudflare.mjs';
import { printHelp, printResourceHelp } from './help.mjs';
import { VERSION } from './version.mjs';
import { selectJson, toJsonOutput } from './output.mjs';
import { handleZones } from './handlers/zones.mjs';
import { handleZoneSettings } from './handlers/zone-settings.mjs';
import { handleDnsRecords } from './handlers/dns-records.mjs';
import { handleRulesets } from './handlers/rulesets.mjs';
import { handleLists } from './handlers/lists.mjs';
import { handleListItems } from './handlers/list-items.mjs';
import { handleApi } from './handlers/api.mjs';
import { handleAuth } from './handlers/auth.mjs';
import { handleSsl } from './handlers/ssl.mjs';
import { handleCache } from './handlers/cache.mjs';
import { handleHealth } from './handlers/health.mjs';
import { handleAudit } from './handlers/audit.mjs';
import { handleInventory } from './handlers/inventory.mjs';
import { applyActiveProfile } from './profiles.mjs';

const aliases = { zone: 'zones', setting: 'zone-settings', dns: 'dns-records', rules: 'rulesets', list: 'lists', 'list-item': 'list-items' };

export function loadBody(opts, fsImpl = fs) {
  if (opts.data) return JSON.parse(opts.data);
  if (opts.file) return JSON.parse(fsImpl.readFileSync(opts.file, 'utf8'));
  return null;
}

export async function run({
  argv = process.argv.slice(2), env = process.env,
  cfFactory = createCloudflareClient, loadEnv = loadProjectEnv,
  printer = console, fsImpl = fs, handlers = {},
  projectRoot = process.cwd(),
  exit = code => process.exit(code),
} = {}) {
  const { args, opts } = parseArgs(argv);
  if (opts.version) return printer.log(VERSION);
  if (opts.help || args.length === 0) return printHelp(printer);
  const resource = aliases[args[0]] || args[0];
  const action = args[1];
  if (args.length === 1 || opts.help) return printResourceHelp(resource, printer);

  loadEnv(projectRoot, env, fsImpl);
  applyActiveProfile(env, undefined, fsImpl);
  const cf = cfFactory({ env });
  const outputJson = opts.json || opts.output === 'json';
  const commandPrinter = opts.quiet ? { ...printer, log: () => {} } : printer;
  const body = loadBody(opts, fsImpl);
  const fail = (message, code = 1) => { printer.error(message); exit(code); };
  const common = { cf, action, opts, body, outputJson, printer: commandPrinter,
    toJsonOutput: value => toJsonOutput(selectJson(value, opts.jq), printer.log), fail };
  const dispatch = {
    zones: handlers.zones || handleZones,
    'zone-settings': handlers.zoneSettings || handleZoneSettings,
    'dns-records': handlers.dnsRecords || handleDnsRecords,
    rulesets: handlers.rulesets || handleRulesets,
    lists: handlers.lists || handleLists,
    'list-items': handlers.listItems || handleListItems,
    api: handlers.api || handleApi,
    auth: handlers.auth || handleAuth,
    ssl: handlers.ssl || handleSsl,
    cache: handlers.cache || handleCache,
    health: handlers.health || handleHealth,
    audit: handlers.audit || handleAudit,
    inventory: handlers.inventory || handleInventory,
  };
  if (dispatch[resource]) return dispatch[resource](common);
  printHelp(printer);
  exit(1);
}
