#!/usr/bin/env node
// Generates src/data/layouts/sorani.json from the vendored CLDR release-43
// Central Kurdish keyboard data (see vendor/cldr/README.md). Deterministic:
// same input XML always yields byte-identical output, and a test regenerates
// and diffs against the committed file. Usage:
//   node scripts/generate-sorani-layout.mjs           # write the file
//   node scripts/generate-sorani-layout.mjs --stdout  # print instead
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const XML_URL = new URL("../vendor/cldr/ckb-t-k0-windows.xml", import.meta.url);
const OUT_URL = new URL("../src/data/layouts/sorani.json", import.meta.url);

const xml = readFileSync(XML_URL, "utf8");

function decodeCldrValue(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\\u\{([0-9A-Fa-f]+)\}/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    );
}

// Only the base and shift keymaps become layout layers; the ctrl keymaps emit
// control characters / bidi marks that aren't typeable output for a widget.
const layers = {};
for (const m of xml.matchAll(
  /<keyMap(?:\s+modifiers="([^"]*)")?>([\s\S]*?)<\/keyMap>/g,
)) {
  const [, modifiers, body] = m;
  const maps = new Map();
  for (const [, iso, to] of body.matchAll(
    /<map iso="([^"]+)" to="([^"]*)"\/>/g,
  )) {
    maps.set(iso, decodeCldrValue(to));
  }
  if (modifiers === undefined) layers.base = maps;
  else if (modifiers === "shift+caps?") layers.shift = maps;
}
if (!layers.base) throw new Error("no base keyMap found in CLDR XML");

const nameMatch = xml.match(/<name value="([^"]*)"\/>/);
if (!nameMatch) throw new Error("no <name value> found in CLDR XML");
const displayName = decodeCldrValue(nameMatch[1]);

// ISO/IEC 9995 position codes: row letter (E=digit row … A=space row) + column.
const ROW_ORDER = ["E", "D", "C", "B", "A"];
const rows = ROW_ORDER.map((rowLetter) => {
  const isoCodes = [...layers.base.keys()]
    .filter((iso) => iso[0] === rowLetter)
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  return {
    keys: isoCodes.map((iso) => {
      const base = layers.base.get(iso);
      const shift = layers.shift?.get(iso);
      return shift !== undefined && shift !== base
        ? { iso, base, shift }
        : { iso, base };
    }),
  };
}).filter((row) => row.keys.length > 0);

const layout = {
  name: "sorani",
  displayName,
  script: "sorani",
  dir: "rtl",
  source: "CLDR release-43 keyboards/windows/ckb-t-k0-windows.xml",
  rows,
};

// Escape invisible format characters (ZWNJ, bidi marks) so the JSON stays
// readable and editor-safe.
const json =
  JSON.stringify(layout, null, 2).replace(
    /[\u200b-\u200f\u2028-\u202e]/g,
    (ch) => {
      return "\\u" + ch.codePointAt(0).toString(16).padStart(4, "0");
    },
  ) + "\n";

if (process.argv.includes("--stdout")) {
  process.stdout.write(json);
} else {
  writeFileSync(OUT_URL, json);
  console.log(`wrote ${fileURLToPath(OUT_URL)}`);
}
