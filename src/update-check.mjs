import { fs } from "@eliware/common";
import { configRoot } from "./config.mjs";

const PACKAGE_URL = "https://registry.npmjs.org/@eliware%2fcf/latest";
const DAY_MS = 24 * 60 * 60 * 1000;

function cachePath(homeDir) {
  return `${configRoot(homeDir)}/update-check.json`;
}

function newerVersion(latest, current) {
  const parse = (value) => String(value).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(latest);
  const b = parse(current);
  for (const index of [0, 1, 2]) {
    if (a[index] !== b[index]) return a[index] > b[index];
  }
  return false;
}

/* istanbul ignore next -- network/cache behavior is covered through public outcomes. */
export async function checkForUpdate({
  currentVersion,
  homeDir,
  env = process.env,
  fsImpl = fs,
  fetchImpl = globalThis.fetch,
  now = Date.now(),
  interval = DAY_MS,
} = {}) {
  if (!currentVersion || env.CF_NO_UPDATE_CHECK === "1") return null;
  const path = cachePath(homeDir);
  let cache = {};
  try {
    if (fsImpl.existsSync(path)) cache = JSON.parse(fsImpl.readFileSync(path, "utf8"));
  } catch {
    cache = {};
  }
  if (now - Number(cache.checkedAt || 0) < interval) {
    return newerVersion(cache.latestVersion, currentVersion) ? cache.latestVersion : null;
  }
  if (typeof fetchImpl !== "function") return null;
  try {
    /* istanbul ignore next -- supported Node versions provide AbortSignal.timeout. */
    const signal = typeof globalThis.AbortSignal?.timeout === "function"
      ? globalThis.AbortSignal.timeout(2000)
      : undefined;
    const response = await fetchImpl(PACKAGE_URL, signal ? { signal } : {});
    if (!response.ok) return null;
    const latestVersion = (await response.json()).version;
    fsImpl.mkdirSync(configRoot(homeDir), { recursive: true });
    fsImpl.writeFileSync(path, `${JSON.stringify({ checkedAt: now, latestVersion })}\n`, { mode: 0o600 });
    if (typeof fsImpl.chmodSync === "function") fsImpl.chmodSync(path, 0o600);
    return newerVersion(latestVersion, currentVersion) ? latestVersion : null;
  } catch {
    /* istanbul ignore next -- network and cache failures are intentionally silent. */
    return null;
  }
}

export function updateNotice(latestVersion, currentVersion) {
  return latestVersion
    ? `A newer cf version is available: ${latestVersion} (installed: ${currentVersion})\nRun: npm install --global @eliware/cf@latest`
    : null;
}
