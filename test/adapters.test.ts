import { afterEach, describe, expect, it, vi } from "vitest";
import { KurdishKeyboard, contentEditableAdapter } from "../src/index";
import type { InsertionAdapter } from "../src/index";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function createHost(contenteditable: string | null = "true"): HTMLDivElement {
  const div = document.createElement("div");
  if (contenteditable !== null)
    div.setAttribute("contenteditable", contenteditable);
  document.body.appendChild(div);
  return div;
}

function clickKey(char: string): void {
  const key = document.querySelector<HTMLButtonElement>(
    `button[data-kkb-key="${char}"]`,
  );
  if (!key) throw new Error(`no rendered key for "${char}"`);
  key.click();
}

function actionButton(action: string): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(
    `button[data-kkb-action="${action}"]`,
  );
}

function placeCaretIn(node: Node, offset = 0): void {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

/** jsdom has no execCommand; install a spy standing in for the browser's. */
function mockExecCommand(returns = true) {
  const spy = vi.fn().mockReturnValue(returns);
  document.execCommand = spy as unknown as typeof document.execCommand;
  return spy;
}

describe("attach target detection", () => {
  it("attaches to a contenteditable element and places the panel after it", () => {
    const host = createHost("true");
    KurdishKeyboard.attachTo(host);
    expect(host.nextElementSibling?.classList.contains("kkb-panel")).toBe(true);
  });

  it("accepts the bare contenteditable attribute and plaintext-only", () => {
    expect(() => KurdishKeyboard.attachTo(createHost(""))).not.toThrow();
    expect(() =>
      KurdishKeyboard.attachTo(createHost("plaintext-only")),
    ).not.toThrow();
  });

  it("rejects a non-editable element with a clear error", () => {
    expect(() => KurdishKeyboard.attachTo(createHost(null))).toThrow(
      /contenteditable/,
    );
  });

  it("accepts any element when a custom adapter is supplied", () => {
    const inserted: string[] = [];
    const adapter: InsertionAdapter = {
      insertChar: (text) => inserted.push(text),
      deleteBack: () => inserted.pop(),
    };
    KurdishKeyboard.attachTo(createHost(null), { adapter });
    clickKey("ç");
    expect(inserted).toEqual(["ç"]);
  });
});

describe("contentEditableAdapter", () => {
  it("types, deletes, and breaks paragraphs through execCommand at a caret inside the host", () => {
    const spy = mockExecCommand();
    const host = createHost();
    host.textContent = "دەق";
    placeCaretIn(host.firstChild!, 3);
    const adapter = contentEditableAdapter(host);

    adapter.insertChar("ک");
    adapter.deleteBack();
    adapter.insertParagraph!();

    expect(spy.mock.calls).toEqual([
      ["insertText", false, "ک"],
      ["delete", false, undefined],
      ["insertParagraph", false, undefined],
    ]);
  });

  it("falls back to an explicit <br> when insertLineBreak is unsupported", () => {
    const spy = mockExecCommand(false);
    const host = createHost();
    host.textContent = "x";
    placeCaretIn(host.firstChild!, 1);

    contentEditableAdapter(host).insertLineBreak!();

    expect(spy.mock.calls).toEqual([
      ["insertLineBreak"],
      ["insertHTML", false, "<br>"],
    ]);
  });

  it("does nothing when the selection is outside the host", () => {
    const spy = mockExecCommand();
    const host = createHost();
    const elsewhere = document.createElement("p");
    elsewhere.textContent = "other";
    document.body.appendChild(elsewhere);
    placeCaretIn(elsewhere.firstChild!, 2);

    const adapter = contentEditableAdapter(host);
    adapter.insertChar("ک");
    adapter.deleteBack();

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("value-mode backspace", () => {
  function createInput(value: string, caret?: number): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    document.body.appendChild(input);
    const at = caret ?? value.length;
    input.setSelectionRange(at, at);
    return input;
  }

  it("deletes the character before the caret and fires deleteContentBackward", () => {
    const input = createInput("ab");
    KurdishKeyboard.attachTo(input);
    let inputType = "";
    input.addEventListener("input", (e) => {
      inputType = (e as InputEvent).inputType;
    });

    actionButton("deleteBack")!.click();

    expect(input.value).toBe("a");
    expect(input.selectionStart).toBe(1);
    expect(inputType).toBe("deleteContentBackward");
  });

  it("deletes the whole selection when one exists", () => {
    const input = createInput("abc");
    input.setSelectionRange(1, 3);
    KurdishKeyboard.attachTo(input);

    actionButton("deleteBack")!.click();

    expect(input.value).toBe("a");
  });

  it("deletes an astral character whole, not half a surrogate pair", () => {
    const input = createInput("𐍈"); // two UTF-16 units
    KurdishKeyboard.attachTo(input);

    actionButton("deleteBack")!.click();

    expect(input.value).toBe("");
  });

  it("is a no-op at the start of the value", () => {
    const input = createInput("ab", 0);
    KurdishKeyboard.attachTo(input);
    const events = vi.fn();
    input.addEventListener("input", events);

    actionButton("deleteBack")!.click();

    expect(input.value).toBe("ab");
    expect(events).not.toHaveBeenCalled();
  });
});

describe("functional keys follow the adapter contract", () => {
  it("renders only backspace for a single-line input", () => {
    const input = document.createElement("input");
    input.type = "text";
    document.body.appendChild(input);
    KurdishKeyboard.attachTo(input);

    expect(actionButton("deleteBack")).not.toBeNull();
    expect(actionButton("insertLineBreak")).toBeNull();
    expect(actionButton("insertParagraph")).toBeNull();
  });

  it("renders break keys for a textarea, inserting \\n and \\n\\n", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "a";
    document.body.appendChild(textarea);
    textarea.setSelectionRange(1, 1);
    KurdishKeyboard.attachTo(textarea);

    actionButton("insertLineBreak")!.click();
    actionButton("insertParagraph")!.click();

    expect(textarea.value).toBe("a\n\n\n");
  });

  it("hides break keys when a custom adapter omits them", () => {
    const adapter: InsertionAdapter = {
      insertChar: () => {},
      deleteBack: () => {},
    };
    KurdishKeyboard.attachTo(createHost(null), { adapter });

    expect(actionButton("deleteBack")).not.toBeNull();
    expect(actionButton("insertLineBreak")).toBeNull();
    expect(actionButton("insertParagraph")).toBeNull();
  });
});

describe("host-page side effects on contenteditable", () => {
  it("suppressNative sets inputmode on the host and detach restores it", () => {
    const host = createHost();
    const kb = KurdishKeyboard.attachTo(host, { suppressNative: true });
    expect(host.getAttribute("inputmode")).toBe("none");
    kb.detach();
    expect(host.hasAttribute("inputmode")).toBe(false);
  });
});
