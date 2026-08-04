import { getZoneId, getId, requireValue } from './common.mjs';

export async function handleDnsRecords({ cf, action, opts, body, outputJson, printer = console, toJsonOutput, fail }) {
  const zoneId = getZoneId(opts);
  const id = getId(opts);
  requireValue(zoneId, 'Missing --zone-id', fail);

  if (action === 'list') {
    const res = await cf.dns.records.list({ zone_id: zoneId });
    const items = Array.isArray(res?.result) ? res.result : res;
    return outputJson ? toJsonOutput(items) : items.forEach(r => printer.log(`${r.id} ${r.type} ${r.name} ${r.content}`));
  }

  if (action === 'get') {
    requireValue(id, 'Missing --id', fail);
    const res = await cf.dns.records.get(id, { zone_id: zoneId });
    return outputJson ? toJsonOutput(res) : printer.log(JSON.stringify(res, null, 2));
  }

  if (action === 'create') {
    requireValue(body, 'Missing --data or --file', fail);
    if (opts['dry-run']) return printer.log(JSON.stringify({ zoneId, action: 'create', body, dryRun: true }, null, 2));
    const res = await cf.dns.records.create({ zone_id: zoneId, ...body });
    return outputJson ? toJsonOutput(res) : printer.log(JSON.stringify(res, null, 2));
  }

  if (action === 'update') {
    requireValue(id, 'Missing --id', fail);
    requireValue(body, 'Missing --data or --file', fail);
    if (opts['dry-run']) return printer.log(JSON.stringify({ zoneId, id, action: 'update', body, dryRun: true }, null, 2));
    const res = await cf.dns.records.update(id, { zone_id: zoneId, ...body });
    return outputJson ? toJsonOutput(res) : printer.log(JSON.stringify(res, null, 2));
  }

  if (action === 'delete') {
    requireValue(id, 'Missing --id', fail);
    requireValue(opts.force, 'Refusing to delete without --force', fail);
    const res = await cf.dns.records.delete(id, { zone_id: zoneId });
    return outputJson ? toJsonOutput(res) : printer.log(JSON.stringify(res, null, 2));
  }

  fail(`Unknown dns-records action: ${action}`);
}
