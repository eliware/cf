import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { jest } from "@jest/globals";

const execFileAsync = promisify(execFile);
const cli = process.env.CF_BIN || "cf";
const liveEnabled = process.env.CF_LIVE_TESTS === "1";
const wetEnabled = process.env.CF_LIVE_MUTATIONS === "1";
let zoneId = process.env.CF_LIVE_ZONE_ID;
let accountId = process.env.CF_LIVE_ACCOUNT_ID;

async function run(args, options = {}) {
  try {
    const result = await execFileAsync(cli, args, {
      env: { ...process.env },
      maxBuffer: 2 * 1024 * 1024,
      ...options,
    });
    return { ...result, code: 0 };
  } catch (error) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      code: error.code ?? 1,
    };
  }
}

function parseJson(result) {
  return JSON.parse(result.stdout);
}

const basicCommands = [
  ["auth", "status", "--json"],
  ["zones", "list", "--json"],
  ["dns-records", "list", "--json"],
  ["rulesets", "list", "--json"],
  ["lists", "list", "--json"],
  ["audit", "list", "--json"],
  ["inventory", "export", "--json"],
  ["origin-ca", "list", "--json"],
  ["workers", "list", "--json"],
  ["pages", "list", "--json"],
  ["r2", "list", "--json"],
  ["d1", "list", "--json"],
  ["queues", "list", "--json"],
  ["stream", "list", "--json"],
  ["images", "list", "--json"],
  ["ai", "list", "--json"],
  ["access", "list", "--json"],
];

const crudCommands = [
  ["zones", ["list", "get", "create", "update", "delete"]],
  ["dns-records", ["list", "get", "create", "update", "delete"]],
  ["rulesets", ["list", "get", "create", "update"]],
  ["list-items", ["list", "create", "delete"]],
  ["health", ["list", "get", "create", "delete"]],
  ["origin-ca", ["list", "create", "revoke"]],
  ["load-balancer", ["list", "get", "create", "update", "delete"]],
  ["tunnel", ["list", "get", "create", "update", "delete"]],
  ...[
    "workers",
    "pages",
    "r2",
    "d1",
    "queues",
    "stream",
    "images",
    "ai",
    "access",
  ].map((resource) => [resource, ["list", "get", "create", "update", "delete"]]),
];

const helpCommands = [
  [],
  ["--help"],
  ["auth", "--help"],
  ["zones", "--help"],
  ["dns-records", "--help"],
  ["zone-settings", "--help"],
  ["rulesets", "--help"],
  ["lists", "--help"],
  ["list-items", "--help"],
  ["ssl", "--help"],
  ["cache", "--help"],
  ["health", "--help"],
  ["audit", "--help"],
  ["inventory", "--help"],
  ["origin-ca", "--help"],
  ["load-balancer", "--help"],
  ["tunnel", "--help"],
  ["workers", "--help"],
  ["pages", "--help"],
  ["r2", "--help"],
  ["d1", "--help"],
  ["queues", "--help"],
  ["stream", "--help"],
  ["images", "--help"],
  ["ai", "--help"],
  ["access", "--help"],
];

function withContext(args) {
  const resource = args[0];
  const needsZone = [
    "dns-records",
    "zone-settings",
    "ssl",
    "health",
    "load-balancer",
  ].includes(resource);
  const needsAccount = [
    "lists",
    "list-items",
    "audit",
    "inventory",
    "workers",
    "pages",
    "r2",
    "d1",
    "queues",
    "stream",
    "images",
    "ai",
    "access",
    "tunnel",
  ].includes(resource);
  const context = [];
  if (needsZone && zoneId) context.push("--zone-id", zoneId);
  if (resource === "origin-ca" && zoneId) context.push("--zone-id", zoneId);
  if (needsAccount && accountId) context.push("--account-id", accountId);
  if (resource === "rulesets") {
    if (zoneId) context.push("--zone-id", zoneId);
    if (accountId) context.push("--account-id", accountId);
  }
  return [...args, ...context];
}

