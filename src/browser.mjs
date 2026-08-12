import { access } from "node:fs/promises";
import { posix, win32 } from "node:path";

const windowsCandidates = [
  ["PROGRAMFILES", "Google", "Chrome", "Application", "chrome.exe"],
  ["PROGRAMFILES(X86)", "Google", "Chrome", "Application", "chrome.exe"],
  ["LOCALAPPDATA", "Google", "Chrome", "Application", "chrome.exe"],
  ["PROGRAMFILES", "Microsoft", "Edge", "Application", "msedge.exe"],
  ["PROGRAMFILES(X86)", "Microsoft", "Edge", "Application", "msedge.exe"],
  ["LOCALAPPDATA", "Microsoft", "Edge", "Application", "msedge.exe"],
];

const unixCandidates = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge",
  "/usr/bin/microsoft-edge-stable",
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/* istanbul ignore next -- parameter defaults depend on the host runtime. */
export async function findBrowser({
  env = process.env,
  platform = process.platform,
  accessImpl = exists,
  puppeteerPath,
} = {}) {
  if (env.CHROME_PATH) {
    if (await accessImpl(env.CHROME_PATH)) return env.CHROME_PATH;
    throw new Error(`CHROME_PATH does not exist: ${env.CHROME_PATH}`);
  }

  const candidates = platform === "win32"
    ? windowsCandidates
      .map(([variable, ...parts]) => env[variable] && win32.join(env[variable], ...parts))
      .filter(Boolean)
    : unixCandidates;
  for (const candidate of candidates) {
    if (await accessImpl(candidate)) return candidate;
  }

  if (puppeteerPath && await accessImpl(puppeteerPath)) return puppeteerPath;
  const pathDelimiter = platform === "win32" ? ";" : ":";
  /* istanbul ignore next -- PATH is always present in supported runtimes. */
  const pathEntries = (env.PATH ?? "").split(pathDelimiter).filter(Boolean);
  const executableNames = platform === "win32"
    ? ["chrome.exe", "msedge.exe"]
    : ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"];
  for (const directory of pathEntries) {
    for (const name of executableNames) {
      const candidate = platform === "win32"
        ? win32.join(directory, name)
        : posix.join(directory, name);
      if (await accessImpl(candidate)) return candidate;
    }
  }
  throw new Error(
    "No supported Chrome, Edge, or Chromium browser was found. " +
    "Install one or set CHROME_PATH to its executable.",
  );
}
