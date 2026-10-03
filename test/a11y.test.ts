import { afterEach, describe, expect, it } from "vitest";
import { KurdishKeyboard, kurmanjiPhonetic, soraniLayout } from "../src/index";
import type { AttachOptions, Layout } from "../src/index";
import { capsButton, createInput, shiftButton } from "./helpers";

afterEach(() => {
  document.body.innerHTML = "";
});

function mount(
  layout: Layout,
  options: Omit<AttachOptions, "layout"> = {},
): KurdishKeyboard {
  return KurdishKeyboard.attachTo(createInput("auto"), { layout, ...options });
}

const panel = () => document.querySelector<HTMLElement>(".kkb-panel")!;
const keys = () => [
  ...document.querySelectorAll<HTMLButtonElement>(".kkb-panel button"),
];

function press(el: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(event);
  return event;
}

describe("labelled group and accessible names", () => {
  it("panel is a group named after the layout", () => {
    mount(soraniLayout);
    expect(panel().getAttribute("role")).toBe("group");
    expect(panel().getAttribute("aria-label")).toContain("Central Kurdish");
  });

  it("every key has a non-empty accessible name", () => {
    mount(soraniLayout);
    for (const button of keys()) {
      const name =
        button.getAttribute("aria-label") ?? button.textContent ?? "";
      expect(
        name.trim().length,
        `unnamed key ${button.dataset["kkbIso"] ?? button.outerHTML}`,
      ).toBeGreaterThan(0);
    }
  });

  it("space, shift, and caps get functional names instead of their glyphs", () => {
    mount(kurmanjiPhonetic);
    const space = keys().find((k) => k.dataset["kkbKey"] === " ");
    expect(space?.getAttribute("aria-label")).toBe("Space");
    expect(shiftButton()?.getAttribute("aria-label")).toBe("Shift");
    expect(capsButton()?.getAttribute("aria-label")).toBe("Caps Lock");
  });

  it("key labels switch to Kurdish", () => {
    mount(soraniLayout, { labelLanguage: "ku" });
    const space = keys().find((k) => k.dataset["kkbKey"] === " ");
    expect(space?.getAttribute("aria-label")).toBe("بۆشایی");
    expect(shiftButton()?.getAttribute("aria-label")).toBe("شیفت");
  });
});

describe("roving tabindex and arrow navigation", () => {
  it("exactly one key is tabbable; the rest are tabindex=-1", () => {
    mount(kurmanjiPhonetic);
    const tabbable = keys().filter((k) => k.tabIndex === 0);
    expect(tabbable.length).toBe(1);
    expect(keys().filter((k) => k.tabIndex === -1).length).toBe(
      keys().length - 1,
    );
  });

  it("LTR: ArrowRight moves focus to the next key in the row", () => {
    mount(kurmanjiPhonetic);
    const [first, second] = keys();
    first!.focus();
    const event = press(first!, "ArrowRight");
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(second);
    expect(second!.tabIndex).toBe(0);
    expect(first!.tabIndex).toBe(-1);
  });

  it("RTL: ArrowLeft advances (visually leftward = next DOM key)", () => {
    mount(soraniLayout);
    const [first, second] = keys();
    first!.focus();
    press(first!, "ArrowLeft");
    expect(document.activeElement).toBe(second);
    first!.focus();
    press(first!, "ArrowRight"); // visually rightward from the first key: stays (clamped)
    expect(document.activeElement).toBe(first);
  });

  it("ArrowDown moves to the same column of the next row; Home/End jump within the row", () => {
    mount(kurmanjiPhonetic);
    const rows = [...document.querySelectorAll<HTMLElement>(".kkb-row")];
    const row0 = [...rows[0]!.querySelectorAll("button")];
    const row1 = [...rows[1]!.querySelectorAll("button")];
    row0[2]!.focus();
    press(row0[2]!, "ArrowDown");
    expect(document.activeElement).toBe(row1[2]);
    press(row1[2]!, "End");
    expect(document.activeElement).toBe(row1[row1.length - 1]);
    press(row1[row1.length - 1]!, "Home");
    expect(document.activeElement).toBe(row1[0]);
  });

  it("does not trap Tab", () => {
    mount(kurmanjiPhonetic);
    const [first] = keys();
    first!.focus();
    const event = press(first!, "Tab");
    expect(event.defaultPrevented).toBe(false);
  });

  it("keyboard focus survives a shift re-render", () => {
    mount(kurmanjiPhonetic);
    shiftButton()!.focus();
    shiftButton()!.click();
    expect(document.activeElement).toBe(shiftButton());
    expect(shiftButton()!.getAttribute("aria-pressed")).toBe("true");
  });

  it("label language is switchable live via setLabelLanguage", () => {
    const kb = mount(kurmanjiPhonetic);
    expect(shiftButton()?.getAttribute("aria-label")).toBe("Shift");
    kb.setLabelLanguage("ku");
    expect(shiftButton()?.getAttribute("aria-label")).toBe("شیفت");
    kb.setLabelLanguage("en");
    expect(shiftButton()?.getAttribute("aria-label")).toBe("Shift");
  });
});
