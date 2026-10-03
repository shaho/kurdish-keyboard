import { describe, expect, it } from "vitest";
import { codepoints } from "../src/index";

const KURMANJI_PAIRS: ReadonlyArray<[string, string, string]> = [
  // [lower, upper, UCD name of the lowercase form]
  ["ç", "Ç", "LATIN SMALL LETTER C WITH CEDILLA"],
  ["ê", "Ê", "LATIN SMALL LETTER E WITH CIRCUMFLEX"],
  ["î", "Î", "LATIN SMALL LETTER I WITH CIRCUMFLEX"],
  ["ş", "Ş", "LATIN SMALL LETTER S WITH CEDILLA"],
  ["û", "Û", "LATIN SMALL LETTER U WITH CIRCUMFLEX"],
];

const byChar = (char: string) =>
  codepoints.letters.find((l) => l.char === char);
const byName = (name: string) =>
  codepoints.letters.find((l) => l.name === name);

// Frozen transcription of the complete verified inventory:
// every codepoint and UCD name the table must carry, exactly. Any edit to the
// data file that changes a character or a name must consciously update this.
const EXPECTED_INVENTORY: ReadonlyArray<[number, string]> = [
  [0x00e7, "LATIN SMALL LETTER C WITH CEDILLA"],
  [0x00c7, "LATIN CAPITAL LETTER C WITH CEDILLA"],
  [0x00ea, "LATIN SMALL LETTER E WITH CIRCUMFLEX"],
  [0x00ca, "LATIN CAPITAL LETTER E WITH CIRCUMFLEX"],
  [0x00ee, "LATIN SMALL LETTER I WITH CIRCUMFLEX"],
  [0x00ce, "LATIN CAPITAL LETTER I WITH CIRCUMFLEX"],
  [0x015f, "LATIN SMALL LETTER S WITH CEDILLA"],
  [0x015e, "LATIN CAPITAL LETTER S WITH CEDILLA"],
  [0x00fb, "LATIN SMALL LETTER U WITH CIRCUMFLEX"],
  [0x00db, "LATIN CAPITAL LETTER U WITH CIRCUMFLEX"],
  [0x0626, "ARABIC LETTER YEH WITH HAMZA ABOVE"],
  [0x0627, "ARABIC LETTER ALEF"],
  [0x0628, "ARABIC LETTER BEH"],
  [0x067e, "ARABIC LETTER PEH"],
  [0x062a, "ARABIC LETTER TEH"],
  [0x062c, "ARABIC LETTER JEEM"],
  [0x0686, "ARABIC LETTER TCHEH"],
  [0x062d, "ARABIC LETTER HAH"],
  [0x062e, "ARABIC LETTER KHAH"],
  [0x062f, "ARABIC LETTER DAL"],
  [0x0631, "ARABIC LETTER REH"],
  [0x0695, "ARABIC LETTER REH WITH SMALL V BELOW"],
  [0x0632, "ARABIC LETTER ZAIN"],
  [0x0698, "ARABIC LETTER JEH"],
  [0x0633, "ARABIC LETTER SEEN"],
  [0x0634, "ARABIC LETTER SHEEN"],
  [0x0639, "ARABIC LETTER AIN"],
  [0x063a, "ARABIC LETTER GHAIN"],
  [0x0641, "ARABIC LETTER FEH"],
  [0x06a4, "ARABIC LETTER VEH"],
  [0x0642, "ARABIC LETTER QAF"],
  [0x06a9, "ARABIC LETTER KEHEH"],
  [0x06af, "ARABIC LETTER GAF"],
  [0x0644, "ARABIC LETTER LAM"],
  [0x06b5, "ARABIC LETTER LAM WITH SMALL V"],
  [0x0645, "ARABIC LETTER MEEM"],
  [0x0646, "ARABIC LETTER NOON"],
  [0x0648, "ARABIC LETTER WAW"],
  [0x06c6, "ARABIC LETTER OE"],
  [0x0647, "ARABIC LETTER HEH"],
  [0x06d5, "ARABIC LETTER AE"],
  [0x06cc, "ARABIC LETTER FARSI YEH"],
  [0x06ce, "ARABIC LETTER YEH WITH SMALL V"],
  [0x0660, "ARABIC-INDIC DIGIT ZERO"],
  [0x0661, "ARABIC-INDIC DIGIT ONE"],
  [0x0662, "ARABIC-INDIC DIGIT TWO"],
  [0x0663, "ARABIC-INDIC DIGIT THREE"],
  [0x0664, "ARABIC-INDIC DIGIT FOUR"],
  [0x0665, "ARABIC-INDIC DIGIT FIVE"],
  [0x0666, "ARABIC-INDIC DIGIT SIX"],
  [0x0667, "ARABIC-INDIC DIGIT SEVEN"],
  [0x0668, "ARABIC-INDIC DIGIT EIGHT"],
  [0x0669, "ARABIC-INDIC DIGIT NINE"],
  [0x060c, "ARABIC COMMA"],
  [0x061f, "ARABIC QUESTION MARK"],
];

describe("codepoint table: no drift from the verified inventory", () => {
  it("carries exactly the expected codepoints with exactly the expected UCD names", () => {
    const all = [
      ...codepoints.letters,
      ...codepoints.digits,
      ...codepoints.punctuation,
    ];
    const actual = new Map(all.map((e) => [e.char.codePointAt(0)!, e.name]));
    const expected = new Map(EXPECTED_INVENTORY);
    expect(actual).toEqual(expected);
    expect(all.length).toBe(EXPECTED_INVENTORY.length); // no duplicate chars hiding in the Map
  });
});

