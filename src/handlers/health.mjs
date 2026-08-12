import { getZoneId, getId, requireValue } from './common.mjs';

export async function handleHealth({ cf, action, opts, body, outputJson, printer, toJsonOutput, fail }) {
  const zoneId = getZoneId(opts); const id = getId(opts);
  requireValue(zoneId, 'Missing --zone-id', fail);
  const base = `/zones/${zoneId}/healthchecks`;
  if (action === 'list') {
    const result = await cf.get(base);
    return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
  }
  if (action === 'get') {
    requireValue(id, 'Missing --id', fail);
    const result = await cf.get(`${base}/${id}`);
    return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
  }
  if (action === 'create') {
    requireValue(body, 'Missing --data or --file', fail);
    if (opts['dry-run']) return printer.log(JSON.stringify({ action, zoneId, body, dryRun: true }, null, 2));
    const result = await cf.post(base, { body });
    return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
  }
  if (action === 'delete') {
    requireValue(id, 'Missing --id', fail); requireValue(opts.force, 'Refusing to delete without --force', fail);
    const result = await cf.delete(`${base}/${id}`);
    return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
  }
  fail(`Unknown health action: ${action}`);
}
