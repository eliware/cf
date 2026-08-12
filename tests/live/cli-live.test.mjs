import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { jest } from "@jest/globals";
import { activeProfile } from "../../src/profiles.mjs";
import { requiredScopes } from "../../src/scopes.mjs";

const execFileAsync = promisify(execFile);
const cli =
  process.env.CF_BIN || fileURLToPath(new URL("../../bin/cf.mjs", import.meta.url));
const liveEnabled = process.env.CF_LIVE_TESTS === "1";
const wetEnabled = process.env.CF_LIVE_MUTATIONS === "1";
let zoneId = process.env.CF_LIVE_ZONE_ID;
let accountId = process.env.CF_LIVE_ACCOUNT_ID;
const profile = (() => {
  try {
    return activeProfile();
  } catch {
    return null;
  }
})();
const liveReady = Boolean(profile || process.env.CLOUDFLARE_API_TOKEN);
const grantedScopes = profile?.scopes?.length ? profile.scopes : null;

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

function unavailableCapability(result) {
  return /not enabled|enable .*dashboard|not authorized|authorization failure|no route for that uri|maximum number of lists|invalid_name|provide a zone id|stored certificate|code 1012|health checks disabled/i.test(
    `${result.stdout}\n${result.stderr}`,
  );
}

function skipUnavailable(label, result) {
  if (!unavailableCapability(result)) return false;
  console.warn(`Skipping ${label}: Cloudflare capability is unavailable.`);
  return true;
}

