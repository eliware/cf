import { jest } from "@jest/globals";
import { handleLists } from "../../src/handlers/lists.mjs";

test('handleLists is exported', () => {
  expect(typeof handleLists).toBe('function');
});

function context(overrides = {}) {
  return {
    cf: {
      rules: {
        lists: {
          list: jest.fn(async function* () {
            yield { id: "list-1", name: "blocklist" };
          }),
          get: jest.fn().mockResolvedValue({ id: "list-1" }),
        },
      },
      post: jest.fn().mockResolvedValue({ id: "list-2" }),
      put: jest.fn().mockResolvedValue({ id: "list-2", name: "updated" }),
      delete: jest.fn().mockResolvedValue({ success: true }),
    },
    action: "list",
    opts: { "account-id": "account-1" },
    outputJson: true,
    printer: { log: jest.fn() },
    toJsonOutput: jest.fn(),
    fail: jest.fn(),
    ...overrides,
  };
}

test("lists list and get use the SDK and JSON output", async () => {
  const list = context();
  await handleLists(list);
  expect(list.toJsonOutput).toHaveBeenCalledWith([
    { id: "list-1", name: "blocklist" },
  ]);

  const get = context({ action: "get", opts: { "account-id": "account-1", id: "list-1" } });
  await handleLists(get);
  expect(get.cf.rules.lists.get).toHaveBeenCalledWith("list-1", { account_id: "account-1" });
  expect(get.toJsonOutput).toHaveBeenCalledWith({ id: "list-1" });
});

test("lists create and update support dry runs and writes", async () => {
  const createDry = context({ action: "create", opts: { "account-id": "account-1", "dry-run": true }, body: { name: "blocklist", kind: "ip" } });
  await handleLists(createDry);
  expect(createDry.cf.post).not.toHaveBeenCalled();
  expect(createDry.printer.log).toHaveBeenCalled();

  const create = context({ action: "create", body: { name: "blocklist", kind: "ip" } });
  await handleLists(create);
  expect(create.cf.post).toHaveBeenCalledWith("/accounts/account-1/rules/lists", { body: create.body });

  const createText = context({ action: "create", outputJson: false, body: { name: "text" } });
  await handleLists(createText);
  expect(createText.printer.log).toHaveBeenCalledWith(JSON.stringify({ id: "list-2" }, null, 2));

  const updateDry = context({ action: "update", opts: { "account-id": "account-1", id: "list-2", "dry-run": true }, body: { name: "updated" } });
  await handleLists(updateDry);
  expect(updateDry.cf.put).not.toHaveBeenCalled();

  const update = context({ action: "update", opts: { "account-id": "account-1", id: "list-2" }, body: { name: "updated" } });
  await handleLists(update);
  expect(update.cf.put).toHaveBeenCalledWith("/accounts/account-1/rules/lists/list-2", { body: update.body });

  const updateText = context({ action: "update", outputJson: false, opts: { "account-id": "account-1", id: "list-2" }, body: { name: "text" } });
  await handleLists(updateText);
  expect(updateText.printer.log).toHaveBeenCalledWith(JSON.stringify({ id: "list-2", name: "updated" }, null, 2));
});

test("lists delete requires force and sends the request", async () => {
  const missingForce = context({ action: "delete", opts: { "account-id": "account-1", id: "list-1" } });
  await handleLists(missingForce);
  expect(missingForce.fail).toHaveBeenCalledWith("Refusing lists delete without --force");

  const deletion = context({ action: "delete", opts: { "account-id": "account-1", id: "list-1", force: true } });
  await handleLists(deletion);
  expect(deletion.cf.delete).toHaveBeenCalledWith("/accounts/account-1/rules/lists/list-1");
  expect(deletion.toJsonOutput).toHaveBeenCalledWith({ success: true });

  const deletionText = context({ action: "delete", outputJson: false, opts: { "account-id": "account-1", id: "list-1", force: true } });
  await handleLists(deletionText);
  expect(deletionText.printer.log).toHaveBeenCalledWith(JSON.stringify({ success: true }, null, 2));
});

test("lists reports missing values and unknown actions", async () => {
  const missingAccount = context({ opts: {} });
  await handleLists(missingAccount);
  expect(missingAccount.fail).toHaveBeenCalledWith("Missing --account-id or CLOUDFLARE_ACCOUNT_ID");

  const missingId = context({ action: "get", opts: { "account-id": "account-1" } });
  await handleLists(missingId);
  expect(missingId.fail).toHaveBeenCalledWith("Missing --id");

  const missingCreateBody = context({ action: "create" });
  await handleLists(missingCreateBody);
  expect(missingCreateBody.fail).toHaveBeenCalledWith("Missing --data or --file");

  const missingUpdateId = context({ action: "update", body: {} });
  await handleLists(missingUpdateId);
  expect(missingUpdateId.fail).toHaveBeenCalledWith("Missing --id");

  const missingUpdateBody = context({ action: "update", opts: { "account-id": "account-1", id: "list-1" } });
  await handleLists(missingUpdateBody);
  expect(missingUpdateBody.fail).toHaveBeenCalledWith("Missing --data or --file");

  const missingDeleteId = context({ action: "delete", opts: { "account-id": "account-1", force: true } });
  await handleLists(missingDeleteId);
  expect(missingDeleteId.fail).toHaveBeenCalledWith("Missing --id");

  const unknown = context({ action: "unknown" });
  await handleLists(unknown);
  expect(unknown.fail).toHaveBeenCalledWith("Unknown lists action: unknown");
});
