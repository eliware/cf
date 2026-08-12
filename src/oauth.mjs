import crypto from "node:crypto";
import http from "node:http";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { VERSION } from "./version.mjs";
import scopeCatalog from "../data/cloudflare-oauth-scopes.json" with { type: "json" };
import moduleCatalog from "../data/cloudflare-oauth-modules.json" with { type: "json" };

export const DEFAULT_OAUTH_PORTS = [8765, 8766, 8767, 8768, 8769];
export const DEFAULT_OAUTH_SCOPES = [
  "account-settings.read",
  "user-details.read",
  "zone.read",
  "zone.write",
  "zone-settings.read",
  "zone-settings.write",
  "dns.read",
  "dns.write",
  "account-rulesets.read",
  "account-rulesets.write",
  "account-rule-lists.read",
  "account-rule-lists.write",
  "zone-waf.read",
  "zone-waf.write",
  "ssl-and-certificates.read",
  "ssl-and-certificates.write",
  "cache.purge",
  "healthcheck.read",
  "healthcheck.write",
  "account-logs.read",
  "load-balancing-monitors-and-pools.read",
  "load-balancing-monitors-and-pools.write",
  "argotunnel.read",
  "argotunnel.write",
  "workers-scripts.read",
  "workers-scripts.write",
  "workers-scripts.bind",
  "page.read",
  "page.write",
  "workers-r2.read",
  "workers-r2.write",
  "d1.read",
  "d1.write",
  "queues.read",
  "queues.write",
  "stream.read",
  "stream.write",
  "images.read",
  "images.write",
  "ai.read",
  "ai.write",
  "access.read",
  "access.write",
];
export const REQUIRED_OAUTH_SCOPES = ["user-details.read", "zone.read"];
export const DEFAULT_OAUTH_CLIENT_ID = "f4fb39624f6674b6fb50d5a793a23389";
const AUTH_URL = "https://dash.cloudflare.com/oauth2/auth";
const TOKEN_URL = "https://dash.cloudflare.com/oauth2/token";
const USER_URL = "https://api.cloudflare.com/client/v4/user";

function base64url(value) {
  return value.toString("base64url");
}
export function openBrowser(url, options, spawnImpl = spawn) {
  const {
    platform = process.platform,
    spawnImpl: configuredSpawnImpl = spawnImpl,
  } = options ?? {};
  const command =
    platform === "darwin"
      ? "open"
      : platform === "win32"
        ? "start"
        : "xdg-open";
  const child = configuredSpawnImpl(command, [url], {
    detached: true,
    stdio: "ignore",
    shell: platform === "win32",
  });
  child.unref();
  return child;
}

export async function refreshOAuth({
  refreshToken,
  clientId = DEFAULT_OAUTH_CLIENT_ID,
  fetchImpl = fetch,
}) {
  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
    }),
  });
  if (!response.ok)
    throw new Error(`OAuth token refresh failed (${response.status})`);
  const tokens = await response.json();
  if (!tokens.access_token)
    throw new Error("OAuth refresh response did not include access_token");
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || refreshToken,
    expiresIn: tokens.expires_in,
    expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
  };
}

export async function revokeOAuth({
  accessToken,
  clientId = DEFAULT_OAUTH_CLIENT_ID,
  fetchImpl = fetch,
}) {
  const response = await fetchImpl(
    "https://dash.cloudflare.com/oauth2/revoke",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: accessToken, client_id: clientId }),
    },
  );
  return response.ok;
}

