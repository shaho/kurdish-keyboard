# Vendored CLDR keyboard data

`ckb-t-k0-windows.xml` — Central Kurdish (Sorani) keyboard layout, copied verbatim from
[unicode-org/cldr, tag `release-43`, `keyboards/windows/ckb-t-k0-windows.xml`](https://github.com/unicode-org/cldr/blob/release-43/keyboards/windows/ckb-t-k0-windows.xml)
(fetched 2026-07-17). Release-43 is the last CLDR release carrying per-platform keyboard
data;

Vendored so layout generation is reproducible offline. Do not edit by hand —
`scripts/generate-sorani-layout.mjs` reads this file and writes
`src/data/layouts/sorani.json`; a test regenerates and diffs to catch drift.

CLDR data is © Unicode, Inc., distributed under the [Unicode License](https://www.unicode.org/license.txt).
