import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer";
import { loginOAuth } from "../../src/oauth.mjs";

const outputDir = resolve(
  process.env.CF_SCREENSHOT_DIR ?? "artifacts/oauth-screenshots",
);
const executablePath = process.env.CHROME_PATH ?? "/usr/bin/chromium-browser";
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
const previewUrl = printed[0]?.match(/https?:\/\/\S+/)?.[0];
assert.ok(previewUrl, "OAuth preview URL was not created");
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: process.getuid?.() === 0 ? ["--no-sandbox"] : [],
});
try {
  await mkdir(outputDir, { recursive: true });
  const page = await browser.newPage();
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844, isMobile: true, hasTouch: true }],
  ]) {
    await page.setViewport({ deviceScaleFactor: 1, ...viewport });
    const response = await page.goto(previewUrl, { waitUntil: "networkidle0" });
    assert.equal(response?.status(), 200);
    await page.screenshot({
      path: join(outputDir, `oauth-picker-${name}.png`),
      fullPage: true,
    });
    assert.equal(
      await page.$eval("#scope-search", (input) =>
        input.getAttribute("aria-label"),
      ),
      "Search permission scopes",
    );
    console.log(`Captured ${name} OAuth picker screenshot`);
  }
  const start = await fetch(new URL("/oauth/start", previewUrl), {
    method: "POST",
    redirect: "manual",
  });
  const authorization = new URL(start.headers.get("location"));
  const callback = new URL(previewUrl);
  callback.pathname = "/oauth/callback";
  callback.search = `?state=${authorization.searchParams.get("state")}&code=preview`;
  await page.goto(callback, { waitUntil: "domcontentloaded" }).catch(() => {});
  await login;
} finally {
  await browser.close();
}
console.log(`OAuth E2E screenshots written to ${outputDir}`);
