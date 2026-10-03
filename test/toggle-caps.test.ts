import { afterEach, describe, expect, it } from "vitest";
import { KurdishKeyboard, kurmanjiPhonetic, soraniLayout } from "../src/index";
import {
  capsButton,
  clickKeyByBase,
  createInput as createInputBase,
  shiftButton,
} from "./helpers";

// dir="auto" silences the D6 hint in these tests
const createInput = () => createInputBase("auto");

afterEach(() => {
  document.body.innerHTML = "";
});

describe("setLayout", () => {
  it("swaps Sorani ↔ Kurmanji live: direction flips and typing follows the new layout", () => {
    const input = createInput();
    const kb = KurdishKeyboard.attachTo(input, { layout: soraniLayout });
    const panel = document.querySelector<HTMLElement>(".kkb-panel")!;

    clickKeyByBase("ک");
    expect(panel.dir).toBe("rtl");

    kb.setLayout(kurmanjiPhonetic);
    expect(panel.dir).toBe("ltr");
    clickKeyByBase("ç");
    expect(input.value).toBe("کç");

    kb.setLayout(soraniLayout);
    expect(panel.dir).toBe("rtl");
    clickKeyByBase("ژ");
    expect(input.value).toBe("کçژ");
  });

  it("resets shift and caps state on layout change", () => {
    const input = createInput();
    const kb = KurdishKeyboard.attachTo(input, { layout: kurmanjiPhonetic });
    capsButton()!.click();
    shiftButton()!.click();
    kb.setLayout(kurmanjiPhonetic);
    clickKeyByBase("ç");
    expect(input.value).toBe("ç"); // not Ç: both states were reset
  });
});

describe("caps lock", () => {
  it("sustains uppercase across keypresses, unlike one-shot shift", () => {
    const input = createInput();
    KurdishKeyboard.attachTo(input, { layout: kurmanjiPhonetic });
    capsButton()!.click();
    clickKeyByBase("ç");
    clickKeyByBase("ê");
    expect(input.value).toBe("ÇÊ");
    capsButton()!.click(); // off
    clickKeyByBase("ç");
    expect(input.value).toBe("ÇÊç");
  });

  it("leaves non-casing keys alone: digits stay digits under caps", () => {
    const input = createInput();
    KurdishKeyboard.attachTo(input, { layout: kurmanjiPhonetic });
    capsButton()!.click();
    clickKeyByBase("1");
    expect(input.value).toBe("1"); // not "!"
  });

  it("shift inverts caps for casing keys (caps + shift → lowercase), one-shot", () => {
    const input = createInput();
    KurdishKeyboard.attachTo(input, { layout: kurmanjiPhonetic });
    capsButton()!.click();
    shiftButton()!.click();
    clickKeyByBase("ç");
    expect(input.value).toBe("ç");
    clickKeyByBase("ç"); // shift released, caps still on
    expect(input.value).toBe("çÇ");
  });

  it("renders no caps key for layouts without casing pairs (Sorani)", () => {
    const input = createInput();
    KurdishKeyboard.attachTo(input, { layout: soraniLayout });
    expect(capsButton()).toBeNull();
  });
});
