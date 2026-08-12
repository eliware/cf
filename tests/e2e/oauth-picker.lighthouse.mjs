import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { launch } from "chrome-launcher";
import lighthouse, { generateReport } from "lighthouse";
import { loginOAuth } from "../../src/oauth.mjs";
import { findBrowser } from "../../src/browser.mjs";

const outputDir = resolve(
  process.env.CF_LIGHTHOUSE_DIR ?? "artifacts/oauth-lighthouse",
);
const executablePath = await findBrowser();
const printed = [];
const fetchImpl = async () => ({
  ok: true,
  json: async () => ({ access_token: "preview-access" }),
});
const login = loginOAuth({
  clientId: "preview-client",
  scopePicker: true,
  ports: [8765, 8766, 8767, 8768, 8769],
  open: () => {},
  print: (value) => printed.push(value),
  fetchImpl,
});
await new Promise((resolve) => setTimeout(resolve, 100));
const url = printed[0]?.match(/https?:\/\/\S+/)?.[0];
assert.ok(url, "OAuth preview URL was not created");
const chrome = await launch({
  chromePath: executablePath,
  chromeFlags: [
    "--headless",
    ...(process.getuid?.() === 0 ? ["--no-sandbox"] : []),
  ],
});
try {
  const result = await lighthouse(url, {
    port: chrome.port,
    logLevel: "error",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    formFactor: "desktop",
    screenEmulation: {
      mobile: false,
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
    },
  });
  assert.ok(result?.lhr, "Lighthouse did not return a result");
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    join(outputDir, "report.html"),
    generateReport(result.lhr, "html"),
  );
  await writeFile(
    join(outputDir, "report.json"),
    `${JSON.stringify(result.lhr, null, 2)}\n`,
  );
  console.log(`OAuth Lighthouse reports written to ${outputDir}`);
  console.log(
    `Scores: ${JSON.stringify(Object.fromEntries(Object.entries(result.lhr.categories).map(([key, category]) => [key, category.score == null ? null : Math.round(category.score * 100)])))}`,
  );
} finally {
  chrome.kill();
  const start = await fetch(new URL("/oauth/start", url), {
    method: "POST",
    redirect: "manual",
  });
  const authorization = new URL(start.headers.get("location"));
  const callback = new URL(url);
  callback.pathname = "/oauth/callback";
  callback.search = `?state=${authorization.searchParams.get("state")}&code=preview`;
  await fetch(callback).catch(() => {});
  await login.catch(() => {});
}
