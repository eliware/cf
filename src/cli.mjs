import { fs } from "@eliware/common";
import os from "node:os";
import { parseArgs, tokenizeCommand } from "./args.mjs";
import { loadProjectEnv } from "./env.mjs";
import { createCloudflareClient } from "./cloudflare.mjs";
import { printCommandHelp, printHelp, printResourceHelp } from "./help.mjs";
import { VERSION } from "./version.mjs";
import { renderTemplate, selectJson, toJsonOutput } from "./output.mjs";
import { handleZones } from "./handlers/zones.mjs";
import { handleZoneSettings } from "./handlers/zone-settings.mjs";
import { handleDnsRecords } from "./handlers/dns-records.mjs";
import { handleRulesets } from "./handlers/rulesets.mjs";
import { handleLists } from "./handlers/lists.mjs";
import { handleListItems } from "./handlers/list-items.mjs";
import { handleApi } from "./handlers/api.mjs";
import { handleAuth } from "./handlers/auth.mjs";
import { handleSsl } from "./handlers/ssl.mjs";
import { handleCache } from "./handlers/cache.mjs";
import { handleHealth } from "./handlers/health.mjs";
import { handleAudit } from "./handlers/audit.mjs";
import { handleInventory } from "./handlers/inventory.mjs";
import { handleOriginCa } from "./handlers/origin-ca.mjs";
import { makeSimpleResource } from "./handlers/simple-resource.mjs";
import { handleExtension } from "./handlers/extension.mjs";
import { applyActiveProfile } from "./profiles.mjs";
import { discoverExtensions, loadExtensionCommand } from "./extensions.mjs";
import { readAliases, writeAliases } from "./aliases.mjs";
import { readSettings, writeSettings } from "./settings.mjs";
import {
  createTerminalOutput,
  terminalColorMode,
  terminalWidth,
} from "./terminal.mjs";
import {
  commandNamesFor,
  resourceNames,
  suggestCommand,
} from "./suggestions.mjs";

const aliases = {
  zone: "zones",
  setting: "zone-settings",
  dns: "dns-records",
  rules: "rulesets",
  list: "lists",
  "list-item": "list-items",
};
const defaultHandlers = {
  loadBalancer: makeSimpleResource({
    name: "load-balancer",
    scope: "zone",
    path: (id) => `/zones/${id}/load_balancers`,
  }),
  tunnel: makeSimpleResource({
    name: "tunnel",
    scope: "account",
    path: (id) => `/accounts/${id}/cfd_tunnel`,
  }),
  workers: makeSimpleResource({
    name: "workers",
    scope: "account",
    path: (id) => `/accounts/${id}/workers/scripts`,
  }),
  pages: makeSimpleResource({
    name: "pages",
    scope: "account",
    path: (id) => `/accounts/${id}/pages/projects`,
  }),
  r2: makeSimpleResource({
    name: "r2",
    scope: "account",
    path: (id) => `/accounts/${id}/r2/buckets`,
  }),
  d1: makeSimpleResource({
    name: "d1",
    scope: "account",
    path: (id) => `/accounts/${id}/d1/database`,
  }),
  queues: makeSimpleResource({
    name: "queues",
    scope: "account",
    path: (id) => `/accounts/${id}/queues`,
  }),
  stream: makeSimpleResource({
    name: "stream",
    scope: "account",
    path: (id) => `/accounts/${id}/stream`,
  }),
  images: makeSimpleResource({
    name: "images",
    scope: "account",
    path: (id) => `/accounts/${id}/images/v1`,
  }),
  ai: makeSimpleResource({
    name: "ai",
    scope: "account",
    path: (id) => `/accounts/${id}/ai`,
  }),
  access: makeSimpleResource({
    name: "access",
    scope: "account",
    path: (id) => `/accounts/${id}/access/apps`,
  }),
};

export function loadBody(opts, fsImpl = fs) {
  if (opts.data) return JSON.parse(opts.data);
  if (opts.file) return JSON.parse(fsImpl.readFileSync(opts.file, "utf8"));
  return null;
}

