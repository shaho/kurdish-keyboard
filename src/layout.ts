import type { Script } from "./codepoints.js";

/**
 * One key of a layout. `base`/`shift` are the strings the key emits — strings,
 * not single characters: CLDR's Sorani Shift+W emits the two-codepoint وو
 */
export interface LayoutKey {
  /** ISO/IEC 9995 position code (row letter + column). */
  iso: string;
  base: string;
  shift?: string;
}

export interface LayoutRow {
  keys: LayoutKey[];
}

/** A keyboard layout as data. JSON files validate against schema/layout.schema.json. */
export interface Layout {
  name: string;
  displayName: string;
  script: Script;
  dir: "ltr" | "rtl";
  source?: string;
  rows: LayoutRow[];
}
