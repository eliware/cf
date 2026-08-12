import { Cloudflare } from 'cloudflare';

export function createCloudflareClient({ CloudflareClass = Cloudflare, env = process.env } = {}) {
  if (env.CLOUDFLARE_API_TOKEN?.trim()) {
    return new CloudflareClass({ apiToken: env.CLOUDFLARE_API_TOKEN });
  }
  if (!env.CLOUDFLARE_EMAIL?.trim() || !env.CLOUDFLARE_API_KEY?.trim()) {
    throw new Error('Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY');
  }
  return new CloudflareClass({ apiEmail: env.CLOUDFLARE_EMAIL, apiKey: env.CLOUDFLARE_API_KEY });
}
