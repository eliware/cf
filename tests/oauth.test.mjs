import { jest } from "@jest/globals";
import {
  openBrowser,
  refreshOAuth,
  revokeOAuth,
  loginOAuth,
} from "../src/oauth.mjs";
import http from "node:http";
import { EventEmitter } from "node:events";

test("OAuth refresh and revoke use Cloudflare token endpoints", async () => {
  const fetchImpl = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "new",
        refresh_token: "next",
        expires_in: 120,
      }),
    })
    .mockResolvedValueOnce({ ok: true });
  const refreshed = await refreshOAuth({
    refreshToken: "old",
    clientId: "client",
    fetchImpl,
  });
  expect(refreshed.accessToken).toBe("new");
  await revokeOAuth({ accessToken: "new", clientId: "client", fetchImpl });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(fetchImpl.mock.calls[0][1].body.get("grant_type")).toBe(
    "refresh_token",
  );
  const fallbackFetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ access_token: "newer" }),
  });
  const fallback = await refreshOAuth({
    refreshToken: "old",
    fetchImpl: fallbackFetch,
  });
  expect(fallback.refreshToken).toBe("old");
  expect(fallback.expiresIn).toBeUndefined();
  await revokeOAuth({
    accessToken: "new",
    fetchImpl: jest.fn().mockResolvedValue({ ok: true }),
  });
});

test("OAuth helpers use default clients and fetch implementation", async () => {
  const originalFetch = globalThis.fetch;
  const fetchImpl = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "default-access" }),
    })
    .mockResolvedValueOnce({ ok: true });
  globalThis.fetch = fetchImpl;
  try {
    await refreshOAuth({ refreshToken: "refresh" });
    await revokeOAuth({ accessToken: "default-access" });
  } finally {
    globalThis.fetch = originalFetch;
  }
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(fetchImpl.mock.calls[0][1].body.get("client_id")).toBe(
    "f4fb39624f6674b6fb50d5a793a23389",
  );
});

test("browser launcher selects the native command for each platform", () => {
  for (const platform of ["darwin", "win32", "linux"]) {
    const unref = jest.fn();
    const spawnImpl = jest.fn(() => ({ unref }));
    openBrowser("https://example.test", { platform, spawnImpl });
    expect(spawnImpl).toHaveBeenCalledWith(
      platform === "darwin"
        ? "open"
        : platform === "win32"
          ? "start"
          : "xdg-open",
      ["https://example.test"],
      expect.objectContaining({ shell: platform === "win32" }),
    );
    expect(unref).toHaveBeenCalled();
  }
  const unref = jest.fn();
  openBrowser("https://example.test", {
    spawnImpl: jest.fn(() => ({ unref })),
  });
  expect(unref).toHaveBeenCalled();
  const defaultUnref = jest.fn();
  openBrowser(
    "about:blank",
    undefined,
    jest.fn(() => ({ unref: defaultUnref })),
  );
  expect(defaultUnref).toHaveBeenCalled();
});

test("OAuth login validates client configuration before opening a browser", async () => {
  await expect(loginOAuth({ clientId: "" })).rejects.toThrow(
    "Missing CF_OAUTH_CLIENT_ID",
  );
});

test("OAuth login serves a state-protected callback and exchanges the code", async () => {
  const printed = [];
  const fetchImpl = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 30,
    }),
  });
  const resultPromise = loginOAuth({
    clientId: "client",
    ports: [0],
    open: jest.fn(),
    print: (value) => printed.push(value),
    fetchImpl,
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const authorization = new URL(printed[0].match(/https?:\/\/\S+/)[0]);
  await new Promise((resolve, reject) =>
    http
      .get(
        `${authorization.searchParams.get("redirect_uri").replace("/oauth/callback", "/wrong")}?state=${authorization.searchParams.get("state")}`,
        (response) => {
          expect(response.statusCode).toBe(404);
          response.resume();
          response.on("end", resolve);
        },
      )
      .on("error", reject),
  );
  await new Promise((resolve, reject) =>
    http
      .get(
        `${authorization.searchParams.get("redirect_uri")}?state=${authorization.searchParams.get("state")}&code=code`,
        (response) => {
          response.resume();
          response.on("end", resolve);
        },
      )
      .on("error", reject),
  );
  await expect(resultPromise).resolves.toMatchObject({
    accessToken: "access",
    refreshToken: "refresh",
  });
  expect(fetchImpl).toHaveBeenCalledWith(
    "https://dash.cloudflare.com/oauth2/token",
    expect.any(Object),
  );
});

