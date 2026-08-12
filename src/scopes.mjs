import catalog from "../data/cloudflare-oauth-modules.json" with { type: "json" };

const moduleByResource = {
  zones: "zones",
  "dns-records": "dns",
  "zone-settings": "zone-settings",
  rulesets: "rules-security",
  lists: "lists",
  "list-items": "lists",
  ssl: "ssl",
  cache: "cache-health",
  health: "cache-health",
  audit: "audit-inventory",
  inventory: "audit-inventory",
  "origin-ca": "origin-ca",
  "load-balancer": "load-balancer",
  tunnel: "tunnel",
  workers: "workers",
  pages: "pages",
  r2: "r2",
  d1: "d1",
  queues: "queues",
  stream: "stream",
  images: "images",
  ai: "ai",
  access: "access",
  auth: "auth",
};

const writeActions = new Set([
  "apply",
  "create",
  "delete",
  "purge",
  "revoke",
  "set",
  "update",
]);
const modules = new Map(catalog.modules.map((module) => [module.id, module]));

export function requiredScopes(resource, action) {
  const module = modules.get(moduleByResource[resource]);
  if (!module || resource === "api" || resource === "auth") return [];
  if (resource === "cache" && action === "purge") return ["cache.purge"];
  const write = writeActions.has(action);
  const selected = module.scopes.filter((scope) =>
    write
      ? scope.endsWith(".write") || scope === "cache.purge"
      : scope.endsWith(".read"),
  );
  return selected.length ? selected : module.scopes;
}

export function missingScopes(resource, action, granted) {
  const required = requiredScopes(resource, action);
  if (!required.length || !granted) return [];
  const available = new Set(granted);
  return required.filter((scope) => !available.has(scope));
}