/* istanbul ignore next */
function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}
function currentCopyright() {
  return copyrightYear();
}
export function copyrightYear(year = new Date().getUTCFullYear()) {
  return year > 2026 ? `2026-${year}` : "2026";
}
export async function collectOAuthSummary({ accessToken, account, scopes, fetchImpl }) {
  const enabled = MODULE_CATALOG.filter((module) =>
    module.scopes.every((scope) => scopes.includes(scope)),
  );
  const summary = { zones: [], dns: [], errors: [] };
  const get = async (url) => {
    try {
      const response = await fetchImpl(`https://api.cloudflare.com/client/v4${url}`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return null;
      return (await response.json())?.result ?? null;
    } catch (error) {
      summary.errors.push(error.message);
      return null;
    }
  };
  if (enabled.some((module) => module.id === "zones")) {
    summary.zones = (await get("/zones?per_page=5")) || [];
  }
  if (enabled.some((module) => module.id === "dns") && summary.zones[0]?.id) {
    summary.dns =
      (await get(`/zones/${encodeURIComponent(summary.zones[0].id)}/dns_records?per_page=5`)) || [];
  }
  return { enabled, zones: summary.zones, dns: summary.dns, errors: summary.errors, account };
}
function moduleCard(module, enabled) {
  return `<div class="module"><strong>${escapeHtml(module.name)}</strong><small>${enabled ? "Enabled · ready for its selected scopes." : `Requires: ${escapeHtml(module.scopes.join(", "))}`}</small></div>`;
}
function successPage({ account, scopes, summary }) {
  const enabled = summary.enabled;
  const disabled = MODULE_CATALOG.filter((module) => !enabled.includes(module));
  const zone = summary.zones[0]?.name || "example.com";
  const examples = [
    enabled.some((module) => module.id === "zones") && `cf zone list`,
    enabled.some((module) => module.id === "dns") && `cf dns record list --zone ${zone}`,
    enabled.some((module) => module.id === "zone-settings") && `cf zone settings list --zone ${zone}`,
    enabled.some((module) => module.id === "workers") && "cf workers list",
  ].filter(Boolean).map((example) => `<div class="example"><code>${escapeHtml(example)}</code></div>`).join("");
  const logoData = encodeURIComponent(pickerAsset("oauth-web/cf-logo.svg")).replace(/'/g, "%27");
  return pickerAsset("oauth-web/oauth-success.html")
    .replaceAll("__SUCCESS_CSS__", pickerAsset("oauth-web/oauth-success.css"))
    .replaceAll("__CF_LOGO_DATA__", logoData)
    .replaceAll("__ACCOUNT__", escapeHtml(account?.name || account?.email || "your Cloudflare account"))
    .replaceAll("__SCOPE_COUNT__", String(scopes.length))
    .replaceAll("__ENABLED_COUNT__", String(enabled.length))
    .replaceAll("__ZONE_COUNT__", String(summary.zones.length))
    .replaceAll("__DNS_COUNT__", String(summary.dns.length))
    .replaceAll("__ENABLED_MODULES__", enabled.map((module) => moduleCard(module, true)).join(""))
    .replaceAll("__DISABLED_MODULES__", disabled.map((module) => moduleCard(module, false)).join(""))
    .replaceAll("__EXAMPLES__", examples || "<p>Select a module to see command examples.</p>")
    .replaceAll("__COPYRIGHT__", currentCopyright())
    .replaceAll("__VERSION__", VERSION);
}
function failurePage({ title, detail }) {
  const logoData = encodeURIComponent(
    pickerAsset("oauth-web/cf-logo.svg"),
  ).replace(/'/g, "%27");
  return pickerAsset("oauth-web/oauth-result.html")
    .replaceAll("__RESULT_TITLE__", escapeHtml(title))
    .replaceAll("__RESULT_DETAIL__", escapeHtml(detail))
    .replaceAll("__RESULT_CSS__", pickerAsset("oauth-web/oauth-result.css"))
    .replaceAll("__CF_LOGO_DATA__", logoData)
    .replaceAll("__COPYRIGHT__", currentCopyright())
    .replaceAll("__VERSION__", VERSION);
}

const SCOPE_CATALOG_DATA = scopeCatalog.categories;
const MODULE_CATALOG = moduleCatalog.modules;
const ALLOWED_OAUTH_SCOPES = new Set(
  Object.values(SCOPE_CATALOG_DATA).flatMap((features) =>
    features.flatMap((feature) => feature.scopes.map((scope) => scope.scope)),
  ),
);
const pickerAsset = (name) =>
  readFileSync(fileURLToPath(new URL(`./${name}`, import.meta.url)), "utf8");
const pickerHtml = () =>
  pickerAsset("oauth-web/oauth-picker.html")
    .replace(
      "__CF_SCOPE_MODEL__",
      JSON.stringify({
        categories: SCOPE_CATALOG_DATA,
        modules: MODULE_CATALOG,
        requiredScopes: REQUIRED_OAUTH_SCOPES,
      }).replace(/</g, "\\u003c"),
    )
    .replaceAll(
      "__COPYRIGHT_YEAR__",
      copyrightYear(),
    )
    .replaceAll("__APP_VERSION__", VERSION);
function readRequestBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(new URLSearchParams(body)));
  });
}

