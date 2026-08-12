import { jest } from "@jest/globals";
import { handleAuth } from "../../src/handlers/auth.mjs";
import { fs } from "@eliware/common";

const base = () => ({
  cf: { get: jest.fn().mockResolvedValue({ result: { id: "user-1" } }) },
  outputJson: true,
  printer: { log: jest.fn() },
  toJsonOutput: jest.fn(),
  fail: jest.fn(),
  read: () => ({ active: null, profiles: {} }),
});

test("auth status reports the OAuth identity", async () => {
  const oldToken = process.env.CLOUDFLARE_API_TOKEN;
  process.env.CLOUDFLARE_API_TOKEN = "token";
  const ctx = base();
  await handleAuth({ ...ctx, action: "status" });
  expect(ctx.toJsonOutput).toHaveBeenCalledWith({
    authenticated: true,
    profile: "environment",
    method: "oauth",
    id: "user-1",
    email: null,
  });
  process.env.CLOUDFLARE_API_TOKEN = oldToken;
});

test("auth lists profiles without exposing credentials", async () => {
  const ctx = base();
  await handleAuth({
    ...ctx,
    action: "list",
    read: () => ({
      active: "work",
      profiles: { work: { authMethod: "oauth" } },
    }),
  });
  expect(ctx.toJsonOutput).toHaveBeenCalledWith([
    { name: "work", active: true, authMethod: "oauth" },
  ]);
});

test("auth status and token login explain how to log in when unauthenticated", async () => {
  const oldToken = process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_API_TOKEN;
  const ctx = base();
  await handleAuth({ ...ctx, action: "status" });
  await handleAuth({
    ...ctx,
    action: "login",
    opts: { "token-stdin": true },
    readToken: () => "",
  });
  expect(ctx.fail).toHaveBeenCalledTimes(2);
  expect(ctx.fail).toHaveBeenCalledWith(
    "You are not logged into Cloudflare. Run: cf auth login",
  );
  process.env.CLOUDFLARE_API_TOKEN = oldToken;
});

test("auth login accepts a token from stdin", async () => {
  const write = jest.fn();
  const ctx = base();
  await handleAuth({
    ...ctx,
    action: "login",
    opts: { profile: "ci", "token-stdin": true, "account-id": "acct" },
    write,
    readToken: () => "stdin-token",
    writeCredentialImpl: jest.fn().mockResolvedValue(false),
  });
  expect(write).toHaveBeenCalledWith(
    expect.objectContaining({
      active: "ci",
      profiles: {
        ci: expect.objectContaining({
          apiToken: "stdin-token",
          accountId: "acct",
        }),
      },
    }),
    undefined,
    undefined,
  );
});

test("auth OAuth login saves and activates the returned token profile", async () => {
  const write = jest.fn();
  const ctx = base();
  await handleAuth({
    ...ctx,
    action: "login",
    opts: { profile: "oauth", oauth: true },
    write,
    oauthLogin: jest.fn().mockResolvedValue({
      accessToken: "oauth-token",
      refreshToken: "refresh",
    }),
    writeCredentialImpl: jest.fn().mockResolvedValue(false),
  });
  expect(write).toHaveBeenCalledWith(
    expect.objectContaining({ active: "oauth" }),
    undefined,
    undefined,
  );
});

test("auth verify checks active API tokens", async () => {
  const oldToken = process.env.CLOUDFLARE_API_TOKEN;
  process.env.CLOUDFLARE_API_TOKEN = "token";
  const ctx = base();
  ctx.cf.get.mockResolvedValue({ result: { status: "active" } });
  await handleAuth({ ...ctx, action: "verify" });
  expect(ctx.toJsonOutput).toHaveBeenCalledWith({
    verified: true,
    status: "active",
  });
  process.env.CLOUDFLARE_API_TOKEN = oldToken;
});

test("auth logout revokes stored OAuth credentials", async () => {
  const write = jest.fn();
  const revokeOAuthImpl = jest.fn();
  const deleteCredentialImpl = jest.fn();
  const ctx = base();
  await handleAuth({
    ...ctx,
    action: "logout",
    opts: { profile: "work" },
    read: () => ({ active: "work", profiles: { work: {} } }),
    write,
    readCredentialImpl: jest
      .fn()
      .mockResolvedValue({ oauthAccessToken: "oauth-token" }),
    revokeOAuthImpl,
    deleteCredentialImpl,
  });
  expect(revokeOAuthImpl).toHaveBeenCalledWith({ accessToken: "oauth-token" });
  expect(deleteCredentialImpl).toHaveBeenCalledWith("work");
});

