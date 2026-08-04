#!/usr/bin/env node
process.noDeprecation = true;
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parseArgs } from '../src/args.mjs';
import { loadProjectEnv } from '../src/env.mjs';
import { createCloudflareClient } from '../src/cloudflare.mjs';
import { printHelp, printResourceHelp } from '../src/help.mjs';
import { toJsonOutput } from '../src/output.mjs';
import { handleZones } from '../src/handlers/zones.mjs';
import { handleZoneSettings } from '../src/handlers/zone-settings.mjs';
import { handleDnsRecords } from '../src/handlers/dns-records.mjs';
import { handleRulesets } from '../src/handlers/rulesets.mjs';
import { handleLists } from '../src/handlers/lists.mjs';
import { handleListItems } from '../src/handlers/list-items.mjs';

function resolveProjectRoot(importMetaUrl) {
  const __filename = fileURLToPath(importMetaUrl);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, '..');
}

async function loadBody(opts, fsImpl) {
  if (opts.data) return JSON.parse(opts.data);
  if (opts.file) return JSON.parse(fsImpl.readFileSync(opts.file, 'utf8'));
  return null;
}

export async function run({ argv = process.argv.slice(2), env = process.env, cfFactory = createCloudflareClient, loadEnv = loadProjectEnv, printer = console, fsImpl = fs, handlers = {}, projectRoot = resolveProjectRoot(import.meta.url), exit = code => process.exit(code) } = {}) {
  const { args, opts } = parseArgs(argv);
  if (opts.help || args.length === 0) {
    printHelp();
    return;
  }
  const resource = args[0];
  const action = args[1];
  if (args.length === 1 || opts.help) {
    printResourceHelp(resource);
    return;
  }

  loadEnv(projectRoot, env, fsImpl);

  const cf = cfFactory({ env });
  const outputJson = opts.json || opts.output === 'json';
  const body = await loadBody(opts, fsImpl);

  const fail = (message, code = 1) => {
    printer.error(message);
    exit(code);
  };

  const common = { cf, action, opts, body, outputJson, toJsonOutput: value => toJsonOutput(value, printer.log), fail };
  const dispatch = {
    zones: handlers.zones || handleZones,
    'zone-settings': handlers.zoneSettings || handleZoneSettings,
    'dns-records': handlers.dnsRecords || handleDnsRecords,
    rulesets: handlers.rulesets || handleRulesets,
    lists: handlers.lists || handleLists,
    'list-items': handlers.listItems || handleListItems,
  };
  if (dispatch[resource]) return dispatch[resource](common);

  printHelp();
  exit(1);
}

run().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
