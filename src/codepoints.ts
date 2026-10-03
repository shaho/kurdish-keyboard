import data from "./data/codepoints.json";

export type Script = "kurmanji" | "sorani";

export interface LetterEntry {
  /** The character itself, exactly one codepoint. */
  char: string;
  /** `U+XXXX` notation, always matching `char`. */
  codepoint: string;
  /** The character's name in the Unicode Character Database. */
  name: string;
  script: Script;
}

export interface DigitEntry {
  char: string;
  codepoint: string;
  name: string;
  value: number;
}

export interface PunctuationEntry {
  char: string;
  codepoint: string;
  name: string;
}

/**
 * A character the keyboard may emit that is not part of the Kurdish alphabet:
 * plain-Arabic letters the KRG layout keeps reachable so users can type Arabic
 * names without switching keyboards, plus script utilities (tatweel, ZWNJ).
 * Note ك KAF and ي YEH appear here AND in `lookalikes`: valid when typing
 * Arabic, wrong inside Kurdish text.
 */
export interface CompatEntry {
  char: string;
  codepoint: string;
  name: string;
  note?: string;
}

export interface LookalikePair {
  /** The codepoint legacy text uses but this keyboard never emits. */
  wrong: { char: string; codepoint: string; name: string };
  /** The unified character to use instead (present in `letters`). */
  correct: string;
  /** True when the mapping only applies in certain positions, not unconditionally. */
  contextual: boolean;
  note: string;
}

export interface CodepointTable {
  version: string;
  sources: { krg: string; ucd: string; research: string };
  letters: LetterEntry[];
  digits: DigitEntry[];
  punctuation: PunctuationEntry[];
  compat: CompatEntry[];
  lookalikes: LookalikePair[];
}

/**
 * The KRG/UCD-verified Kurdish codepoint inventory — the only characters this
 * keyboard may emit, Sourced from the KRG
 * "Kurdish Unified Keyboard" v1.02 and cross-checked against the Unicode
 * Character Database.
 */
export const codepoints: CodepointTable = data as CodepointTable;
