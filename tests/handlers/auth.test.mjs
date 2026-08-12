import { jest } from "@jest/globals";
import { handleAuth } from "../../src/handlers/auth.mjs";

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
