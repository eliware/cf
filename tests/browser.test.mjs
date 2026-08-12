import { findBrowser } from "../src/browser.mjs";

const found = (wanted) => async (path) => path === wanted;

test("browser discovery honors an explicit executable", async () => {
  await expect(findBrowser({
    env: { CHROME_PATH: "C:\\Chrome\\chrome.exe" },
    accessImpl: found("C:\\Chrome\\chrome.exe"),
  })).resolves.toBe("C:\\Chrome\\chrome.exe");
});

test("browser discovery reports an invalid explicit executable", async () => {
  await expect(findBrowser({
    env: { CHROME_PATH: "missing-browser" },
    accessImpl: async () => false,
  })).rejects.toThrow("CHROME_PATH does not exist");
});

test("browser discovery finds Windows Chrome or Edge locations", async () => {
  const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  await expect(findBrowser({
    platform: "win32",
    env: { PROGRAMFILES: "C:\\Program Files", PATH: "" },
    accessImpl: found(chrome),
  })).resolves.toBe(chrome);
});

test("browser discovery uses Puppeteer's browser when installed", async () => {
  await expect(findBrowser({
    platform: "linux",
    env: { PATH: "" },
    puppeteerPath: "/tmp/puppeteer/chrome",
    accessImpl: found("/tmp/puppeteer/chrome"),
  })).resolves.toBe("/tmp/puppeteer/chrome");
});

test("browser discovery searches PATH and gives an actionable error", async () => {
  await expect(findBrowser({
    platform: "linux",
    env: { PATH: "/usr/local/bin" },
    accessImpl: found("/usr/local/bin/chromium"),
  })).resolves.toBe("/usr/local/bin/chromium");
  await expect(findBrowser({ platform: "linux", env: { PATH: "" }, accessImpl: async () => false }))
    .rejects.toThrow("Install one or set CHROME_PATH");
});

test("browser discovery checks macOS application locations", async () => {
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  await expect(findBrowser({
    platform: "darwin",
    env: { PATH: "" },
    accessImpl: found(chrome),
  })).resolves.toBe(chrome);
});

test("browser discovery covers the default filesystem access failure", async () => {
  await expect(findBrowser({
    env: { CHROME_PATH: "/definitely/missing/browser" },
  })).rejects.toThrow("CHROME_PATH does not exist");
  await expect(findBrowser({ env: { CHROME_PATH: process.execPath } })).resolves.toBe(
    process.execPath,
  );
});

test("browser discovery checks Windows PATH fallbacks", async () => {
  const edge = "C:\\Tools\\msedge.exe";
  await expect(findBrowser({
    platform: "win32",
    env: { PATH: "C:\\Tools" },
    accessImpl: found(edge),
  })).resolves.toBe(edge);
});

test("browser discovery handles missing defaults and unavailable Puppeteer", async () => {
  await expect(findBrowser({
    env: undefined,
    platform: "linux",
    accessImpl: async () => false,
    puppeteerPath: "/missing/puppeteer-browser",
  })).rejects.toThrow("No supported Chrome");
  await expect(findBrowser({ accessImpl: async () => false })).rejects.toThrow(
    "No supported Chrome",
  );
});