test("OAuth scope picker opens a local setup page and redirects with selected scopes", async () => {
  const printed = [];
  const fetchImpl = jest
    .fn()
    .mockImplementation(async (url) =>
      url.includes("/token")
        ? { ok: true, json: async () => ({ access_token: "access" }) }
        : { ok: false },
    );
  const promise = loginOAuth({
    clientId: "client",
    scopePicker: true,
    scopes: ["zone.read"],
    ports: [0],
    open: jest.fn(),
    print: (value) => printed.push(value),
    fetchImpl,
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const landing = new URL(printed[0].match(/https?:\/\/\S+/)[0]);
  await new Promise((resolve, reject) =>
    http
      .get(landing, (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          expect(body).toContain("Set up cf");
          expect(body).toContain("scope-search");
          resolve();
        });
      })
      .on("error", reject),
  );
  let authorization;
  const startUrl = new URL(landing);
  startUrl.pathname = "/oauth/start";
  await new Promise((resolve, reject) => {
    const request = http.request(startUrl, { method: "POST" }, (response) => {
      expect(response.statusCode).toBe(302);
      response.resume();
      response.on("end", resolve);
    });
    request.on("error", reject);
    request.end();
  });
  await new Promise((resolve, reject) => {
    const request = http.request(
      startUrl,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
      },
      (response) => {
        expect(response.statusCode).toBe(302);
        authorization = new URL(response.headers.location);
        expect(authorization.searchParams.get("scope")).toContain("dns.write");
        response.resume();
        response.on("end", resolve);
      },
    );
    request.on("error", reject);
    request.end("scope=zone.read&scope=dns.write");
  });
  const callback = new URL(landing);
  callback.pathname = "/oauth/callback";
  callback.search = `?state=${authorization.searchParams.get("state")}&code=code`;
  await new Promise((resolve, reject) =>
    http
      .get(callback, (response) => {
        response.resume();
        response.on("end", resolve);
      })
      .on("error", reject),
  );
  await expect(promise).resolves.toMatchObject({ accessToken: "access" });
});

