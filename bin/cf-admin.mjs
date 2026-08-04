#!/usr/bin/env node
process.noDeprecation = true;
import { run } from '../src/cli.mjs';
export { run } from '../src/cli.mjs';

run().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
