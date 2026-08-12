import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer";
import { loginOAuth } from "../../src/oauth.mjs";
import { findBrowser } from "../../src/browser.mjs";

const outputDir = resolve(
  process.env.CF_SCREENSHOT_DIR ?? "artifacts/oauth-screenshots",
);
const executablePath = await findBrowser({ puppeteerPath: puppeteer.executablePath() });
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
    const pickerText = await page.$eval(".faq", (faq) => faq.textContent);
    assert.match(pickerText, /Can I use my own OAuth client\?/);
    assert.match(pickerText, /Can Eliware access my Cloudflare account\?/);
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
  assert.equal(await page.title(), "Cloudflare connected · cf");
  assert.match(await page.$eval("h1", (heading) => heading.textContent), /connected/i);
  const successHtml = await page.content();
  const desktopSuccessPage = await browser.newPage();
  await desktopSuccessPage.setViewport({
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
  });
  await desktopSuccessPage.setContent(successHtml, {
    waitUntil: "domcontentloaded",
  });
  await desktopSuccessPage.screenshot({
    path: join(outputDir, "oauth-success-desktop.png"),
    fullPage: true,
  });
  await desktopSuccessPage.close();
  console.log("Captured desktop OAuth success screenshot");
  const mobileSuccessPage = await browser.newPage();
  await mobileSuccessPage.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  await mobileSuccessPage.setContent(successHtml, { waitUntil: "domcontentloaded" });
  await mobileSuccessPage.screenshot({
    path: join(outputDir, "oauth-success-mobile.png"),
    fullPage: true,
  });
  await mobileSuccessPage.close();
  console.log("Captured mobile OAuth success screenshot");

  const cancellationPrinted = [];
  const cancellationLogin = loginOAuth({
    clientId: "preview-client",
    scopePicker: true,
    ports: [8766, 8767, 8768, 8769],
    open: () => {},
    print: (value) => cancellationPrinted.push(value),
    fetchImpl,
  });
  const cancellationFailure = cancellationLogin.catch((error) => error);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const cancellationUrl = cancellationPrinted[0]?.match(/https?:\/\/\S+/)?.[0];
  assert.ok(cancellationUrl, "OAuth cancellation URL was not created");
  const cancellationStart = await fetch(new URL("/oauth/start", cancellationUrl), {
    method: "POST",
    redirect: "manual",
  });
  const cancellationAuthorization = new URL(
    cancellationStart.headers.get("location"),
  );
  const cancellationCallback = new URL(cancellationUrl);
  cancellationCallback.pathname = "/oauth/callback";
  cancellationCallback.search = new URLSearchParams({
    state: cancellationAuthorization.searchParams.get("state"),
    error: "access_denied",
    error_description: "The user has denied the consent request.",
  }).toString();
  const cancellationResponse = await page.goto(cancellationCallback, {
    waitUntil: "domcontentloaded",
  });
  assert.equal(cancellationResponse?.status(), 400);
  assert.equal(await page.title(), "Authorization cancelled · cf");
  assert.match(await page.$eval("h1", (heading) => heading.textContent), /cancelled/i);
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844, isMobile: true, hasTouch: true }],
  ]) {
    await page.setViewport({ deviceScaleFactor: 1, ...viewport });
    await page.screenshot({
      path: join(outputDir, `oauth-cancelled-${name}.png`),
      fullPage: true,
    });
    console.log(`Captured ${name} OAuth cancellation screenshot`);
  }
  const cancellationError = await cancellationFailure;
  assert.match(cancellationError.message, /authorization failed: access_denied/);

  const invalidStatePrinted = [];
  const invalidStateLogin = loginOAuth({
    clientId: "preview-client",
    scopePicker: true,
    ports: [8767, 8768, 8769],
    open: () => {},
    print: (value) => invalidStatePrinted.push(value),
    fetchImpl,
  });
  const invalidStateFailure = invalidStateLogin.catch((error) => error);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const invalidStateUrl = invalidStatePrinted[0]?.match(/https?:\/\/\S+/)?.[0];
  assert.ok(invalidStateUrl, "OAuth invalid-state URL was not created");
  const invalidStateCallback = new URL(invalidStateUrl);
  invalidStateCallback.pathname = "/oauth/callback";
  invalidStateCallback.search = "?state=invalid-preview-state&code=preview";
  const invalidStateResponse = await page.goto(invalidStateCallback, {
    waitUntil: "domcontentloaded",
  });
  assert.equal(invalidStateResponse?.status(), 400);
  assert.equal(await page.title(), "Authorization request expired · cf");
  assert.match(
    await page.$eval("h1", (heading) => heading.textContent),
    /request expired/i,
  );
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844, isMobile: true, hasTouch: true }],
  ]) {
    await page.setViewport({ deviceScaleFactor: 1, ...viewport });
    await page.screenshot({
      path: join(outputDir, `oauth-invalid-state-${name}.png`),
      fullPage: true,
    });
    console.log(`Captured ${name} OAuth invalid-state screenshot`);
  }
  const invalidStateError = await invalidStateFailure;
  assert.match(
    invalidStateError.message,
    /OAuth login expired or was opened in another browser/,
  );
} finally {
  await browser.close();
}
console.log(`OAuth E2E screenshots written to ${outputDir}`);
