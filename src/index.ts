export { KurdishKeyboard } from "./keyboard.js";
export type {
  AttachOptions,
  EditableElement,
  LabelLanguage,
  PanelPosition,
} from "./keyboard.js";
export { valueAdapter, contentEditableAdapter } from "./insertion.js";
export type { InsertionAdapter, ValueElement } from "./insertion.js";
export { codepoints } from "./codepoints.js";
export type {
  CodepointTable,
  CompatEntry,
  DigitEntry,
  LetterEntry,
  LookalikePair,
  PunctuationEntry,
  Script,
} from "./codepoints.js";
export type { Layout, LayoutKey, LayoutRow } from "./layout.js";
export { soraniLayout } from "./layouts/sorani.js";
export { kurmanjiPhonetic } from "./layouts/kurmanji-phonetic.js";
export { kurmanjiOfficial } from "./layouts/kurmanji-official.js";
export { normalizeLegacy } from "./normalize.js";
