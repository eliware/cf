export async function handleAuth({ cf, action, outputJson, printer, toJsonOutput, fail }) {
  if (action === 'list') {
    const profile = { name: 'default', email: process.env.CLOUDFLARE_EMAIL || null, active: true };
    return outputJson ? toJsonOutput([profile]) : printer.log(`${profile.name} ${profile.email || '(not configured)'}`);
  }
  if (action === 'status') {
    if (!process.env.CLOUDFLARE_API_TOKEN && (!process.env.CLOUDFLARE_EMAIL || !process.env.CLOUDFLARE_API_KEY)) {
      fail('Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY'); return;
    }
    const identity = await cf.get('/user');
    const status = { authenticated: true, method: process.env.CLOUDFLARE_API_TOKEN ? 'api-token' : 'api-key', email: process.env.CLOUDFLARE_EMAIL || null, id: identity?.result?.id || null };
    return outputJson ? toJsonOutput(status) : printer.log(`${status.email} authenticated`);
  }
  fail(`Unknown auth action: ${action}`);
}
