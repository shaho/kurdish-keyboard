import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: [
      "src/index.ts",
      "src/normalize.ts",
      "src/layouts/sorani.ts",
      "src/layouts/kurmanji-phonetic.ts",
      "src/layouts/kurmanji-official.ts",
    ],
    format: ["esm", "cjs"],
    dts: false,
    sourcemap: true,
    clean: true,
  },
  {
    entry: { "kurdish-keyboard": "src/iife.ts" },
    format: ["iife"],
    globalName: "KurdishKeyboard",
    minify: true,
    sourcemap: true,
    clean: false,
    outExtension: () => ({ js: ".iife.js" }),
  },
]);
