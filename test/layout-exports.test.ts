import { describe, expect, it } from "vitest";
import * as kurmanjiOfficialModule from "../src/layouts/kurmanji-official";
import * as kurmanjiPhoneticModule from "../src/layouts/kurmanji-phonetic";
import * as soraniModule from "../src/layouts/sorani";
import * as root from "../src/index";

// Each layout has exactly one public name (no default export since 0.4.0),
// identical on its subpath entry and the root entry.
describe("layout module exports", () => {
  it.each([
    ["sorani", soraniModule, "soraniLayout"],
    ["kurmanji-phonetic", kurmanjiPhoneticModule, "kurmanjiPhonetic"],
    ["kurmanji-official", kurmanjiOfficialModule, "kurmanjiOfficial"],
  ] as const)("%s exports only its named layout", (_, module, exportName) => {
    expect(Object.keys(module)).toEqual([exportName]);
    expect(root[exportName]).toBe(
      (module as Record<string, unknown>)[exportName],
    );
  });
});
