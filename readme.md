# kurdish-keyboard

An embeddable virtual keyboard for typing Kurdish in the browser — both
**Kurmanji** (Latin script) and **Sorani** (Arabic script) — as a TypeScript npm
package. No OS-level keyboard layouts, no native apps: attach it to any
`<input>`, `<textarea>`, or `contenteditable` element on any modern site — or to
any rich-text editor via a custom insertion adapter. Full demos and reference is
available at [Kurdish keyboard homepage](https://shaho.nl/kurdish-keyboard)

## Why

Kurdish text on the web suffers from decades of codepoint fragmentation —
visually identical letters encoded differently (ك vs ک, ي vs ی, ه vs ە), which
silently breaks search, sorting, and spellcheck. This keyboard emits **only**
the unified codepoints standardized by the
<abbr title="Kurdistan Regional Government">KRG</abbr> Department of IT and
verified against the Unicode Character Database, so everything typed with it is
correct by construction.

## Usage

```ts
import { KurdishKeyboard } from "kurdish-keyboard";
import "kurdish-keyboard/styles.css"; // optional styling (responsive + touch targets)
import { soraniLayout } from "kurdish-keyboard/layouts/sorani";
import { kurmanjiPhonetic } from "kurdish-keyboard/layouts/kurmanji-phonetic";

const input = document.querySelector("input")!;
const kb = KurdishKeyboard.attachTo(input, {
  layout: soraniLayout, // tree-shakable: only the layouts you import are bundled
  suppressNative: true, // mobile: keep the native keyboard hidden (inputmode="none")
  position: "docked", // or 'inline' (default) / 'floating'
});
kb.setLayout(kurmanjiPhonetic); // live script toggle (RTL ↔ LTR)
kb.detach();
```

### Contenteditable and rich-text editors

Plain `contenteditable` hosts work out of the box — typing routes through the
browser's own editing commands, so caret handling, undo, and `input` events
behave like real keystrokes. One contract: keys only act while the selection is
inside the attached host.

```ts
KurdishKeyboard.attachTo(document.querySelector("[contenteditable]")!, {
  layout: soraniLayout,
});
```

Framework editors (Lexical, ProseMirror, Slate) revert outside DOM edits by
design; give them an editor-native `adapter` instead. `insertChar` and
`deleteBack` are required, `insertLineBreak`/`insertParagraph` optional — the
panel only renders keys for operations the adapter provides. A Lexical example:

```ts
import {
  $getSelection,
  DELETE_CHARACTER_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
} from "lexical";

KurdishKeyboard.attachTo(editorRootElement, {
  layout: soraniLayout,
  adapter: {
    insertChar: (text) =>
      editor.update(() => $getSelection()?.insertText(text)),
    deleteBack: () => editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true),
    insertLineBreak: () =>
      editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false),
    insertParagraph: () =>
      editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined),
  },
});
```

**Full reference — options, layouts, mobile, theming (`--kkb-*`), accessibility,
the legacy-text normalizer, CDN usage, live examples and platform limits — lives
in the [integration guide](https://shaho.nl/kurdish-keyboard).**

## Development

```sh
npm run test        # vitest suite (jsdom)
npm run typecheck   # tsc --noEmit (TypeScript 7, strict)
npm run build       # tsup (ESM + CJS) + tsc declaration emit → dist/
```

## License

MIT
