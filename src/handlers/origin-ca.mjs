import { getId, requireValue } from './common.mjs';

export async function handleOriginCa({ cf, action, opts, body, outputJson, printer, toJsonOutput, fail }) {
  const id = getId(opts);
  if (action === 'list') {
    const result = await cf.get('/certificates');
    return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
  }
  if (action === 'create') {
    requireValue(body, 'Missing --data or --file', fail);
    if (opts['dry-run']) return printer.log(JSON.stringify({ action, body, dryRun: true }, null, 2));
    const result = await cf.post('/certificates', { body });
    return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
  }
  if (action === 'revoke') {
    requireValue(id, 'Missing --id', fail); requireValue(opts.force, 'Refusing to revoke without --force', fail);
    const result = await cf.delete(`/certificates/${id}`);
    return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
  }
  fail(`Unknown origin-ca action: ${action}`);
}
