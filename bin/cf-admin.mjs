#!/usr/bin/env node
process.noDeprecation = true;
import { registerHandlers, registerSignals } from '@eliware/common';
import { run } from '../src/cli.mjs';

const errorHandlers = registerHandlers({ events: ['uncaughtException', 'unhandledRejection'] });
const signals = registerSignals({ shutdownHook: async () => errorHandlers.removeHandlers() });
export { run } from '../src/cli.mjs';

run().catch(err => {
  signals.removeHandlers();
  errorHandlers.removeHandlers();
  console.error(err.message || err);
  process.exit(1);
});
