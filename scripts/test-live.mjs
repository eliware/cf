import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const mode = process.argv[2];
if (!['--dry', '--wet'].includes(mode)) {
  console.error("Usage: npm run test:live:dry | npm run test:live:wet");
  process.exit(2);
}

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const jestBin = fileURLToPath(
  new URL("../node_modules/jest/bin/jest.js", import.meta.url),
);
const environment = {
  ...process.env,
  CF_LIVE_TESTS: "1",
  CF_LIVE_MUTATIONS: mode === "--wet" ? "1" : "0",
};
const child = spawn(
  process.execPath,
  [
    "--experimental-vm-modules",
    "--no-warnings",
    jestBin,
    "--runInBand",
    "--testPathIgnorePatterns=/node_modules/",
    "--runTestsByPath",
    "tests/live/cli-live.test.mjs",
  ],
  { cwd: projectRoot, env: environment, stdio: "inherit" },
);
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
