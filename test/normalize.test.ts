// @vitest-environment node
// Node environment on purpose: the normalizer must work server-side/CLI with
// no DOM (ticket 07 criterion).
import { describe, expect, it } from "vitest";
import { codepoints } from "../src/codepoints";
import { normalizeLegacy } from "../src/normalize";

describe("unconditional lookalike replacement", () => {
  it("replaces Arabic KAF and YEH with the unified Kurdish letters", () => {
    expect(normalizeLegacy("كوردي")).toBe("کوردی");
  });

  it("is driven by the truth-table lookalike data, not a private copy", () => {
    // Every unconditional pair in the data file must actually be applied.
    for (const pair of codepoints.lookalikes.filter((p) => !p.contextual)) {
      expect(normalizeLegacy(pair.wrong.char)).toBe(pair.correct);
    }
  });
});

describe("final-position HEH → AE heuristic", () => {
  it("converts word-final heh to the vowel ە", () => {
    expect(normalizeLegacy("ئێمه")).toBe("ئێمە");
    expect(normalizeLegacy("له ماڵه")).toBe("لە ماڵە");
  });

  it("keeps heh before another Arabic-script letter (initial/medial consonant h)", () => {
    expect(normalizeLegacy("هیوا")).toBe("هیوا");
    expect(normalizeLegacy("بههار")).toBe("بههار"); // documented limit: medial vowel not caught
  });

  it("treats end-of-string, whitespace, and punctuation as word-final", () => {
    expect(normalizeLegacy("وشه.")).toBe("وشە.");
    expect(normalizeLegacy("وشه، وشه")).toBe("وشە، وشە");
  });
});

describe("documented limits and invariants (decision 005)", () => {
  it("supports exactly one contextual pair, heh→AE — extend normalize.ts if this fails", () => {
    const contextual = codepoints.lookalikes.filter((p) => p.contextual);
    expect(contextual.map((p) => p.wrong.codepoint)).toEqual(["U+0647"]);
  });

  it("every lookalike replacement is 1:1 in UTF-16 units", () => {
    for (const pair of codepoints.lookalikes) {
      expect(pair.correct.length, pair.wrong.name).toBe(pair.wrong.char.length);
    }
  });

  it("limit: genuinely-final consonant /h/ is wrongly converted (accepted, no dictionary)", () => {
    expect(normalizeLegacy("گوناه")).toBe("گوناە");
  });

  it("heh before ZWNJ converts (classic legacy vowel encoding); ZWNJ stays", () => {
    expect(normalizeLegacy("له‌بیرم")).toBe("لە‌بیرم");
  });

  it("heh before tatweel or a diacritic does not convert", () => {
    expect(normalizeLegacy("هـ")).toBe("هـ");
    expect(normalizeLegacy("لهِ")).toBe("لهِ");
  });

  it("contract: Arabic text is converted too — the input is assumed Kurdish", () => {
    // Not a bug: decision 005. Callers must not feed genuine Arabic quotations.
    expect(normalizeLegacy("عليكم")).toBe("علیکم");
  });
});

describe("passthrough", () => {
  it("leaves Latin/Kurmanji text untouched", () => {
    const text = "Silav ji Kurdistanê û ji hemû cîhanê!";
    expect(normalizeLegacy(text)).toBe(text);
  });

  it("leaves already-normalized Sorani untouched", () => {
    const text = "ئێمە کوردین و زمانی کوردی دەنووسین";
    expect(normalizeLegacy(text)).toBe(text);
  });

  it("handles the empty string", () => {
    expect(normalizeLegacy("")).toBe("");
  });

  it("mixed-script input: only the Arabic-script Kurdish parts change", () => {
    expect(normalizeLegacy("Hello كورد world")).toBe("Hello کورد world");
  });
});
