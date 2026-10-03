// Entry for the prebuilt <script>-tag bundle (dist/kurdish-keyboard.iife.js).
// Unlike the module entries, it bundles ALL layouts and resolves them by
// string name — copy-paste convenience for plain HTML sites (D0).
import { KurdishKeyboard } from "./keyboard.js";
import type { AttachOptions, EditableElement } from "./keyboard.js";
import type { Layout } from "./layout.js";
import { kurmanjiOfficial } from "./layouts/kurmanji-official.js";
import { kurmanjiPhonetic } from "./layouts/kurmanji-phonetic.js";
import { soraniLayout } from "./layouts/sorani.js";
import { normalizeLegacy } from "./normalize.js";

export const layouts: Record<string, Layout> = {
  sorani: soraniLayout,
  "kurmanji-phonetic": kurmanjiPhonetic,
  "kurmanji-official": kurmanjiOfficial,
};

export interface GlobalAttachOptions extends Omit<AttachOptions, "layout"> {
  /** A Layout object, or one of the bundled layout names. */
  layout?: Layout | string;
}

export function attachTo(
  target: EditableElement,
  options: GlobalAttachOptions = {},
): KurdishKeyboard {
  const { layout, ...rest } = options;
  const resolved = typeof layout === "string" ? layouts[layout] : layout;
  if (typeof layout === "string" && resolved === undefined) {
    throw new Error(
      `kurdish-keyboard: unknown layout "${layout}" — bundled layouts: ${Object.keys(layouts).join(", ")}`,
    );
  }
  return KurdishKeyboard.attachTo(
    target,
    resolved ? { ...rest, layout: resolved } : rest,
  );
}

export { KurdishKeyboard, normalizeLegacy };
