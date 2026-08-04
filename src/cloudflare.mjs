import { Cloudflare } from 'cloudflare';

export function createCloudflareClient({ CloudflareClass = Cloudflare, env = process.env } = {}) {
  if (!env.CLOUDFLARE_EMAIL || !env.CLOUDFLARE_API_KEY) {
    throw new Error('Missing CLOUDFLARE_EMAIL or CLOUDFLARE_API_KEY');
  }
  return new CloudflareClass({ apiEmail: env.CLOUDFLARE_EMAIL, apiKey: env.CLOUDFLARE_API_KEY });
}
