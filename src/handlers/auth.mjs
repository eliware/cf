import { readProfiles, writeProfiles } from "../profiles.mjs";
import { printTable } from "../output.mjs";
import {
  deleteCredential,
  readCredential,
  writeCredential,
} from "../credentials.mjs";
import { fs } from "@eliware/common";
import {
  DEFAULT_OAUTH_CLIENT_ID,
  DEFAULT_OAUTH_SCOPES,
  loginOAuth,
  revokeOAuth,
} from "../oauth.mjs";

export async function handleAuth({
  cf,
  action,
  opts,
  outputJson,
  printer,
  toJsonOutput,
  fail,
  profileHome,
  profileFs,
  read = readProfiles,
  write = writeProfiles,
  readToken = () => fs.readFileSync(0, "utf8").trim(),
  oauthLogin = loginOAuth,
  writeCredentialImpl = writeCredential,
  readCredentialImpl = readCredential,
  deleteCredentialImpl = deleteCredential,
  revokeOAuthImpl = revokeOAuth,
} = /* istanbul ignore next */ {}) {
  const data = read(profileHome, profileFs);
  if (action === "list") {
    const profiles = Object.entries(data.profiles).map(([name, value]) => ({
      name,
      active: name === data.active,
      authMethod: value.authMethod || "oauth",
    }));
    if (!profiles.length)
      profiles.push({
        name: "environment",
        active: true,
        authMethod: "not configured",
      });
    return outputJson
      ? toJsonOutput(profiles)
      : printTable(
          ["ACTIVE", "NAME", "AUTH METHOD"],
          profiles.map((profile) => [
            profile.active ? "*" : "",
            profile.name,
            profile.authMethod,
          ]),
          printer.log,
        );
  }
  if (action === "login") {
    const name = opts?.profile || "default";
    const hasEnvironmentCredentials = process.env.CLOUDFLARE_API_TOKEN;
    if (opts?.oauth || (!opts?.["token-stdin"] && !hasEnvironmentCredentials)) {
      const configuredScopes = (process.env.CF_OAUTH_SCOPES || "")
        .split(",")
        .map((scope) => scope.trim())
        .filter(Boolean);
      const requestedScopes = []
        .concat(opts?.scopes || [], opts?.scope || [])
        .flatMap((value) => String(value).split(","))
        .map((scope) => scope.trim())
        .filter(Boolean);
      const scopes = [
        ...new Set([
          ...DEFAULT_OAUTH_SCOPES,
          ...configuredScopes,
          ...requestedScopes,
        ]),
      ];
      const oauth = await oauthLogin({
        clientId: process.env.CF_OAUTH_CLIENT_ID || DEFAULT_OAUTH_CLIENT_ID,
        scopes,
        scopePicker: !opts?.["no-scope-picker"],
        bindHost: process.env.CF_OAUTH_BIND_HOST || "0.0.0.0",
        redirectHost: process.env.CF_OAUTH_REDIRECT_HOST || "127.0.0.1",
      });
      const storedInKeychain = await writeCredentialImpl(name, {
        oauthAccessToken: oauth.accessToken,
        oauthRefreshToken: oauth.refreshToken,
        expiresIn: oauth.expiresIn,
        expiresAt: oauth.expiresAt,
      });
      data.profiles[name] = {
        authMethod: "oauth",
        scopes: oauth.scopes || scopes,
        ...(storedInKeychain ? {} : { apiToken: oauth.accessToken }),
        accountId: opts?.["account-id"] || process.env.CLOUDFLARE_ACCOUNT_ID,
        zoneId: opts?.["zone-id"] || process.env.CLOUDFLARE_ZONE_ID,
      };
      data.active = name;
      write(data, profileHome, profileFs);
      return printer.log(`Saved and activated profile ${name}`);
    }
    const stdinToken = opts?.["token-stdin"] ? readToken() : null;
    if (!stdinToken && !process.env.CLOUDFLARE_API_TOKEN) {
      fail("You are not logged into Cloudflare. Run: cf auth login");
      return;
    }
    const credential = {
      apiToken: stdinToken || process.env.CLOUDFLARE_API_TOKEN,
    };
    const storedInKeychain = await writeCredentialImpl(name, credential);
    data.profiles[name] = {
      accountId: opts?.["account-id"] || process.env.CLOUDFLARE_ACCOUNT_ID,
      zoneId: opts?.["zone-id"] || process.env.CLOUDFLARE_ZONE_ID,
      ...(storedInKeychain ? {} : credential),
    };
    data.active = name;
    write(data, profileHome, profileFs);
    return printer.log(`Saved and activated profile ${name}`);
  }
  if (action === "switch") {
    const name = opts?.profile;
    if (!name || !data.profiles[name]) {
      fail(`Unknown profile: ${name || "(missing --profile)"}`);
      return;
    }
    data.active = name;
    write(data, profileHome, profileFs);
    return printer.log(`Activated profile ${name}`);
  }
  if (action === "logout") {
    const name = opts?.profile || data.active;
    if (!name || !data.profiles[name]) {
      fail(`Unknown profile: ${name || "(none)"}`);
      return;
    }
    const credential = await readCredentialImpl(name);
    if (credential?.oauthAccessToken)
      await revokeOAuthImpl({ accessToken: credential.oauthAccessToken });
    delete data.profiles[name];
    await deleteCredentialImpl(name);
    if (data.active === name)
      data.active = Object.keys(data.profiles)[0] || null;
    write(data, profileHome, profileFs);
    return printer.log(`Removed profile ${name}`);
  }
  if (action === "status") {
    if (!process.env.CLOUDFLARE_API_TOKEN) {
      fail("You are not logged into Cloudflare. Run: cf auth login");
      return;
    }
    const identity = await cf.get("/user");
    const status = {
      authenticated: true,
      profile: process.env.CLOUDFLARE_PROFILE || data.active || "environment",
      method: "oauth",
      id: identity?.result?.id || null,
    };
    return outputJson
      ? toJsonOutput(status)
      : printer.log(
          `${status.profile} authenticated${status.email ? ` as ${status.email}` : ""}`,
        );
  }
  if (action === "verify") {
    if (!process.env.CLOUDFLARE_API_TOKEN) {
      fail("cf auth verify requires CLOUDFLARE_API_TOKEN");
      return;
    }
    const result = await cf.get("/user/tokens/verify");
    const verified = {
      verified: result?.result?.status === "active",
      status: result?.result?.status || "unknown",
    };
    return outputJson
      ? toJsonOutput(verified)
      : printer.log(`${verified.status}`);
  }
  fail(`Unknown auth action: ${action}`);
}
