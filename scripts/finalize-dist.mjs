// Post-build dist finalization:
// 1. Duplicates every dist .d.ts as .d.cts with .js specifiers rewritten to
//    .cjs — in a "type": "module" package, .d.ts is ESM-flavored and CJS
//    consumers on node16 resolution would hit masquerading errors
// 2. Copies the static package assets (styles.css, codepoints.json) into dist
//    so the exports map can serve them.
import { copyFile, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");

for (const entry of await readdir(dist, { recursive: true })) {
  if (entry.endsWith(".d.ts")) {
    const source = await readFile(join(dist, entry), "utf8");
    const cts = source.replace(/(from\s+['"]\.[^'"]*)\.js(['"])/g, "$1.cjs$2");
    await writeFile(join(dist, entry.replace(/\.d\.ts$/, ".d.cts")), cts);
  }
}

await copyFile(join(root, "src/styles.css"), join(dist, "styles.css"));
await copyFile(
  join(root, "src/data/codepoints.json"),
  join(dist, "codepoints.json"),
);
console.log(
  "dist finalized: .d.cts emitted, styles.css + codepoints.json copied",
);