// The KRG document's Table 1 lists exactly these 33 codepoints for the Kurdish
// (Sorani) alphabet
const KRG_ALPHABET_CODEPOINTS = [
  0x0626, 0x0627, 0x0628, 0x067e, 0x062a, 0x062c, 0x0686, 0x062d, 0x062e,
  0x062f, 0x0631, 0x0695, 0x0632, 0x0698, 0x0633, 0x0634, 0x0639, 0x063a,
  0x0641, 0x06a4, 0x0642, 0x06af, 0x0644, 0x06b5, 0x0645, 0x0646, 0x0648,
  0x06c6, 0x06ce, 0x06a9, 0x06cc, 0x06d5, 0x0647,
] as const;

describe("codepoint table: Sorani letters, digits, punctuation", () => {
  it("contains exactly the 33 KRG alphabet codepoints as Sorani letters", () => {
    const sorani = codepoints.letters.filter((l) => l.script === "sorani");
    const actual = new Set(sorani.map((l) => l.char.codePointAt(0)));
    expect(sorani.length).toBe(33);
    expect(actual).toEqual(new Set(KRG_ALPHABET_CODEPOINTS));
  });

  it("settles the fragmentation questions with the KRG choices", () => {
    expect(byName("ARABIC LETTER KEHEH")!.codepoint).toBe("U+06A9");
    expect(byName("ARABIC LETTER FARSI YEH")!.codepoint).toBe("U+06CC");
    expect(byName("ARABIC LETTER AE")!.codepoint).toBe("U+06D5");
    // heh stays available as the distinct consonant, never merged into AE
    expect(byName("ARABIC LETTER HEH")!.codepoint).toBe("U+0647");
  });

  it("carries the Arabic-Indic digits U+0660–U+0669 in order", () => {
    expect(codepoints.digits.map((d) => d.value)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    codepoints.digits.forEach((d, i) => {
      expect(d.char.codePointAt(0)).toBe(0x0660 + i);
    });
  });

  it("carries the KRG punctuation: Arabic comma and question mark", () => {
    const cps = codepoints.punctuation.map((p) => p.char.codePointAt(0));
    expect(cps).toEqual([0x060c, 0x061f]);
  });
});

describe("codepoint table: Arabic-compat characters", () => {
  it("compat entries are self-consistent and include the Arabic-interop letters", () => {
    for (const entry of codepoints.compat) {
      const actual = `U+${entry.char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
      expect(entry.codepoint, entry.name).toBe(actual);
    }
    const names = codepoints.compat.map((c) => c.name);
    expect(names).toContain("ARABIC LETTER KAF"); // typeable for Arabic, forbidden for Kurdish
    expect(names).toContain("ARABIC LETTER YEH");
    expect(names).toContain("ZERO WIDTH NON-JOINER");
  });

  it("compat never overlaps the Kurdish letters", () => {
    const letterCps = new Set(
      codepoints.letters.map((l) => l.char.codePointAt(0)),
    );
    for (const entry of codepoints.compat) {
      expect(letterCps.has(entry.char.codePointAt(0)!), entry.name).toBe(false);
    }
  });
});

describe("codepoint table: forbidden lookalikes", () => {
  it("maps each forbidden codepoint to its unified replacement", () => {
    const byWrong = (cp: number) =>
      codepoints.lookalikes.find((p) => p.wrong.char.codePointAt(0) === cp);
    expect(byWrong(0x0643)!.correct).toBe("ک"); // KAF → KEHEH
    expect(byWrong(0x064a)!.correct).toBe("ی"); // YEH → FARSI YEH
    expect(byWrong(0x0647)!.correct).toBe("ە"); // HEH → AE (contextual)
    expect(byWrong(0x0647)!.contextual).toBe(true);
    expect(byWrong(0x0643)!.contextual).toBe(false);
    expect(byWrong(0x064a)!.contextual).toBe(false);
  });

  it("every replacement target is itself a letter in the table", () => {
    const letterChars = new Set(codepoints.letters.map((l) => l.char));
    for (const pair of codepoints.lookalikes) {
      expect(
        letterChars.has(pair.correct),
        `${pair.wrong.name} → ${pair.correct}`,
      ).toBe(true);
    }
  });

  it("unconditionally forbidden codepoints never appear among the letters", () => {
    const letterCps = new Set(
      codepoints.letters.map((l) => l.char.codePointAt(0)),
    );
    for (const pair of codepoints.lookalikes.filter((p) => !p.contextual)) {
      expect(
        letterCps.has(pair.wrong.char.codePointAt(0)!),
        pair.wrong.name,
      ).toBe(false);
    }
  });
});

describe("codepoint table: shape and Kurmanji letters", () => {
  it("carries a version and its sources", () => {
    expect(codepoints.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(codepoints.sources.krg).toContain("1.02");
  });

  it("contains all five Kurmanji casing pairs with correct codepoints", () => {
    for (const [lower, upper] of KURMANJI_PAIRS) {
      const lowerEntry = byChar(lower);
      const upperEntry = byChar(upper);
      expect(lowerEntry, `missing ${lower}`).toBeDefined();
      expect(upperEntry, `missing ${upper}`).toBeDefined();
      expect(lowerEntry!.script).toBe("kurmanji");
      expect(upperEntry!.script).toBe("kurmanji");
    }
  });

  it("names the Kurmanji lowercase letters per the UCD", () => {
    for (const [lower, , name] of KURMANJI_PAIRS) {
      expect(byChar(lower)!.name).toBe(name);
    }
  });

  it("every entry is self-consistent: codepoint field matches the actual character", () => {
    for (const entry of codepoints.letters) {
      const actual = `U+${entry.char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
      expect(entry.codepoint, `${entry.name}`).toBe(actual);
      expect(entry.char.length).toBe(1);
    }
  });
});
