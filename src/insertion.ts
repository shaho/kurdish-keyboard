/**
 * The insertion seam: the panel never touches its target directly — every key
 * press goes through an adapter. Two ship built-in (`valueAdapter` for
 * input/textarea, `contentEditableAdapter` for plain contenteditable hosts);
 * integrators with richer editors (Lexical, ProseMirror…) pass their own via
 * `AttachOptions.adapter` and translate these calls into editor-native ones.
 *
 * `insertChar`/`deleteBack` are required. `insertLineBreak`/`insertParagraph`
 * are optional: a target without the concept (a single-line input) omits them
 * and the panel hides those keys instead of rendering keys that do nothing.
 */
export interface InsertionAdapter {
  insertChar(text: string): void;
  deleteBack(): void;
  insertLineBreak?(): void;
  insertParagraph?(): void;
}

export type ValueElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * Inserts `text` at the caret (replacing any selection) and moves the caret
 * to the end of the inserted text. Dispatches a bubbling `input` event because
 * script-driven value changes never fire trusted events on their own — without
 * it, framework listeners would miss the change.
 */
export function insertText(el: ValueElement, text: string): void {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  el.setRangeText(text, start, end, "end");
  el.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: text,
    }),
  );
}

function deleteBack(el: ValueElement): void {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  if (start === end && start === 0) return;
  if (start !== end) {
    el.setRangeText("", start, end, "end");
  } else {
    // Delete one code point, not one UTF-16 unit: step over a low surrogate
    // so astral characters vanish whole instead of leaving a broken half.
    const unit = el.value.charCodeAt(start - 1);
    const width = unit >= 0xdc00 && unit <= 0xdfff && start >= 2 ? 2 : 1;
    el.setRangeText("", start - width, start, "end");
  }
  el.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      inputType: "deleteContentBackward",
    }),
  );
}

/** Built-in adapter for `.value`-backed fields. Inputs are single-line, so only textareas get the break operations. */
export function valueAdapter(el: ValueElement): InsertionAdapter {
  const adapter: InsertionAdapter = {
    insertChar: (text) => insertText(el, text),
    deleteBack: () => deleteBack(el),
  };
  if (el instanceof HTMLTextAreaElement) {
    adapter.insertLineBreak = () => insertText(el, "\n");
    // Plain text has no paragraph node; the blank-line convention is one.
    adapter.insertParagraph = () => insertText(el, "\n\n");
  }
  return adapter;
}

/**
 * Built-in adapter for plain contenteditable hosts, via `document.execCommand`.
 * Deprecated on paper, universally shipped in practice, and it routes through
 * the browser's real editing pipeline so caret handling and `input` events come
 * for free (verified against current engines).
 * Framework editors (Lexical & co.) intercept or revert these commands; they
 * get an editor-native adapter instead.
 */
export function contentEditableAdapter(host: HTMLElement): InsertionAdapter {
  const doc = host.ownerDocument;
  // Only act when the caret is inside the host: execCommand targets whatever
  // is selected document-wide, and typing into someone else's field is worse
  // than a no-op.
  const caretInHost = (): boolean => {
    const selection = doc.defaultView?.getSelection();
    return selection?.anchorNode != null && host.contains(selection.anchorNode);
  };
  const exec = (command: string, value?: string): void => {
    if (caretInHost()) doc.execCommand(command, false, value);
  };
  return {
    insertChar: (text) => exec("insertText", text),
    deleteBack: () => exec("delete"),
    insertLineBreak: () => {
      if (!caretInHost()) return;
      // Chromium executes insertLineBreak directly; engines that don't
      // return false and get the <br> spelled out.
      if (!doc.execCommand("insertLineBreak")) {
        doc.execCommand("insertHTML", false, "<br>");
      }
    },
    insertParagraph: () => exec("insertParagraph"),
  };
}
