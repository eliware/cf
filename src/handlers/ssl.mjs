import { getZoneId, requireValue } from './common.mjs';

export async function handleSsl({ cf, action, opts, body, outputJson, printer, toJsonOutput, fail }) {
  const zoneId = getZoneId(opts);
  const setting = opts.setting || 'ssl';
  requireValue(zoneId, 'Missing --zone-id', fail);
  if (action === 'get') {
    const result = await cf.get(`/zones/${zoneId}/settings/${setting}`);
    return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
  }
  if (action === 'set') {
    requireValue(body, 'Missing --data or --file', fail);
    if (opts['dry-run']) return printer.log(JSON.stringify({ zoneId, setting, body, dryRun: true }, null, 2));
    const result = await cf.patch(`/zones/${zoneId}/settings/${setting}`, { body });
    return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
  }
  fail(`Unknown ssl action: ${action}`);
}
