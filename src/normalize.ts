import { codepoints } from "./codepoints.js";

// "Still inside the word" class for the boundary heuristic: Arabic-script
// letters and supplements — plus tatweel U+0640 (heh+tatweel is a medial
// presentation, not word-final) and the harakat/superscript-alef combining
// marks U+064B–U+065F, U+0670 (a vocalized heh is attached to its word, and
// vocalized text is likely an Arabic quotation we shouldn't touch).
const ARABIC_LETTER =
  "[\\u0620-\\u064A\\u064B-\\u065F\\u0670\\u066E-\\u06D5\\u06EE-\\u06EF\\u06FA-\\u06FF]";

// Data chars are arbitrary values, not regex source — escape the class metacharacters.
const escapeForCharClass = (ch: string): string =>
  ch.replace(/[\\\]^-]/g, "\\$&");

const unconditional = codepoints.lookalikes.filter((pair) => !pair.contextual);
// Exactly one contextual pair (heh→AE) is supported; a test pins this so a
// second contextual entry in the data file fails loudly instead of silently.
const contextualHeh = codepoints.lookalikes.find(
  (pair) => pair.contextual && pair.wrong.codepoint === "U+0647",
);
if (!contextualHeh) {
  throw new Error("codepoints.json: no contextual U+0647 HEH lookalike pair");
}

const unconditionalPattern = new RegExp(
  `[${unconditional.map((pair) => escapeForCharClass(pair.wrong.char)).join("")}]`,
  "gu",
);
const replacementByWrongChar = new Map(
  unconditional.map((pair) => [pair.wrong.char, pair.correct]),
);

// Word-final heh: not followed by another Arabic-script letter.
const finalHehPattern = new RegExp(
  `${escapeForCharClass(contextualHeh.wrong.char)}(?!${ARABIC_LETTER})`,
  "gu",
);
const finalHehReplacement = contextualHeh.correct;

/**
 * Converts legacy fragmented Sorani text to the unified KRG/UCD codepoints.
 * Driven entirely by the truth table's `lookalikes` data (single source of
 * truth): unconditional pairs (ك KAF → ک KEHEH, ي YEH → ی FARSI YEH) are
 * replaced everywhere; the contextual ه HEH → ە AE pair uses a positional
 * heuristic.
 *
 * **Contract: the input is assumed to be Kurdish text.** Genuine Arabic
 * quotations will also have their ك/ي converted — run this only over content
 * meant to be Kurdish. Latin-script text passes through untouched.
 *
 * **Heuristic and its known limits** : word-final ه becomes the
 * vowel ە (in Sorani, final heh is almost always the vowel). Limits:
 * - A medial vowel ە typed as ه (e.g. legacy بههار for بەهار) is NOT caught —
 *   only word-final positions convert.
 * - The rare genuinely-final consonant /h/ (e.g. گوناه) WILL be converted; no
 *   dictionary check is attempted.
 * - ه followed by ZWNJ counts as word-final and converts (the classic legacy
 *   vowel encoding); the ZWNJ itself is left in place.
 * - ه followed by tatweel or a harakat/diacritic does NOT convert (treated as
 *   word-internal / likely vocalized Arabic).
 *
 * DOM-free by design: usable in Node/CLI without the widget.
 */
export function normalizeLegacy(text: string): string {
  // Non-null: the pattern's class is built from exactly the map's keys.
  return text
    .replace(unconditionalPattern, (wrong) =>
      replacementByWrongChar.get(wrong)!,
    )
    .replace(finalHehPattern, finalHehReplacement);
}
