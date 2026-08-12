export default function hello({ printer, opts }) {
  const name = opts.name || 'Cloudflare operator';
  printer.log(`Hello, ${name}!`);
}
