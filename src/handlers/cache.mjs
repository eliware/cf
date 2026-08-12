import { getZoneId, requireValue } from './common.mjs';

export async function handleCache({ cf, action, opts, body, outputJson, printer, toJsonOutput, fail }) {
  const zoneId = getZoneId(opts);
  requireValue(zoneId, 'Missing --zone-id', fail);
  if (action !== 'purge') { fail(`Unknown cache action: ${action}`); return; }
  requireValue(body, 'Missing --data or --file', fail);
  requireValue(opts.force || opts['dry-run'], 'Refusing cache purge without --force', fail);
  if (opts['dry-run']) return printer.log(JSON.stringify({ zoneId, action, body, dryRun: true }, null, 2));
  const result = await cf.post(`/zones/${zoneId}/purge_cache`, { body });
  return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
}
