export async function handleAuth({ cf, action, outputJson, printer, toJsonOutput, fail }) {
  if (action === 'list') {
    const profile = { name: 'default', email: process.env.CLOUDFLARE_EMAIL || null, active: true };
    return outputJson ? toJsonOutput([profile]) : printer.log(`${profile.name} ${profile.email || '(not configured)'}`);
  }
  if (action === 'status') {
    if (!process.env.CLOUDFLARE_EMAIL || !process.env.CLOUDFLARE_API_KEY) {
      fail('Missing CLOUDFLARE_EMAIL or CLOUDFLARE_API_KEY'); return;
    }
    const identity = await cf.get('/user');
    const status = { authenticated: true, email: process.env.CLOUDFLARE_EMAIL, id: identity?.result?.id || null };
    return outputJson ? toJsonOutput(status) : printer.log(`${status.email} authenticated`);
  }
  fail(`Unknown auth action: ${action}`);
}
