import { selectJson } from '../output.mjs';
import { getAllPages, requestWithBackoff, withPage } from '../request.mjs';

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function apiPath(value, fail) {
  if (!value) { fail('cf api requires a path'); return null; }
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//')) {
    fail('cf api accepts only relative API paths'); return null;
  }
  return value.startsWith('/') ? value : `/${value}`;
}

export async function handleApi({ cf, action, opts, body, printer, fail }) {
  const path = apiPath(action, fail);
  if (!path) return;
  const method = String(opts.method || 'GET').toUpperCase();
  if (!METHODS.has(method)) { fail(`Unsupported API method: ${method}`); return; }
  if (method === 'GET' && body !== null) { fail('GET requests cannot include --data or --file'); return; }
  if (method === 'DELETE' && !opts.force && !opts.dryRun) {
    fail('Refusing DELETE without --force (or use --dry-run)'); return;
  }
  if (opts.dryRun) {
    printer.log(JSON.stringify({ dryRun: true, method, path, body }, null, 2)); return;
  }
  const request = cf[method.toLowerCase()];
  if (typeof request !== 'function') { fail(`Cloudflare client does not support ${method}`); return; }
  const requestPage = page => requestWithBackoff(() => request.call(cf, withPage(path, page), undefined));
  const first = await requestWithBackoff(() => request.call(cf, path, body === null ? undefined : { body }));
  const result = method === 'GET' ? await getAllPages(requestPage, first, { paginate: opts.paginate }) : first;
  printer.log(JSON.stringify(selectJson(result, opts.jq), null, 2));
}