test("auth lists an empty profile store", async () => {
  const ctx = base();
  await handleAuth({ ...ctx, action: "list" });
  expect(ctx.toJsonOutput).toHaveBeenCalledWith([
    { name: "environment", active: true, authMethod: "not configured" },
  ]);
});

test("auth uses default dependencies for a profile listing", async () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  await handleAuth({ action: "list", printer: console });
  expect(spy).toHaveBeenCalled();
  spy.mockRestore();
});

test("auth can be called with no context object", async () => {
  await expect(handleAuth()).resolves.toBeUndefined();
});

test("auth prints profile tables and switches profiles", async () => {
  const ctx = base();
  await handleAuth({ ...ctx, action: "list", outputJson: false, read: () => ({ active: "work", profiles: { work: {} } }) });
  expect(ctx.printer.log).toHaveBeenCalled();
  const write = jest.fn();
  const switched = base();
  await handleAuth({ ...switched, action: "switch", opts: { profile: "work" }, read: () => ({ active: "other", profiles: { work: {} } }), write });
  expect(write).toHaveBeenCalledWith({ active: "work", profiles: { work: {} } }, undefined, undefined);
});

test("auth covers alternate profile and credential branches", async () => {
  const list = base();
  await handleAuth({ ...list, action: "list", outputJson: false, read: () => ({ active: "other", profiles: { work: {} } }) });
  expect(list.printer.log).toHaveBeenCalled();

  const oldToken = process.env.CLOUDFLARE_API_TOKEN;
  const oldAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const oldZone = process.env.CLOUDFLARE_ZONE_ID;
  process.env.CLOUDFLARE_API_TOKEN = "environment-token";
  process.env.CLOUDFLARE_ACCOUNT_ID = "environment-account";
  process.env.CLOUDFLARE_ZONE_ID = "environment-zone";
  const write = jest.fn();
  const tokenLogin = base();
  await handleAuth({ ...tokenLogin, action: "login", opts: { profile: "env", "token-stdin": true, "account-id": "explicit-account", "zone-id": "explicit-zone" }, readToken: () => "", write, writeCredentialImpl: jest.fn().mockResolvedValue(true) });
  expect(write).toHaveBeenCalled();

  const environmentLogin = base();
  await handleAuth({ ...environmentLogin, action: "login", opts: { profile: "environment" }, write: jest.fn(), writeCredentialImpl: jest.fn().mockResolvedValue(false) });

  const logoutWrite = jest.fn();
  const logout = base();
  await handleAuth({ ...logout, action: "logout", read: () => ({ active: "work", profiles: { work: {}, next: {} } }), write: logoutWrite, readCredentialImpl: jest.fn().mockResolvedValue(null), deleteCredentialImpl: jest.fn() });
  expect(logoutWrite).toHaveBeenCalledWith(expect.objectContaining({ active: "next" }), undefined, undefined);
  const activeElsewhere = base();
  await handleAuth({ ...activeElsewhere, action: "logout", opts: { profile: "work" }, read: () => ({ active: "next", profiles: { work: {}, next: {} } }), write: jest.fn(), readCredentialImpl: jest.fn().mockResolvedValue(null), deleteCredentialImpl: jest.fn() });
  if (oldToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN; else process.env.CLOUDFLARE_API_TOKEN = oldToken;
  if (oldAccount === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID; else process.env.CLOUDFLARE_ACCOUNT_ID = oldAccount;
  if (oldZone === undefined) delete process.env.CLOUDFLARE_ZONE_ID; else process.env.CLOUDFLARE_ZONE_ID = oldZone;
});

test("auth status and verify support text output and inactive tokens", async () => {
  const oldToken = process.env.CLOUDFLARE_API_TOKEN;
  const oldProfile = process.env.CLOUDFLARE_PROFILE;
  process.env.CLOUDFLARE_API_TOKEN = "token";
  process.env.CLOUDFLARE_PROFILE = "work";
  const ctx = base();
  ctx.cf.get.mockResolvedValueOnce({ result: { id: "user", email: "user@example.test" } }).mockResolvedValueOnce({ result: {} });
  await handleAuth({ ...ctx, action: "status", outputJson: false });
  await handleAuth({ ...ctx, action: "verify", outputJson: false });
  expect(ctx.printer.log).toHaveBeenCalledWith("work authenticated as user@example.test");
  expect(ctx.printer.log).toHaveBeenCalledWith("unknown");
  const noEmail = base();
  noEmail.cf.get.mockResolvedValue({ result: {} });
  await handleAuth({ ...noEmail, action: "status", outputJson: false });
  if (oldToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN; else process.env.CLOUDFLARE_API_TOKEN = oldToken;
  if (oldProfile === undefined) delete process.env.CLOUDFLARE_PROFILE; else process.env.CLOUDFLARE_PROFILE = oldProfile;
});

test("auth handles an empty token when environment credentials are absent", async () => {
  const oldToken = process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_API_TOKEN;
  const ctx = base();
  const readFileSync = jest.spyOn(fs, "readFileSync").mockReturnValue("");
  await handleAuth({ ...ctx, action: "login", opts: { "token-stdin": true } });
  readFileSync.mockRestore();
  expect(ctx.fail).toHaveBeenCalledWith("You are not logged into Cloudflare. Run: cf auth login");
  if (oldToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
  else process.env.CLOUDFLARE_API_TOKEN = oldToken;
});

test("auth OAuth login omits the token when keychain storage succeeds", async () => {
  const write = jest.fn();
  const ctx = base();
  await handleAuth({
    ...ctx,
    action: "login",
    opts: { profile: "secure", oauth: true },
    write,
    oauthLogin: jest.fn().mockResolvedValue({ accessToken: "access" }),
    writeCredentialImpl: async () => true,
  });
  expect(write).toHaveBeenCalledWith(
    expect.objectContaining({ profiles: { secure: expect.not.objectContaining({ apiToken: expect.anything() }) } }),
    undefined,
    undefined,
  );
});

test("auth OAuth login accepts configured and requested scopes", async () => {
  const oldScopes = process.env.CF_OAUTH_SCOPES;
  process.env.CF_OAUTH_SCOPES = "custom.read, zone.read";
  const write = jest.fn();
  const oauthLogin = jest.fn().mockResolvedValue({ accessToken: "access", scopes: ["custom.read"] });
  const ctx = base();
  await handleAuth({
    ...ctx,
    action: "login",
    opts: { profile: "work", oauth: true, scope: ["extra.read"], scopes: ["another.read"], "account-id": "acct", "zone-id": "zone" },
    write,
    oauthLogin,
    writeCredentialImpl: jest.fn().mockResolvedValue(true),
  });
  expect(oauthLogin).toHaveBeenCalledWith(expect.objectContaining({
    clientId: expect.any(String),
    scopePicker: true,
    scopes: expect.arrayContaining(["custom.read", "zone.read", "extra.read", "another.read"]),
  }));
  expect(write).toHaveBeenCalledWith(expect.objectContaining({
    profiles: { work: expect.objectContaining({ scopes: ["custom.read"], accountId: "acct", zoneId: "zone" }) },
  }), undefined, undefined);
  if (oldScopes === undefined) delete process.env.CF_OAUTH_SCOPES;
  else process.env.CF_OAUTH_SCOPES = oldScopes;
});

test("auth switch, logout, status, and verify report missing credentials or profiles", async () => {
  const ctx = base();
  await handleAuth({ ...ctx, action: "switch", opts: {} });
  await handleAuth({ ...ctx, action: "logout", opts: {}, read: () => ({ active: null, profiles: {} }) });
  expect(ctx.fail).toHaveBeenCalledWith("Unknown profile: (missing --profile)");
  expect(ctx.fail).toHaveBeenCalledWith("Unknown profile: (none)");

  const oldToken = process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_API_TOKEN;
  await handleAuth({ ...ctx, action: "verify" });
  expect(ctx.fail).toHaveBeenCalledWith("cf auth verify requires CLOUDFLARE_API_TOKEN");
  if (oldToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
  else process.env.CLOUDFLARE_API_TOKEN = oldToken;

  const unknown = base();
  await handleAuth({ ...unknown, action: "unknown" });
  expect(unknown.fail).toHaveBeenCalledWith("Unknown auth action: unknown");
});
