import { getAccountId, getId, getZoneId, requireValue } from './common.mjs';

export function makeSimpleResource({ name, scope, path }) {
  return async function handleSimpleResource({ cf, action, opts, body, outputJson, printer, toJsonOutput, fail }) {
    const scopeId = scope === 'zone' ? getZoneId(opts) : getAccountId(opts);
    requireValue(scopeId, `Missing --${scope}-id`, fail);
    const base = path(scopeId); const id = getId(opts); const endpoint = id ? `${base}/${id}` : base;
    if (action === 'list' || action === 'get') {
      if (action === 'get') requireValue(id, 'Missing --id', fail);
      const result = await cf.get(endpoint); return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
    }
    if (action === 'create' || action === 'update') {
      requireValue(body, 'Missing --data or --file', fail); if (action === 'update') requireValue(id, 'Missing --id', fail);
      if (opts['dry-run']) return printer.log(JSON.stringify({ action, [scope + 'Id']: scopeId, body, dryRun: true }, null, 2));
      const result = action === 'create' ? await cf.post(base, { body }) : await cf.put(endpoint, { body });
      return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
    }
    if (action === 'delete') {
      requireValue(id, 'Missing --id', fail); requireValue(opts.force, `Refusing ${name} delete without --force`, fail);
      const result = await cf.delete(endpoint); return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
    }
    fail(`Unknown ${name} action: ${action}`);
  };
}
