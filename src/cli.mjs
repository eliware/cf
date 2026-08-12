import { fs } from '@eliware/common';
import os from 'node:os';
import { parseArgs } from './args.mjs';
import { loadProjectEnv } from './env.mjs';
import { createCloudflareClient } from './cloudflare.mjs';
import { printHelp, printResourceHelp } from './help.mjs';
import { VERSION } from './version.mjs';
import { renderTemplate, selectJson, toJsonOutput } from './output.mjs';
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
import { handleOriginCa } from './handlers/origin-ca.mjs';
import { makeSimpleResource } from './handlers/simple-resource.mjs';
import { handleExtension } from './handlers/extension.mjs';
import { applyActiveProfile } from './profiles.mjs';
import { discoverExtensions, loadExtensionCommand } from './extensions.mjs';

const aliases = { zone: 'zones', setting: 'zone-settings', dns: 'dns-records', rules: 'rulesets', list: 'lists', 'list-item': 'list-items' };
const defaultHandlers = {
  loadBalancer: makeSimpleResource({ name: 'load-balancer', scope: 'zone', path: id => `/zones/${id}/load_balancers` }),
  tunnel: makeSimpleResource({ name: 'tunnel', scope: 'account', path: id => `/accounts/${id}/cfd_tunnel` }),
  workers: makeSimpleResource({ name: 'workers', scope: 'account', path: id => `/accounts/${id}/workers/scripts` }),
  pages: makeSimpleResource({ name: 'pages', scope: 'account', path: id => `/accounts/${id}/pages/projects` }),
  r2: makeSimpleResource({ name: 'r2', scope: 'account', path: id => `/accounts/${id}/r2/buckets` }),
  d1: makeSimpleResource({ name: 'd1', scope: 'account', path: id => `/accounts/${id}/d1/database` }),
  queues: makeSimpleResource({ name: 'queues', scope: 'account', path: id => `/accounts/${id}/queues` }),
  stream: makeSimpleResource({ name: 'stream', scope: 'account', path: id => `/accounts/${id}/stream` }),
  images: makeSimpleResource({ name: 'images', scope: 'account', path: id => `/accounts/${id}/images/v1` }),
  ai: makeSimpleResource({ name: 'ai', scope: 'account', path: id => `/accounts/${id}/ai` }),
  access: makeSimpleResource({ name: 'access', scope: 'account', path: id => `/accounts/${id}/access/apps` }),
};

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
  homeDir = os.homedir(),
  exit = code => process.exit(code),
} = {}) {
  const { args, opts } = parseArgs(argv);
  if (opts.version) return printer.log(VERSION);
  if (opts.help || args.length === 0) return printHelp(printer);
  const resource = aliases[args[0]] || args[0];
  const action = args[1];
  const extensionManifest = discoverExtensions(homeDir, fsImpl).find(manifest => manifest.commands[resource]);
  if ((args.length === 1 && !extensionManifest) || opts.help) return printResourceHelp(resource, printer);

  if (extensionManifest) {
    const extensionHandler = await loadExtensionCommand(extensionManifest, resource, homeDir);
    if (!extensionHandler) return printer.error(`Extension command is not loadable: ${resource}`);
    const extensionBody = loadBody(opts, fsImpl);
    const extensionFail = message => printer.error(message);
    return extensionHandler({ cf: null, action, opts, body: extensionBody, outputJson: opts.json || opts.output === 'json', printer, toJsonOutput: value => toJsonOutput(value, printer.log), fail: extensionFail });
  }

  loadEnv(projectRoot, env, fsImpl);
  applyActiveProfile(env, homeDir, fsImpl);
  const cf = cfFactory({ env });
  const outputJson = opts.json || opts.output === 'json';
  const commandPrinter = opts.quiet ? { ...printer, log: () => {} } : printer;
  if (opts.web) {
    const target = opts['zone-id'] ? `zones/${opts['zone-id']}` : opts['account-id'] ? `accounts/${opts['account-id']}` : '';
    return printer.log(`https://dash.cloudflare.com/${target}`);
  }
  const body = loadBody(opts, fsImpl);
  const fail = (message, code = 1) => { printer.error(message); exit(code); };
  const common = { cf, action, opts, body, outputJson, printer: commandPrinter,
    toJsonOutput: value => opts.template
      ? printer.log(renderTemplate(selectJson(value, opts.jq), opts.template))
      : toJsonOutput(selectJson(value, opts.jq), printer.log), fail };
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
    'origin-ca': handlers.originCa || handleOriginCa,
    'load-balancer': handlers.loadBalancer || defaultHandlers.loadBalancer,
    tunnel: handlers.tunnel || defaultHandlers.tunnel,
    workers: handlers.workers || defaultHandlers.workers,
    pages: handlers.pages || defaultHandlers.pages,
    r2: handlers.r2 || defaultHandlers.r2,
    d1: handlers.d1 || defaultHandlers.d1,
    queues: handlers.queues || defaultHandlers.queues,
    stream: handlers.stream || defaultHandlers.stream,
    images: handlers.images || defaultHandlers.images,
    ai: handlers.ai || defaultHandlers.ai,
    access: handlers.access || defaultHandlers.access,
    extension: handlers.extension || handleExtension,
  };
  if (dispatch[resource]) return dispatch[resource](common);
  printHelp(printer);
  exit(1);
}
