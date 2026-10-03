// Requires a fresh `npm run build`. Exits non-zero on the first failure.
//
// Checks: (1) consumer resolution of every entry point in real ESM and CJS
// processes through the exports map; (2) tree-shaking — a Sorani-only import
// bundles no Kurmanji data; (3) the IIFE global with string layout names;
// (4) static assets served by the exports map; (5) npm publish --dry-run
// with exactly the expected file set.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInContext } from "node:vm";
import { JSDOM } from "jsdom";

const root = fileURLToPath(new URL("..", import.meta.url));
let failures = 0;
const check = (label, fn) => {
  try {
    fn();
    console.log(`ok   ${label}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${label}\n     ${error.message}`);
  }
};

const consumerDir = mkdtempSync(join(tmpdir(), "kkb-consumer-"));
mkdirSync(join(consumerDir, "node_modules"));
symlinkSync(root, join(consumerDir, "node_modules", "kurdish-keyboard"));
const SUBPROCESS_TIMEOUT = 60_000;
const nodeEval = (code, type) =>
  execFileSync(process.execPath, ["--input-type", type, "-e", code], {
    cwd: consumerDir,
    encoding: "utf8",
    timeout: SUBPROCESS_TIMEOUT,
  }).trim();

try {
  check("ESM consumers resolve every module entry", () => {
    const out = nodeEval(
      `
      import { KurdishKeyboard, codepoints } from 'kurdish-keyboard';
      import { soraniLayout } from 'kurdish-keyboard/layouts/sorani';
      import { kurmanjiPhonetic } from 'kurdish-keyboard/layouts/kurmanji-phonetic';
      import { kurmanjiOfficial } from 'kurdish-keyboard/layouts/kurmanji-official';
      import { normalizeLegacy } from 'kurdish-keyboard/normalize';
      console.log([typeof KurdishKeyboard.attachTo, codepoints.letters.length, soraniLayout.name, kurmanjiPhonetic.name, kurmanjiOfficial.name, normalizeLegacy('\\u0643')].join('|'));
      `,
      "module",
    );
    // 43 letters = 10 Kurmanji + the 33-codepoint KRG Sorani alphabet.
    assert(
      out === "function|43|sorani|kurmanji-phonetic|kurmanji-official|ک",
      `unexpected: ${out}`,
    );
  });

  check("CJS consumers resolve every module entry", () => {
    const out = nodeEval(
      `
      const { KurdishKeyboard, codepoints } = require('kurdish-keyboard');
      const { soraniLayout } = require('kurdish-keyboard/layouts/sorani');
      const { normalizeLegacy } = require('kurdish-keyboard/normalize');
      console.log([typeof KurdishKeyboard.attachTo, codepoints.letters.length, soraniLayout.name, normalizeLegacy('\\u064A')].join('|'));
      `,
      "commonjs",
    );
    assert(out === "function|43|sorani|ی", `unexpected: ${out}`);
  });

  check("static assets resolve through the exports map", () => {
    const out = nodeEval(
      `
      const styles = require.resolve('kurdish-keyboard/styles.css');
      const codepoints = require('kurdish-keyboard/codepoints.json');
      console.log([styles.endsWith('dist/styles.css'), codepoints.version].join('|'));
      `,
      "commonjs",
    );
    assert(out.startsWith("true|1."), `unexpected: ${out}`);
  });

  check(
    "types compile for ESM and CJS consumers under node16 resolution",
    () => {
      // File presence isn't enough: a bad specifier rewrite in finalize-dist.mjs
      // (the .d.cts masquerading class of bug) only fails when a
      // consumer actually typechecks against the exports map.
      writeFileSync(
        join(consumerDir, "consumer-esm.mts"),
        `
      import { KurdishKeyboard, codepoints } from 'kurdish-keyboard';
      import { soraniLayout } from 'kurdish-keyboard/layouts/sorani';
      import type { Layout } from 'kurdish-keyboard';
      import { normalizeLegacy } from 'kurdish-keyboard/normalize';
      const layout: Layout = soraniLayout;
      const kb: KurdishKeyboard = KurdishKeyboard.attachTo(document.createElement('input'), { layout });
      kb.detach();
      console.log(codepoints.version, normalizeLegacy(''));
      `,
      );
      writeFileSync(
        join(consumerDir, "consumer-cjs.cts"),
        `
      import kk = require('kurdish-keyboard');
      import soraniModule = require('kurdish-keyboard/layouts/sorani');
      const layout: kk.Layout = soraniModule.soraniLayout;
      console.log(kk.codepoints.version, layout.name);
      `,
      );
      execFileSync(
        join(root, "node_modules", ".bin", "tsc"),
        [
          "--noEmit",
          "--strict",
          "--module",
          "nodenext",
          "--lib",
          "es2020,dom",
          "consumer-esm.mts",
          "consumer-cjs.cts",
        ],
        { cwd: consumerDir, encoding: "utf8", timeout: SUBPROCESS_TIMEOUT },
      );
    },
  );

  check("tree-shaking: Sorani-only import excludes Kurmanji data", () => {
    const esbuild = join(root, "node_modules", ".bin", "esbuild");
    const entry = join(consumerDir, "treeshake-entry.mjs");
    writeFileSync(
      entry,
      "import { soraniLayout } from 'kurdish-keyboard/layouts/sorani'; console.log(soraniLayout.name);",
    );
    const bundle = execFileSync(esbuild, [entry, "--bundle", "--format=esm"], {
      cwd: consumerDir,
      encoding: "utf8",
      timeout: SUBPROCESS_TIMEOUT,
    });
    assert(
      bundle.includes("Central Kurdish"),
      "sorani layout data missing from bundle",
    );
    assert(
      !bundle.includes("kurmanji"),
      "kurmanji data leaked into a sorani-only bundle",
    );
    assert(
      !bundle.includes("Kurmanc"),
      "kurmanji display name leaked into a sorani-only bundle",
    );
  });

  check("IIFE bundle types into a real DOM via string layout names", () => {
    const source = readFileSync(
      join(root, "dist", "kurdish-keyboard.iife.js"),
      "utf8",
    );
    const dom = new JSDOM('<input id="field">', { runScripts: "outside-only" });
    const context = dom.getInternalVMContext();
    runInContext(source, context);
    const api = context.KurdishKeyboard;
    assert(typeof api?.attachTo === "function", "global attachTo missing");
    assert(
      api.layouts?.sorani?.name === "sorani",
      "layouts registry missing sorani",
    );
    assert(
      api.layouts["kurmanji-phonetic"]?.dir === "ltr",
      "layouts registry missing kurmanji-phonetic",
    );
    assert(
      typeof api.normalizeLegacy === "function",
      "normalizeLegacy missing from global",
    );

    // Happy path: a valid string name renders keys and types into the field.
    const input = dom.window.document.querySelector("input");
    const kb = api.attachTo(input, { layout: "sorani" });
    const keheh = dom.window.document.querySelector('button[data-kkb-key="ک"]');
    assert(keheh, "sorani panel did not render its keys");
    keheh.click();
    assert(input.value === "ک", `expected typed ک, got "${input.value}"`);
    kb.detach();

    let threw = false;
    try {
      api.attachTo(input, { layout: "no-such-layout" });
    } catch (error) {
      threw = /unknown layout/.test(error.message);
    }
    assert(threw, "unknown string layout name should throw a helpful error");
  });

  check("npm publish --dry-run: expected file list, no stray files", () => {
    const packed = JSON.parse(
      execFileSync("npm", ["pack", "--dry-run", "--json"], {
        cwd: root,
        encoding: "utf8",
        timeout: SUBPROCESS_TIMEOUT,
      }),
    );
    const files = packed[0].files.map((f) => f.path);
    for (const required of [
      "dist/index.js",
      "dist/index.cjs",
      "dist/index.d.ts",
      "dist/index.d.cts",
      "dist/layouts/sorani.js",
      "dist/layouts/kurmanji-phonetic.js",
      "dist/layouts/kurmanji-official.js",
      "dist/normalize.js",
      "dist/kurdish-keyboard.iife.js",
      "dist/styles.css",
      "dist/codepoints.json",
      "LICENSE",
      "package.json",
      "readme.md",
    ]) {
      assert(files.includes(required), `missing from package: ${required}`);
    }
    const stray = files.filter(
      (f) =>
        !/^dist\//.test(f) &&
        !["LICENSE", "package.json", "readme.md"].includes(f),
    );
    assert(stray.length === 0, `stray files in package: ${stray.join(", ")}`);
    // --ignore-scripts: prepublishOnly itself runs this script — without the
    // flag this call would recurse forever.
    execFileSync("npm", ["publish", "--dry-run", "--ignore-scripts"], {
      cwd: root,
      stdio: "pipe",
      timeout: SUBPROCESS_TIMEOUT,
    });
  });
} finally {
  rmSync(consumerDir, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\npackage verification passed");
