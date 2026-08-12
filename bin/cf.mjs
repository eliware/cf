#!/usr/bin/env node
process.noDeprecation = true;
import { fileURLToPath } from "node:url";
import { registerHandlers, registerSignals } from '@eliware/common';
import { run } from '../src/cli.mjs';

export { run } from '../src/cli.mjs';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errorHandlers = registerHandlers({ events: ['uncaughtException', 'unhandledRejection'] });
  const signals = registerSignals({ shutdownHook: async () => errorHandlers.removeHandlers() });

  run().catch(err => {
    signals.removeHandlers();
    errorHandlers.removeHandlers();
    console.error(err.message || err);
    process.exit(1);
  });
}
