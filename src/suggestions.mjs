const commandNames = {
  auth: ["login", "logout", "status", "switch", "list", "verify"],
  alias: ["list", "set", "delete"],
  config: ["list", "get", "set", "unset"],
  zones: ["list", "get", "create", "update", "delete", "audit", "security"],
  "dns-records": ["list", "get", "create", "update", "delete", "diff", "apply"],
  "zone-settings": ["get", "set"],
  rulesets: ["list", "get", "create", "update"],
  lists: ["list", "get", "create", "update", "delete"],
  "list-items": ["list", "create", "delete"],
  api: ["request"],
  ssl: ["get", "certificates", "coverage", "set"],
  cache: ["purge"],
  health: ["list", "get", "create", "delete"],
  audit: ["list"],
  inventory: ["export"],
  "origin-ca": ["list", "create", "revoke"],
  "load-balancer": ["list", "get", "create", "update", "delete"],
  tunnel: ["list", "get", "create", "update", "delete"],
  workers: ["list", "get", "create", "update", "delete"],
  pages: ["list", "get", "create", "update", "delete"],
  r2: ["list", "get", "create", "update", "delete"],
  d1: ["list", "get", "create", "update", "delete"],
  queues: ["list", "get", "create", "update", "delete"],
  stream: ["list", "get", "create", "update", "delete"],
  images: ["list", "get", "create", "update", "delete"],
  ai: ["list", "get", "create", "update", "delete"],
  access: ["list", "get", "create", "update", "delete"],
  extension: ["list", "info", "install", "upgrade", "remove"],
};
export const resourceNames = Object.keys(commandNames);
function distance(left, right) {
  const row = [...Array(right.length + 1).keys()];
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const previous = row[j];
      row[j] =
        left[i - 1] === right[j - 1]
          ? diagonal
          : Math.min(row[j] + 1, row[j - 1] + 1, diagonal + 1);
      diagonal = previous;
    }
  }
  return row[right.length];
}
export function suggestCommand(resource, action) {
  const candidates =
    resource === "resource" ? resourceNames : commandNames[resource] || [];
  const suggestion = candidates
    .map((candidate) => ({ candidate, score: distance(action, candidate) }))
    .sort((left, right) => left.score - right.score)[0];
  return suggestion &&
    suggestion.score <= Math.max(1, Math.floor(action.length / 3))
    ? suggestion.candidate
    : null;
}
export function commandNamesFor(resource) {
  return commandNames[resource] || [];
}
