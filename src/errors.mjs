export function cloudflareStatus(error) {
  return error?.status || error?.statusCode || error?.response?.status;
}

function cloudflareDetails(error) {
  const body = error?.response?.data || error?.body || error?.data;
  return Array.isArray(body?.errors)
    ? body.errors
    : Array.isArray(error?.errors)
      ? error.errors
      : [];
}

export function formatCloudflareError(
  error,
  { resource, action, outputJson = false } = {},
) {
  const status = cloudflareStatus(error);
  const details = cloudflareDetails(error);
  if (status !== 401 && status !== 403) return null;
  const reason =
    details
      .map(
        (item) =>
          `${item.code ?? "?"}: ${item.message || "authorization denied"}`,
      )
      .join("; ") ||
    error?.message ||
    "Cloudflare rejected the request";
  const message = `Cloudflare denied ${resource} ${action}: ${reason}`;
  if (outputJson)
    return JSON.stringify(
      { error: message, status, resource, action, cloudflareErrors: details },
      null,
      2,
    );
  return `${message}\n\nYour active login may not have the required permission. Run cf auth login again and select the required scopes, then retry.`;
}
