export function getAccountId(opts, env = process.env) {
  return opts['account-id'] || env.CLOUDFLARE_ACCOUNT_ID;
}

export function getZoneId(opts) {
  return opts['zone-id'] || process.env.CLOUDFLARE_ZONE_ID;
}

export function getId(opts) {
  return opts.id;
}

export function requireValue(value, message, fail) {
  if (!value || (typeof value === 'string' && !value.trim())) fail(message);
  return value;
}

export function requireAnyValue(values, message, fail) {
  if (!values.some(Boolean)) fail(message);
  return values.find(Boolean);
}
