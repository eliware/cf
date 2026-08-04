import { getAccountId, getZoneId, requireValue } from './common.mjs';

export async function handleZones({ cf, action, opts, body, outputJson, printer = console, toJsonOutput, fail }) {
  const accountId = getAccountId(opts);
  const zoneId = getZoneId(opts);

  if (action === 'list') {
    const res = await cf.zones.list(accountId ? { account: { id: accountId } } : undefined);
    const items = Array.isArray(res?.result) ? res.result : res;
    return outputJson ? toJsonOutput(items) : items.forEach(z => printer.log(`${z.id} ${z.name}`));
  }

  if (action === 'get') {
    requireValue(zoneId, 'Missing --zone-id', fail);
    const zone = await cf.zones.get({ zone_id: zoneId });
    return outputJson ? toJsonOutput(zone) : printer.log(JSON.stringify(zone, null, 2));
  }

  if (action === 'create') {
    requireValue(body, 'Missing --data or --file', fail);
    if (opts['dry-run']) return printer.log(JSON.stringify({ action: 'create', body, dryRun: true }, null, 2));
    const res = await cf.zones.create(body);
    return outputJson ? toJsonOutput(res) : printer.log(JSON.stringify(res, null, 2));
  }

  if (action === 'update') {
    requireValue(zoneId, 'Missing --zone-id', fail);
    requireValue(body, 'Missing --data or --file', fail);
    if (opts['dry-run']) return printer.log(JSON.stringify({ zoneId, action: 'update', body, dryRun: true }, null, 2));
    const res = await cf.zones.edit({ zone_id: zoneId, ...body });
    return outputJson ? toJsonOutput(res) : printer.log(JSON.stringify(res, null, 2));
  }

  if (action === 'delete') {
    requireValue(zoneId, 'Missing --zone-id', fail);
    requireValue(opts.force, 'Refusing to delete without --force', fail);
    const res = await cf.zones.delete({ zone_id: zoneId });
    return outputJson ? toJsonOutput(res) : printer.log(JSON.stringify(res, null, 2));
  }

  fail(`Unknown zones action: ${action}`);
}