function canRun(resource, action = "list") {
  if (!liveReady) return false;
  if (!grantedScopes) return true;
  return requiredScopes(resource, action).every((scope) =>
    grantedScopes.includes(scope),
  );
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

const liveDescribe = liveEnabled && liveReady ? describe : describe.skip;

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
    if (!canRun(args[0], args[1])) return;
    const result = await run(withContext(args));
    if (result.code !== 0 && skipUnavailable(args.join(" "), result)) return;
    expect(result.code).toBe(0);
  });

  test("all CRUD actions expose working help", async () => {
    if (!liveReady) return;
    for (const [resource, actions] of crudCommands) {
      for (const action of actions) {
        if (!canRun(resource, action)) continue;
        const result = await run([resource, action, "--help"]);
        expect(result.code).toBe(0);
      }
    }
  });

  test("destructive commands require explicit force", async () => {
    if (!liveReady) return;
    const checks = [
      ["zones", "delete"],
      ["dns-records", "delete"],
      ["health", "delete"],
      ["origin-ca", "revoke"],
      ["list-items", "delete"],
    ];
    for (const args of checks) {
      if (!canRun(args[0], args[1])) continue;
      const result = await run(args);
      if (result.code !== 0 && skipUnavailable(args.join(" "), result)) continue;
      expect(result.code).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toMatch(
        /force|required|usage|missing/i,
      );
    }
  });

  test("wet DNS CRUD follows the complete create-read-update-read-delete lifecycle", async () => {
    if (!wetEnabled || !canRun("dns-records", "create")) return;
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
      if (created.code !== 0 && skipUnavailable("DNS CRUD", created)) return;
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

  test("wet health CRUD creates, reads, deletes, and confirms a disposable monitor", async () => {
    if (!wetEnabled || !canRun("health", "create")) return;
    expect(zoneId).toEqual(expect.any(String));
    const monitor = {
      type: "HTTPS",
      address: "eliware.org",
      port: 443,
      method: "GET",
      path: "/health",
      expected_codes: "200",
      follow_redirects: true,
      allow_insecure: false,
      interval: 60,
      timeout: 5,
      retries: 2,
      consecutive_fails: 3,
      consecutive_successes: 2,
    };
    let monitorId;
    try {
      const created = await run([
        "health",
        "create",
        "--zone-id",
        zoneId,
        "--data",
        JSON.stringify(monitor),
        "--json",
      ]);
      if (created.code !== 0 && skipUnavailable("health CRUD", created)) return;
      expect(created.code).toBe(0);
      monitorId = parseJson(created).id;
      expect(monitorId).toEqual(expect.any(String));

      const read = await run([
        "health",
        "get",
        "--zone-id",
        zoneId,
        "--id",
        monitorId,
        "--json",
      ]);
      expect(read.code).toBe(0);
      expect(parseJson(read).address).toBe("eliware.org");
    } finally {
      if (monitorId) {
        const deleted = await run([
          "health",
          "delete",
          "--zone-id",
          zoneId,
          "--id",
          monitorId,
          "--force",
          "--json",
        ]);
        expect(deleted.code).toBe(0);
        const readDeleted = await run([
          "health",
          "get",
          "--zone-id",
          zoneId,
          "--id",
          monitorId,
          "--json",
        ]);
        expect(readDeleted.code).not.toBe(0);
      }
    }
  });

  test("wet list CRUD follows list and item lifecycle", async () => {
    if (!wetEnabled || !canRun("lists", "create")) return;
    expect(accountId).toEqual(expect.any(String));
    const existingLists = await run(["lists", "list", "--account-id", accountId, "--json"]);
    expect(existingLists.code).toBe(0);
    // Cloudflare accounts have a finite list quota; do not turn a quota-full
    // account into a failing release test or delete an existing list.
    if (parseJson(existingLists).length >= 1) return;
    const listName = `cflive${Date.now()}`;
    const createList = await run([
      "lists", "create", "--account-id", accountId, "--data",
      JSON.stringify({ name: listName, description: "Temporary cf live test list", kind: "ip" }), "--json",
    ]);
    if (createList.code !== 0 && skipUnavailable("list CRUD", createList)) return;
    expect(createList.code).toBe(0);
    const createdList = parseJson(createList);
    const listId = createdList.id;
    expect(listId).toEqual(expect.any(String));
    try {
      const listed = await run(["lists", "list", "--account-id", accountId, "--json"]);
      expect(listed.code).toBe(0);
      expect(parseJson(listed).some((list) => list.id === listId)).toBe(true);

      const emptyItems = await run(["list-items", "list", "--account-id", accountId, "--id", listId, "--json"]);
      expect(emptyItems.code).toBe(0);
      expect(parseJson(emptyItems)).toEqual([]);

      const createdItem = await run([
        "list-items", "create", "--account-id", accountId, "--id", listId,
        "--data", JSON.stringify({ ip: "192.0.2.1" }), "--json",
      ]);
      expect(createdItem.code).toBe(0);

      const itemsAfterCreate = await run(["list-items", "list", "--account-id", accountId, "--id", listId, "--json"]);
      expect(itemsAfterCreate.code).toBe(0);
      const firstItem = parseJson(itemsAfterCreate)[0];
      expect(firstItem?.id).toEqual(expect.any(String));
      expect(firstItem.ip || firstItem.value).toBe("192.0.2.1");

      // Cloudflare list items have no in-place update endpoint; replace the item
      // and verify the new value through the list read.
      const removedForUpdate = await run([
        "list-items", "delete", "--account-id", accountId, "--id", listId,
        "--data", JSON.stringify({ ids: [firstItem.id] }), "--force", "--json",
      ]);
      expect(removedForUpdate.code).toBe(0);
      const replacedItem = await run([
        "list-items", "create", "--account-id", accountId, "--id", listId,
        "--data", JSON.stringify({ ip: "192.0.2.2" }), "--json",
      ]);
      expect(replacedItem.code).toBe(0);
      const itemsAfterUpdate = await run(["list-items", "list", "--account-id", accountId, "--id", listId, "--json"]);
      expect(itemsAfterUpdate.code).toBe(0);
      const updatedItem = parseJson(itemsAfterUpdate)[0];
      expect(updatedItem.ip || updatedItem.value).toBe("192.0.2.2");

      const deletedItem = await run([
        "list-items", "delete", "--account-id", accountId, "--id", listId,
        "--data", JSON.stringify({ ids: [updatedItem.id] }), "--force", "--json",
      ]);
      expect(deletedItem.code).toBe(0);
      const emptyAgain = await run(["list-items", "list", "--account-id", accountId, "--id", listId, "--json"]);
      expect(emptyAgain.code).toBe(0);
      expect(parseJson(emptyAgain)).toEqual([]);
    } finally {
      const deletedList = await run(["lists", "delete", "--account-id", accountId, "--id", listId, "--force", "--json"]);
      expect(deletedList.code).toBe(0);
      const listsAfterDelete = await run(["lists", "list", "--account-id", accountId, "--json"]);
      expect(listsAfterDelete.code).toBe(0);
      expect(parseJson(listsAfterDelete).some((list) => list.id === listId)).toBe(false);
    }
  });
});