export async function run({
  argv = process.argv.slice(2),
  env = process.env,
  cfFactory = createCloudflareClient,
  loadEnv = loadProjectEnv,
  printer = console,
  fsImpl = fs,
  handlers = {},
  projectRoot = process.cwd(),
  homeDir = os.homedir(),
  exit = (code) => process.exit(code),
} = {}) {
  let { args, opts } = parseArgs(argv);
  if (opts.version) return printer.log(VERSION);
  if (args.length === 0) return printHelp(printer);
  let resource = aliases[args[0]] || args[0];
  let action = args[1];
  if (resource === "alias") {
    const stored = readAliases(homeDir, fsImpl);
    const aliasName = args[2];
    if (action === "list")
      return opts.json || opts.output === "json"
        ? printer.log(JSON.stringify(stored, null, 2))
        : Object.entries(stored).forEach(([name, command]) =>
            printer.log(`${name} ${command}`),
          );
    if (action === "set") {
      if (!aliasName || !args[3])
        return printer.error("Usage: cf alias set <name> <command>");
      stored[aliasName] = args.slice(3).join(" ");
      writeAliases(stored, homeDir, fsImpl);
      return printer.log(`Set alias ${aliasName}`);
    }
    if (action === "delete") {
      if (!aliasName || !stored[aliasName])
        return printer.error(`Unknown alias: ${aliasName || "(missing)"}`);
      delete stored[aliasName];
      writeAliases(stored, homeDir, fsImpl);
      return printer.log(`Deleted alias ${aliasName}`);
    }
    return printResourceHelp("alias", printer);
  }
  if (resource === "config") {
    const settings = readSettings(homeDir, fsImpl);
    const key = args[2];
    if (action === "list")
      return opts.json || opts.output === "json"
        ? printer.log(JSON.stringify(settings, null, 2))
        : Object.entries(settings).forEach(([name, value]) =>
            printer.log(`${name} ${value}`),
          );
    if (action === "get") return printer.log(settings[key] ?? "");
    if (action === "set") {
      if (!key || args[3] === undefined)
        return printer.error("Usage: cf config set <name> <value>");
      settings[key] = args.slice(3).join(" ");
      writeSettings(settings, homeDir, fsImpl);
      return printer.log(`Set config ${key}`);
    }
    if (action === "unset") {
      delete settings[key];
      writeSettings(settings, homeDir, fsImpl);
      return printer.log(`Unset config ${key}`);
    }
    return printResourceHelp("config", printer);
  }
  const expansion = readAliases(homeDir, fsImpl)[args[0]];
  if (expansion) {
    const expanded = parseArgs(
      tokenizeCommand(`${expansion} ${args.slice(1).join(" ")}`.trim()),
    );
    args = expanded.args;
    opts = { ...expanded.opts, ...opts };
    resource = aliases[args[0]] || args[0];
    action = args[1];
  }
  const extensionManifest = discoverExtensions(homeDir, fsImpl).find(
    (manifest) => manifest.commands[resource],
  );
  if (!extensionManifest && !resourceNames.includes(resource)) {
    const suggestion = suggestCommand("resource", resource);
    if (suggestion) {
      printer.error(
        `unknown command "${resource}" for "cf"\n\nDid you mean this?\n\t${suggestion}\n\nUsage: cf <command> <subcommand> [flags]`,
      );
      return exit(1);
    }
  }
  if (opts.help)
    return args.length > 1
      ? printCommandHelp(resource, action, printer)
      : printResourceHelp(resource, printer);
  if (args.length === 1 && !extensionManifest)
    return printResourceHelp(resource, printer);

  if (extensionManifest) {
    const extensionHandler = await loadExtensionCommand(
      extensionManifest,
      resource,
      homeDir,
    );
    if (!extensionHandler)
      return printer.error(`Extension command is not loadable: ${resource}`);
    const extensionBody = loadBody(opts, fsImpl);
    const extensionFail = (message) => printer.error(message);
    return extensionHandler({
      cf: null,
      action,
      opts,
      body: extensionBody,
      outputJson: opts.json || opts.output === "json",
      printer,
      toJsonOutput: (value) => toJsonOutput(value, printer.log),
      fail: extensionFail,
    });
  }

  if (
    resource !== "api" &&
    action &&
    commandNamesFor(resource).length &&
    !commandNamesFor(resource).includes(action)
  ) {
    const suggestion = suggestCommand(resource, action);
    printer.error(
      `unknown command "${action}" for "cf ${resource}"${suggestion ? `\n\nDid you mean this?\n\t${suggestion}` : ""}\n\nUsage: cf ${resource} <command> [flags]`,
    );
    return exit(1);
  }

  if (resource === "extension") {
    return handleExtension({
      action,
      opts,
      outputJson: opts.json || opts.output === "json",
      printer,
      toJsonOutput: (value) => toJsonOutput(value, printer.log),
      fail: (message) => printer.error(message),
      fsImpl,
      homeDir,
    });
  }

  loadEnv(projectRoot, env, fsImpl);
  await applyActiveProfile(env, homeDir, fsImpl);
  const cf =
    resource === "auth" && action === "login" ? null : cfFactory({ env });
  const outputJson = opts.json || opts.output === "json";
  const settings = readSettings(homeDir, fsImpl);
  const color = terminalColorMode(opts.color ?? settings.color, {
    isTTY: Boolean(process.stdout?.isTTY),
  });
  const pagerSetting =
    opts.pager === true
      ? settings.pager || process.env.PAGER || "less"
      : opts.pager || settings.pager;
  const pager =
    outputJson || opts["no-pager"] || opts.quiet || pagerSetting === "never"
      ? null
      : pagerSetting || null;
  const useTerminal = Boolean(
    pager ||
    opts.color !== undefined ||
    opts.width !== undefined ||
    settings.color ||
    settings.width,
  );
  const terminal = useTerminal
    ? createTerminalOutput({
        printer,
        json: outputJson,
        color,
        width: terminalWidth(opts.width ?? settings.width),
        pager,
      })
    : { ...printer, flush: async () => {} };
  const commandPrinter = opts.quiet ? { ...terminal, log: () => {} } : terminal;
  if (opts.web) {
    const target = opts["zone-id"]
      ? `zones/${opts["zone-id"]}`
      : opts["account-id"]
        ? `accounts/${opts["account-id"]}`
        : "";
    return commandPrinter.log(`https://dash.cloudflare.com/${target}`);
  }
  const body = loadBody(opts, fsImpl);
  const fail = (message, code = 1) => {
    printer.error(message);
    exit(code);
  };
  const common = {
    cf,
    action,
    opts,
    body,
    outputJson,
    printer: commandPrinter,
    toJsonOutput: (value) =>
      opts.template
        ? printer.log(renderTemplate(selectJson(value, opts.jq), opts.template))
        : toJsonOutput(selectJson(value, opts.jq), printer.log),
    fail,
  };
  const dispatch = {
    zones: handlers.zones || handleZones,
    "zone-settings": handlers.zoneSettings || handleZoneSettings,
    "dns-records": handlers.dnsRecords || handleDnsRecords,
    rulesets: handlers.rulesets || handleRulesets,
    lists: handlers.lists || handleLists,
    "list-items": handlers.listItems || handleListItems,
    api: handlers.api || handleApi,
    auth: handlers.auth || handleAuth,
    ssl: handlers.ssl || handleSsl,
    cache: handlers.cache || handleCache,
    health: handlers.health || handleHealth,
    audit: handlers.audit || handleAudit,
    inventory: handlers.inventory || handleInventory,
    "origin-ca": handlers.originCa || handleOriginCa,
    "load-balancer": handlers.loadBalancer || defaultHandlers.loadBalancer,
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
  if (dispatch[resource]) {
    const result = await dispatch[resource](common);
    await terminal.flush();
    return result;
  }
  printHelp(printer);
  exit(1);
}