test("OAuth success page confirms the account without exposing the token", async () => {
  const printed = [];
  const responses = [];
  const fetchImpl = jest.fn().mockImplementation(async (url) =>
    url.includes("/token")
      ? {
          ok: true,
          json: async () => ({
            access_token: "secret-access",
            refresh_token: "refresh",
          }),
        }
      : {
          ok: true,
          json: async () => ({ result: { name: `Acme & <Co> "'` } }),
        },
  );
  const promise = loginOAuth({
    clientId: "client",
    scopes: ["user-details.read", "zone.read", "dns.read"],
    ports: [0],
    open: jest.fn(),
    print: (value) => printed.push(value),
    fetchImpl,
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const authorization = new URL(printed[0].match(/https?:\/\/\S+/)[0]);
  await new Promise((resolve, reject) =>
    http
      .get(
        `${authorization.searchParams.get("redirect_uri")}?state=${authorization.searchParams.get("state")}&code=code`,
        (response) => {
          responses.push(response);
          let body = "";
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => {
            expect(body).toContain("Acme &amp; &lt;Co&gt; &quot;&#39;");
            expect(body).not.toContain("secret-access");
            resolve();
          });
        },
      )
      .on("error", reject),
  );
  await expect(promise).resolves.toMatchObject({
    account: { name: `Acme & <Co> "'` },
    scopes: ["user-details.read", "zone.read", "dns.read"],
  });
});

test("OAuth success page remains useful when account confirmation fails", async () => {
  const printed = [];
  const fetchImpl = jest
    .fn()
    .mockImplementation(async (url) =>
      url.includes("/token")
        ? { ok: true, json: async () => ({ access_token: "access" }) }
        : Promise.reject(new Error("account unavailable")),
    );
  const promise = loginOAuth({
    clientId: "client",
    ports: [0],
    open: jest.fn(),
    print: (value) => printed.push(value),
    fetchImpl,
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const authorization = new URL(printed[0].match(/https?:\/\/\S+/)[0]);
  await new Promise((resolve, reject) =>
    http
      .get(
        `${authorization.searchParams.get("redirect_uri")}?state=${authorization.searchParams.get("state")}&code=code`,
        (response) => {
          response.resume();
          response.on("end", resolve);
        },
      )
      .on("error", reject),
  );
  await expect(promise).resolves.toMatchObject({ account: null });
});

test("OAuth success page tolerates an unavailable account response", async () => {
  const printed = [];
  const fetchImpl = jest
    .fn()
    .mockImplementation(async (url) =>
      url.includes("/token")
        ? { ok: true, json: async () => ({ access_token: "access" }) }
        : { ok: false },
    );
  const promise = loginOAuth({
    clientId: "client",
    ports: [0],
    open: jest.fn(),
    print: (value) => printed.push(value),
    fetchImpl,
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const authorization = new URL(printed[0].match(/https?:\/\/\S+/)[0]);
  await new Promise((resolve, reject) =>
    http
      .get(
        `${authorization.searchParams.get("redirect_uri")}?state=${authorization.searchParams.get("state")}&code=code`,
        (response) => {
          response.resume();
          response.on("end", resolve);
        },
      )
      .on("error", reject),
  );
  await expect(promise).resolves.toMatchObject({ account: null });
});

test("OAuth token helpers report failed and malformed responses", async () => {
  await expect(
    refreshOAuth({
      refreshToken: "old",
      fetchImpl: jest.fn().mockResolvedValue({ ok: false, status: 401 }),
    }),
  ).rejects.toThrow("401");
  await expect(
    refreshOAuth({
      refreshToken: "old",
      fetchImpl: jest
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({}) }),
    }),
  ).rejects.toThrow("access_token");
  await expect(
    revokeOAuth({
      accessToken: "access",
      fetchImpl: jest.fn().mockResolvedValue({ ok: false }),
    }),
  ).resolves.toBe(false);
});

test("OAuth login falls back when the first callback port is busy", async () => {
  const occupied = http.createServer();
  await new Promise((resolve) => occupied.listen(8765, "127.0.0.1", resolve));
  try {
    const printed = [];
    const promise = loginOAuth({
      clientId: "client",
      ports: [8765, 0],
      open: jest.fn(),
      print: (value) => printed.push(value),
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: "access" }),
      }),
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const authorization = new URL(printed[0].match(/https?:\/\/\S+/)[0]);
    await new Promise((resolve, reject) =>
      http
        .get(
          `${authorization.searchParams.get("redirect_uri")}?state=${authorization.searchParams.get("state")}&code=code`,
          (response) => {
            response.resume();
            response.on("end", resolve);
          },
        )
        .on("error", reject),
    );
    await expect(promise).resolves.toMatchObject({ accessToken: "access" });
  } finally {
    await new Promise((resolve) => occupied.close(resolve));
  }
});

test("OAuth callback rejects invalid state and provider errors", async () => {
  for (const providerError of [false, true]) {
    const printed = [];
    const promise = loginOAuth({
      clientId: "client",
      ports: [0],
      open: jest.fn(),
      print: (value) => printed.push(value),
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const authorization = new URL(printed[0].match(/https?:\/\/\S+/)[0]);
    const rejection = expect(promise).rejects.toThrow(
      providerError ? "Cloudflare authorization failed" : "Invalid OAuth state",
    );
    const query = providerError
      ? `state=${authorization.searchParams.get("state")}&error=access_denied`
      : "state=wrong&code=code";
    await new Promise((resolve, reject) =>
      http
        .get(
          `${authorization.searchParams.get("redirect_uri")}?${query}`,
          (response) => {
            let body = "";
            response.on("data", (chunk) => {
              body += chunk;
            });
            response.on("end", () => {
              expect(body).toContain(
                providerError
                  ? "Authorization cancelled"
                  : "Authorization request expired",
              );
              expect(body).toContain("cf auth login");
              resolve();
            });
          },
        )
        .on("error", reject),
    );
    await rejection;
  }
});

test("OAuth callback reports token exchange and response errors", async () => {
  for (const [fetchImpl, message] of [
    [
      jest.fn().mockResolvedValue({ ok: false, status: 500 }),
      "OAuth token exchange failed",
    ],
    [
      jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
      "OAuth token response did not include",
    ],
  ]) {
    const printed = [];
    const promise = loginOAuth({
      clientId: "client",
      ports: [0],
      open: jest.fn(),
      print: (value) => printed.push(value),
      fetchImpl,
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const authorization = new URL(printed[0].match(/https?:\/\/\S+/)[0]);
    const rejection = expect(promise).rejects.toThrow(message);
    await new Promise((resolve, reject) =>
      http
        .get(
          `${authorization.searchParams.get("redirect_uri")}?state=${authorization.searchParams.get("state")}&code=code`,
          (response) => {
            response.resume();
            response.on("end", resolve);
          },
        )
        .on("error", reject),
    );
    await rejection;
  }
});

test("OAuth login reports exhausted and non-retryable callback listeners", async () => {
  class FailingServer extends EventEmitter {
    constructor(code) {
      super();
      this.code = code;
    }
    listen() {
      process.nextTick(() =>
        this.emit(
          "error",
          Object.assign(new Error(this.code), { code: this.code }),
        ),
      );
    }
    close() {}
  }
  await expect(
    loginOAuth({
      clientId: "client",
      ports: [1, 2],
      serverFactory: () => new FailingServer("EADDRINUSE"),
      open: jest.fn(),
    }),
  ).rejects.toThrow("No OAuth callback port available");
  await expect(
    loginOAuth({
      clientId: "client",
      ports: [1],
      serverFactory: () => new FailingServer("EACCES"),
      open: jest.fn(),
    }),
  ).rejects.toThrow("EACCES");
  const occupiedError = Object.assign(new Error("busy"), {
    code: "EADDRINUSE",
  });
  await expect(
    loginOAuth({
      clientId: "client",
      ports: [1],
      serverFactory: () => {
        throw occupiedError;
      },
      open: jest.fn(),
    }),
  ).rejects.toThrow("No OAuth callback port available");
});

test("OAuth login accepts a callback server without an address object", async () => {
  class ListeningServer extends EventEmitter {
    once(...args) {
      return super.once(...args);
    }
    listen() {
      process.nextTick(() => this.emit("listening"));
    }
    address() {
      return undefined;
    }
    close() {}
  }
  const server = new ListeningServer();
  const printed = [];
  const promise = loginOAuth({
    clientId: "client",
    ports: [4321],
    serverFactory: () => server,
    open: jest.fn(),
    print: (value) => printed.push(value),
    fetchImpl: jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "access" }),
    }),
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const authorization = new URL(printed[0].match(/https?:\/\/\S+/)[0]);
  const response = { writeHead: jest.fn(), end: jest.fn() };
  server.emit(
    "request",
    {
      url: `/oauth/callback?state=${authorization.searchParams.get("state")}&code=code`,
    },
    response,
  );
  await expect(promise).resolves.toMatchObject({ accessToken: "access" });
});