export async function loginOAuth({
  clientId,
  scopes = DEFAULT_OAUTH_SCOPES,
  scopePicker = false,
  ports = DEFAULT_OAUTH_PORTS,
  bindHost = "127.0.0.1",
  redirectHost = "127.0.0.1",
  fetchImpl = fetch,
  open = openBrowser,
  print = console.log,
  serverFactory = http.createServer,
}) {
  if (!clientId) throw new Error("Missing CF_OAUTH_CLIENT_ID");
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest(),
  );
  const state = base64url(crypto.randomBytes(24));
  let server;
  let port;
  for (const candidate of ports) {
    try {
      server = serverFactory();
      await new Promise((resolve, reject) => {
        const onError = (error) => {
          server.removeListener("listening", onListen);
          reject(error);
        };
        const onListen = () => {
          server.removeListener("error", onError);
          resolve();
        };
        server.once("error", onError);
        server.once("listening", onListen);
        server.listen(candidate, bindHost);
      });
      port = server.address()?.port || candidate;
      break;
    } catch (error) {
      if (server) server.close();
      if (error.code !== "EADDRINUSE") throw error;
    }
  }
  if (!server || !port)
    throw new Error("No OAuth callback port available (tried 8765-8769)");
  const redirectUri = `http://${redirectHost}:${port}/oauth/callback`;
  const makeAuthorization = (selected) => {
    const authorization = new URL(AUTH_URL);
    authorization.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: selected.join(" "),
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
    }).toString();
    return authorization;
  };
  let selectedScopes = [...new Set([...REQUIRED_OAUTH_SCOPES, ...scopes])];
  print(
    `Open this URL to ${scopePicker ? "set up cf" : "authorize cf"}: ${scopePicker ? `http://${redirectHost}:${port}/` : makeAuthorization(selectedScopes)}`,
  );
  const callback = new Promise((resolve, reject) =>
    server.on("request", (request, response) => {
      const url = new URL(request.url, redirectUri);
      if (scopePicker && url.pathname === "/" && request.method === "GET") {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(pickerHtml());
        return;
      }
      if (
        scopePicker &&
        url.pathname === "/oauth-picker.css" &&
        request.method === "GET"
      ) {
        response.writeHead(200, { "content-type": "text/css; charset=utf-8" });
        response.end(pickerAsset("oauth-web/oauth-picker.css"));
        return;
      }
      if (
        scopePicker &&
        url.pathname === "/oauth-picker.mjs" &&
        request.method === "GET"
      ) {
        response.writeHead(200, {
          "content-type": "text/javascript; charset=utf-8",
        });
        response.end(pickerAsset("oauth-web/oauth-picker.mjs"));
        return;
      }
      if (
        scopePicker &&
        url.pathname === "/oauth-web/cf-logo.svg" &&
        request.method === "GET"
      ) {
        response.writeHead(200, { "content-type": "image/svg+xml" });
        response.end(pickerAsset("oauth-web/cf-logo.svg"));
        return;
      }
      if (
        scopePicker &&
        url.pathname === "/oauth-web/cloudflare-115x53.png" &&
        request.method === "GET"
      ) {
        response.writeHead(200, { "content-type": "image/png" });
        response.end(
          readFileSync(
            fileURLToPath(
              new URL("./oauth-web/cloudflare-115x53.png", import.meta.url),
            ),
          ),
        );
        return;
      }
      if (
        scopePicker &&
        url.pathname === "/oauth-web/eliware-115x115.png" &&
        request.method === "GET"
      ) {
        response.writeHead(200, { "content-type": "image/png" });
        response.end(
          readFileSync(
            fileURLToPath(
              new URL("./oauth-web/eliware-115x115.png", import.meta.url),
            ),
          ),
        );
        return;
      }
      if (
        scopePicker &&
        url.pathname === "/oauth-result.css" &&
        request.method === "GET"
      ) {
        response.writeHead(200, { "content-type": "text/css; charset=utf-8" });
        response.end(pickerAsset("oauth-web/oauth-result.css"));
        return;
      }
      if (
        scopePicker &&
        url.pathname === "/oauth/start" &&
        request.method === "POST"
      ) {
        readRequestBody(request).then((form) => {
          const requested = form
            .getAll("scope")
            .filter((scope) => ALLOWED_OAUTH_SCOPES.has(scope));
          selectedScopes = [
            ...new Set([
              ...REQUIRED_OAUTH_SCOPES,
              ...(requested.length ? requested : scopes),
            ]),
          ];
          response.writeHead(302, {
            location: makeAuthorization(selectedScopes).toString(),
          });
          response.end();
        });
        return;
      }
      if (url.pathname !== "/oauth/callback") {
        response.writeHead(404);
        response.end();
        return;
      }
      if (url.searchParams.get("state") !== state) {
        response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
        response.end(
          failurePage({
            title: "Authorization request expired",
            detail:
              "This callback no longer matches the login request. Start a new login from the cf command line and try again.",
          }),
        );
        reject(
          new Error(
            "OAuth login expired or was opened in another browser. Run `cf auth login` again using the newest URL.",
          ),
        );
        return;
      }
      const error = url.searchParams.get("error");
      if (error) {
        const description =
          url.searchParams.get("error_description") ||
          "The authorization request was not completed.";
        response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
        response.end(
          failurePage({
            title:
              error === "access_denied"
                ? "Authorization cancelled"
                : "Authorization failed",
            detail: description,
          }),
        );
        reject(new Error(`Cloudflare authorization failed: ${error}`));
        return;
      }
      resolve({ code: url.searchParams.get("code"), response });
    }),
  );
  const browserUrl = scopePicker
    ? `http://${redirectHost}:${port}/`
    : makeAuthorization(selectedScopes).toString();
  try {
    const browser = open(browserUrl);
    browser?.once?.("error", (error) => {
      print(
        `Could not open a browser automatically (${error.code || error.message}). Copy the URL above into a browser.`,
      );
    });
  } catch (error) {
    print(
      `Could not open a browser automatically (${error.code || error.message}). Copy the URL above into a browser.`,
    );
  }
  try {
    const { code, response: callbackResponse } = await callback;
    try {
      const response = await fetchImpl(TOKEN_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          code,
          redirect_uri: redirectUri,
          code_verifier: verifier,
        }),
      });
      if (!response.ok)
        throw new Error(`OAuth token exchange failed (${response.status})`);
      const tokens = await response.json();
      if (!tokens.access_token)
        throw new Error("OAuth token response did not include access_token");
      let account = null;
      try {
        const accountResponse = await fetchImpl(USER_URL, {
          headers: { authorization: `Bearer ${tokens.access_token}` },
        });
        if (accountResponse.ok)
          account = (await accountResponse.json())?.result;
      } catch {
        /* account confirmation is best effort */
      }
      const summary = await collectOAuthSummary({
        accessToken: tokens.access_token,
        account,
        scopes: selectedScopes,
        fetchImpl,
      });
      callbackResponse.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
      });
      callbackResponse.end(
        successPage({ account, scopes: selectedScopes, summary }),
      );
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
        scopes: selectedScopes,
        account,
      };
    } catch (error) {
      callbackResponse.writeHead(400, {
        "content-type": "text/html; charset=utf-8",
      });
      callbackResponse.end(
        "<!doctype html><title>cf authorization failed</title><p>Cloudflare authorization could not be completed. You may close this window and try again.</p>",
      );
      throw error;
    }
  } finally {
    // Give the browser time to receive the inline result page before the
    // one-shot callback server shuts down.
    setTimeout(() => server.close(), 250);
  }
}
