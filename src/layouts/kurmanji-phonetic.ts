import data from "../data/layouts/kurmanji-phonetic.json";
import type { Layout } from "../layout.js";

/**
 * Kurmanji (Latin-script), phonetic variant: untouched US QWERTY plus a
 * dedicated row for ç ê î ş û. Community convention — no standards body
 * defines a Kurmanji layout.
 */
export const kurmanjiPhonetic: Layout = data as Layout;
