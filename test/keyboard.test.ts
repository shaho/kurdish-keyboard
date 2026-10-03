import { afterEach, describe, expect, it } from "vitest";
import { KurdishKeyboard } from "../src/index";

function createInput(): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  document.body.appendChild(input);
  return input;
}

afterEach(() => {
  document.body.innerHTML = "";
});

function clickKey(char: string): void {
  const key = document.querySelector<HTMLButtonElement>(
    `button[data-kkb-key="${char}"]`,
  );
  if (!key) throw new Error(`no rendered key for "${char}"`);
  key.click();
}

describe("typing via key clicks", () => {
  it("inserts the character at the caret and moves the caret after it", () => {
    const input = createInput();
    input.value = "Kurdi";
    input.setSelectionRange(5, 5);
    KurdishKeyboard.attachTo(input);

    clickKey("ç");

    expect(input.value).toBe("Kurdiç");
    expect(input.selectionStart).toBe(6);
    expect(input.selectionEnd).toBe(6);
  });

  it("fires a bubbling input event so listeners observe the change", () => {
    const input = createInput();
    KurdishKeyboard.attachTo(input);
    let observed = "";
    document.body.addEventListener("input", (e) => {
      observed = (e.target as HTMLInputElement).value;
    });

    clickKey("ş");

    expect(observed).toBe("ş");
  });
  it("replaces the selected text and leaves the caret after the insertion", () => {
    const input = createInput();
    input.value = "Kurdax";
    input.setSelectionRange(4, 6); // "ax" selected
    KurdishKeyboard.attachTo(input);

    clickKey("î");

    expect(input.value).toBe("Kurdî");
    expect(input.selectionStart).toBe(5);
    expect(input.selectionEnd).toBe(5);
  });

  it("types into a textarea, mid-text", () => {
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.value = "bo\nxwe";
    textarea.setSelectionRange(1, 1); // between "b" and "o"
    KurdishKeyboard.attachTo(textarea);

    clickKey("ê");

    expect(textarea.value).toBe("bêo\nxwe");
    expect(textarea.selectionStart).toBe(2);
  });
});

describe("attachTo / detach", () => {
  it("renders a key panel when attached to an input", () => {
    const input = createInput();

    KurdishKeyboard.attachTo(input);

    const keys = document.querySelectorAll("button[data-kkb-key]");
    expect(keys.length).toBeGreaterThan(0);
  });

  it("removes the panel on detach", () => {
    const input = createInput();

    const kb = KurdishKeyboard.attachTo(input);
    kb.detach();

    expect(document.querySelectorAll("button[data-kkb-key]").length).toBe(0);
  });
});
