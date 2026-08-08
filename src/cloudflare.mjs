import { Cloudflare } from 'cloudflare';

export function createCloudflareClient({ CloudflareClass = Cloudflare, env = process.env } = {}) {
  if (!env.CLOUDFLARE_EMAIL?.trim() || !env.CLOUDFLARE_API_KEY?.trim()) {
    throw new Error('Missing CLOUDFLARE_EMAIL or CLOUDFLARE_API_KEY');
  }
  return new CloudflareClass({ apiEmail: env.CLOUDFLARE_EMAIL, apiKey: env.CLOUDFLARE_API_KEY });
}
