import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { codepoints, soraniLayout } from "../src/index";
import type { LayoutKey } from "../src/index";
import { layoutSchemaErrors } from "./helpers";

const allKeys = (): LayoutKey[] => soraniLayout.rows.flatMap((row) => row.keys);
const outputsOf = (key: LayoutKey): string[] => [
  key.base,
  ...(key.shift ? [key.shift] : []),
];

describe("Sorani layout: provenance and structure", () => {
  it("is RTL Sorani named after the CLDR source", () => {
    expect(soraniLayout.script).toBe("sorani");
    expect(soraniLayout.dir).toBe("rtl");
    expect(soraniLayout.source).toContain("release-43");
  });

  it("matches a fresh regeneration from the vendored CLDR XML (reproducible, no drift)", () => {
    const regenerated = execFileSync(
      "node",
      ["scripts/generate-sorani-layout.mjs", "--stdout"],
      {
        encoding: "utf8",
      },
    );
    const committed = readFileSync("src/data/layouts/sorani.json", "utf8");
    expect(committed).toBe(regenerated);
  });

  it("validates against the layout JSON schema", () => {
    expect(
      layoutSchemaErrors(
        JSON.parse(readFileSync("src/data/layouts/sorani.json", "utf8")),
      ),
    ).toEqual([]);
  });
});

describe("Sorani layout: content", () => {
  it("Shift+W emits the two-codepoint string وو", () => {
    const w = allKeys().find((k) => k.base === "و");
    expect(w?.shift).toBe("وو");
  });

  it("the base layer carries the KRG fragmentation choices", () => {
    const bases = new Set(allKeys().map((k) => k.base));
    expect(bases.has("ک")).toBe(true); // KEHEH U+06A9
    expect(bases.has("ی")).toBe(true); // FARSI YEH U+06CC
    expect(bases.has("ە")).toBe(true); // AE U+06D5
    expect(bases.has("ه")).toBe(true); // HEH U+0647 (consonant)
  });

  it("keeps plain-Arabic letters reachable without switching layouts", () => {
    const outputs = new Set(allKeys().flatMap(outputsOf));
    for (const arabic of ["ص", "ط", "ي", "ك"]) {
      expect(outputs.has(arabic), `missing ${arabic}`).toBe(true);
    }
  });

  it("every output is composed solely of codepoints sanctioned by the truth table", () => {
    const allowed = new Set<number>([
      ...codepoints.letters.map((l) => l.char.codePointAt(0)!),
      ...codepoints.digits.map((d) => d.char.codePointAt(0)!),
      ...codepoints.punctuation.map((p) => p.char.codePointAt(0)!),
      ...codepoints.compat.map((c) => c.char.codePointAt(0)!),
    ]);
    // Exactly the ASCII punctuation the CLDR layout carries — enumerated, not a
    // blanket range, so an unsanctioned ASCII letter or digit would still fail.
    for (const ch of " !\"#$&'()*+-./:<=>@[\\]^_`{|}~")
      allowed.add(ch.codePointAt(0)!);

    for (const key of allKeys()) {
      for (const output of outputsOf(key)) {
        for (const ch of output) {
          expect(
            allowed.has(ch.codePointAt(0)!),
            `U+${ch.codePointAt(0)!.toString(16).toUpperCase()} in output "${output}"`,
          ).toBe(true);
        }
      }
    }
  });
});
