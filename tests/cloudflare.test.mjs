import { jest } from "@jest/globals";
import { createCloudflareClient } from "../src/cloudflare.mjs";

describe("cloudflare helper", () => {
  test("createCloudflareClient supports API-token dependency injection", () => {
    const ctor = jest.fn().mockImplementation((cfg) => ({ cfg }));
    const client = createCloudflareClient({
      CloudflareClass: ctor,
      env: { CLOUDFLARE_API_TOKEN: "token" },
    });
    expect(ctor).toHaveBeenCalledWith({ apiToken: "token" });
    expect(client.cfg.apiToken).toBe("token");
  });

  test("createCloudflareClient throws without credentials", () => {
    expect(() => createCloudflareClient({ env: {} })).toThrow(
      "You are not logged into Cloudflare. Run: cf auth login",
    );
  });

  test("createCloudflareClient accepts an API token", () => {
    const ctor = jest.fn();
    createCloudflareClient({
      CloudflareClass: ctor,
      env: { CLOUDFLARE_API_TOKEN: "token" },
    });
    expect(ctor).toHaveBeenCalledWith({ apiToken: "token" });
  });
});

test("createCloudflareClient handles omitted options safely", () => {
  expect(() => createCloudflareClient()).toThrow(
    "You are not logged into Cloudflare. Run: cf auth login",
  );
});
