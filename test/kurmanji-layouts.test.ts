import { describe, expect, it } from "vitest";
import { codepoints, kurmanjiOfficial, kurmanjiPhonetic } from "../src/index";
import type { Layout, LayoutKey } from "../src/index";
import { layoutSchemaErrors } from "./helpers";

const CASING_PAIRS: ReadonlyArray<[string, string]> = [
  ["ç", "Ç"],
  ["ê", "Ê"],
  ["î", "Î"],
  ["ş", "Ş"],
  ["û", "Û"],
];

const variants: ReadonlyArray<[string, Layout]> = [
  ["kurmanji-phonetic", kurmanjiPhonetic],
  ["kurmanji-official", kurmanjiOfficial],
];

const allKeys = (layout: Layout): LayoutKey[] =>
  layout.rows.flatMap((row) => row.keys);
const outputsOf = (key: LayoutKey): string[] => [
  key.base,
  ...(key.shift ? [key.shift] : []),
];

describe.each(variants)("%s", (name, layout) => {
  it("is an LTR Kurmanji layout with the expected name", () => {
    expect(layout.name).toBe(name);
    expect(layout.script).toBe("kurmanji");
    expect(layout.dir).toBe("ltr");
  });

  it("validates against the layout JSON schema", () => {
    expect(layoutSchemaErrors(layout)).toEqual([]);
  });

  it("carries every Kurmanji casing pair on a single key (base → shift)", () => {
    const keys = allKeys(layout);
    for (const [lower, upper] of CASING_PAIRS) {
      const key = keys.find((k) => k.base === lower);
      expect(key, `missing key for ${lower}`).toBeDefined();
      expect(key!.shift, `${lower} must shift to ${upper}`).toBe(upper);
    }
  });

  it("covers the full basic Latin alphabet with uppercase shifts", () => {
    const keys = allKeys(layout);
    for (const lower of "abcdefghijklmnopqrstuvwxyz") {
      const key = keys.find((k) => k.base === lower);
      expect(key, `missing ${lower}`).toBeDefined();
      expect(key!.shift).toBe(lower.toUpperCase());
    }
  });

  it("every output is truth-table Kurmanji or printable ASCII", () => {
    const kurmanjiCps = new Set(
      codepoints.letters
        .filter((l) => l.script === "kurmanji")
        .map((l) => l.char.codePointAt(0)),
    );
    for (const key of allKeys(layout)) {
      for (const output of outputsOf(key)) {
        for (const ch of output) {
          const cp = ch.codePointAt(0)!;
          const ok = kurmanjiCps.has(cp) || (cp >= 0x20 && cp <= 0x7e);
          expect(
            ok,
            `U+${cp.toString(16).toUpperCase()} ("${ch}") in "${output}"`,
          ).toBe(true);
        }
      }
    }
  });

  it("has a space key", () => {
    expect(allKeys(layout).some((k) => k.base === " ")).toBe(true);
  });
});

describe("variant difference", () => {
  it("phonetic keeps the Kurdish letters on a dedicated row; official embeds them in the main rows", () => {
    const phoneticRowOfCedilla = kurmanjiPhonetic.rows.findIndex((r) =>
      r.keys.some((k) => k.base === "ç"),
    );
    const phoneticRowOfQ = kurmanjiPhonetic.rows.findIndex((r) =>
      r.keys.some((k) => k.base === "q"),
    );
    expect(phoneticRowOfCedilla).not.toBe(phoneticRowOfQ);

    const officialDRow = kurmanjiOfficial.rows.find((r) =>
      r.keys.some((k) => k.base === "q"),
    )!;
    expect(
      officialDRow.keys.some((k) => k.base === "ê" || k.base === "û"),
    ).toBe(true);
  });
});
