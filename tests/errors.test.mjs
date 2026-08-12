import { formatCloudflareError } from "../src/errors.mjs";

test("formats Cloudflare authorization rejection with relogin guidance", () => {
  const message = formatCloudflareError(
    {
      status: 403,
      response: {
        data: {
          errors: [
            {
              code: 9109,
              message: "Unauthorized to access requested resource",
            },
          ],
        },
      },
    },
    { resource: "dns-records", action: "create" },
  );
  expect(message).toContain("Cloudflare denied dns-records create");
  expect(message).toContain("9109");
  expect(message).toContain("cf auth login");
});

test("keeps authorization errors machine-readable in JSON mode", () => {
  const message = formatCloudflareError(
    {
      statusCode: 401,
      errors: [{ code: 10000, message: "Authentication error" }],
    },
    { resource: "zones", action: "list", outputJson: true },
  );
  expect(JSON.parse(message)).toMatchObject({
    status: 401,
    resource: "zones",
    action: "list",
  });
});

test("does not rewrite non-authorization failures", () => {
  expect(
    formatCloudflareError(
      { status: 500, message: "server error" },
      { resource: "zones", action: "list" },
    ),
  ).toBeNull();
});