const liveDescribe = liveEnabled ? describe : describe.skip;

liveDescribe("authenticated live CLI smoke tests", () => {
  jest.setTimeout(120_000);

  beforeAll(async () => {
    if (zoneId && accountId) return;
    const result = await run(["zones", "list", "--json"]);
    if (result.code !== 0) return;
    try {
      const zones = JSON.parse(result.stdout).result || JSON.parse(result.stdout);
      const firstZone = Array.isArray(zones) ? zones[0] : null;
      zoneId ||= firstZone?.id;
      accountId ||= firstZone?.account?.id;
    } catch {
      // Individual tests report the missing context if discovery is unavailable.
    }
  });

  test("general help commands work", async () => {
    for (const args of helpCommands) {
      const result = await run(args);
      expect(result.code).toBe(0);
    }
  });

  test.each(basicCommands)("runs %s", async (...args) => {
    const result = await run(withContext(args));
    expect(result.code).toBe(0);
  });

  test("all CRUD actions expose working help", async () => {
    for (const [resource, actions] of crudCommands) {
      for (const action of actions) {
        const result = await run([resource, action, "--help"]);
        expect(result.code).toBe(0);
      }
    }
  });

  test("destructive commands require explicit force", async () => {
    const checks = [
      ["zones", "delete"],
      ["dns-records", "delete"],
      ["health", "delete"],
      ["origin-ca", "revoke"],
      ["list-items", "delete"],
    ];
    for (const args of checks) {
      const result = await run(args);
      expect(result.code).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toMatch(
        /force|required|usage|missing/i,
      );
    }
  });

  test("wet DNS CRUD follows the complete create-read-update-read-delete lifecycle", async () => {
    if (!wetEnabled) return;
    expect(zoneId).toEqual(expect.any(String));
    const zonesResult = await run(["zones", "list", "--json"]);
    expect(zonesResult.code).toBe(0);
    const zones = parseJson(zonesResult);
    const zone = zones.find((item) => item.id === zoneId) || zones[0];
    expect(zone?.name).toEqual(expect.any(String));
    const name = `_cf-live-${Date.now()}.${zone.name}`;
    const createBody = {
      type: "A",
      name,
      content: "192.0.2.1",
      ttl: 60,
      proxied: false,
    };
    let recordId;
    try {
      const before = await run(["dns-records", "list", "--zone-id", zoneId, "--json"]);
      expect(before.code).toBe(0);
      expect(parseJson(before).some((record) => record.name === name)).toBe(false);

      const created = await run([
        "dns-records", "create", "--zone-id", zoneId, "--data", JSON.stringify(createBody), "--json",
      ]);
      expect(created.code).toBe(0);
      recordId = parseJson(created).id;
      expect(recordId).toEqual(expect.any(String));

      const readCreated = await run(["dns-records", "get", "--zone-id", zoneId, "--id", recordId, "--json"]);
      expect(readCreated.code).toBe(0);
      expect(parseJson(readCreated).content).toBe("192.0.2.1");

      const updated = await run([
        "dns-records", "update", "--zone-id", zoneId, "--id", recordId,
        "--data", JSON.stringify({ ...createBody, content: "192.0.2.2" }), "--json",
      ]);
      expect(updated.code).toBe(0);

      const readUpdated = await run(["dns-records", "get", "--zone-id", zoneId, "--id", recordId, "--json"]);
      expect(readUpdated.code).toBe(0);
      expect(parseJson(readUpdated).content).toBe("192.0.2.2");
    } finally {
      if (recordId) {
        const deleted = await run([
          "dns-records", "delete", "--zone-id", zoneId, "--id", recordId, "--force", "--json",
        ]);
        expect(deleted.code).toBe(0);
        const after = await run(["dns-records", "list", "--zone-id", zoneId, "--json"]);
        expect(after.code).toBe(0);
        expect(parseJson(after).some((record) => record.id === recordId)).toBe(false);
      }
    }
  });
});
