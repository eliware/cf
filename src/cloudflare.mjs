import { Cloudflare } from "cloudflare";

export function createCloudflareClient({
  CloudflareClass = Cloudflare,
  env = process.env,
} = {}) {
  if (env.CLOUDFLARE_API_TOKEN?.trim()) {
    return new CloudflareClass({ apiToken: env.CLOUDFLARE_API_TOKEN });
  }
  throw new Error("You are not logged into Cloudflare. Run: cf auth login");
}
