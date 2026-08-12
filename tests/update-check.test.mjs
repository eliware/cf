import { jest } from "@jest/globals";
import { checkForUpdate, updateNotice } from "../src/update-check.mjs";
import { run } from "../src/cli.mjs";

function memoryFs(files = new Map()) {
  return {
    files,
    existsSync: (path) => files.has(path),
    readFileSync: (path) => files.get(path),
    mkdirSync: () => {},
    writeFileSync: (path, value) => files.set(path, value),
    chmodSync: () => {},
  };
}

test("update check caches once per interval and reports newer versions", async () => {
  const fs = memoryFs();
  const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ version: "2.0.0" }) });
  const options = { currentVersion: "1.1.3", homeDir: "/tmp/cf", fsImpl: fs, fetchImpl, now: 86_400_001 };
  await expect(checkForUpdate(options)).resolves.toBe("2.0.0");
  await expect(checkForUpdate({ ...options, now: 86_401_000 })).resolves.toBe("2.0.0");
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(updateNotice("2.0.0", "1.1.3")).toMatch(/npm install/);
});

test("update check respects opt-out, current versions, bad responses, and failures", async () => {
  const fs = memoryFs();
  const fetchImpl = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ version: "1.1.3" }) })
    .mockResolvedValueOnce({ ok: false })
    .mockRejectedValueOnce(new Error("offline"));
  const base = { currentVersion: "1.1.3", homeDir: "/tmp/cf", fsImpl: fs, fetchImpl, now: 1 };
  await expect(checkForUpdate({ ...base, env: { CF_NO_UPDATE_CHECK: "1" } })).resolves.toBeNull();
  await expect(checkForUpdate(base)).resolves.toBeNull();
  await expect(checkForUpdate({ ...base, now: 86_400_002 })).resolves.toBeNull();
  await expect(checkForUpdate({ ...base, now: 172_800_003 })).resolves.toBeNull();
  await expect(updateNotice(null, "1.1.3")).toBeNull();
});

test("CLI prints an update notice without delaying command output", async () => {
  const printer = { log: jest.fn(), error: jest.fn() };
  await run({
    argv: ["zones", "list"],
    homeDir: "/tmp/cf-update-cli",
    env: {},
    printer,
    fsImpl: { existsSync: () => false },
    loadEnv: jest.fn(),
    cfFactory: jest.fn(() => ({})),
    handlers: { zones: ({ printer: injected }) => injected.log("zones") },
    updateCheck: jest.fn().mockResolvedValue("2.0.0"),
    exit: jest.fn(),
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(printer.error).toHaveBeenCalledWith(expect.stringContaining("2.0.0"));
});
