import { commandNamesFor, suggestCommand } from "../src/suggestions.mjs";

test("suggests close commands and rejects distant commands", () => {
  expect(suggestCommand("zones", "lis")).toBe("list");
  expect(suggestCommand("resource", "zone")).toBe("zones");
  expect(suggestCommand("zones", "completely-wrong")).toBeNull();
  expect(suggestCommand("unknown", "list")).toBeNull();
  expect(commandNamesFor("lists")).toContain("create");
  expect(commandNamesFor("unknown")).toEqual([]);
});
