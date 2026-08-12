import { missingScopes, requiredScopes } from "../src/scopes.mjs";

test("maps read and write commands to the matching OAuth scopes", () => {
  expect(requiredScopes("zones", "list")).toEqual(["zone.read"]);
  expect(requiredScopes("dns-records", "create")).toEqual(["dns.write"]);
  expect(requiredScopes("cache", "purge")).toEqual(["cache.purge"]);
  expect(requiredScopes("unknown", "list")).toEqual([]);
  expect(requiredScopes("auth", "status")).toEqual([]);
  expect(requiredScopes("zones", "unknown")).toEqual(["zone.read"]);
  expect(requiredScopes("cache", "list")).toEqual(["healthcheck.read"]);
  expect(requiredScopes("audit", "create")).toEqual(["account-settings.read", "zone.read", "dns.read", "ssl-and-certificates.read"]);
});

test("reports only scopes absent from the active OAuth profile", () => {
  expect(missingScopes("zones", "list", ["zone.write"])).toEqual(["zone.read"]);
  expect(missingScopes("zones", "list", ["zone.read"])).toEqual([]);
  expect(missingScopes("api", "request", [])).toEqual([]);
  expect(missingScopes("zones", "list", undefined)).toEqual([]);
});
