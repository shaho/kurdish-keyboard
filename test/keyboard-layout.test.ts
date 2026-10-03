import { afterEach, describe, expect, it, vi } from "vitest";
import { KurdishKeyboard, soraniLayout } from "../src/index";

function createInput(): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  document.body.appendChild(input);
  return input;
}

function attachSorani(): HTMLInputElement {
  const input = createInput();
  KurdishKeyboard.attachTo(input, { layout: soraniLayout });
  return input;
}

function clickKeyByBase(base: string): void {
  const key = document.querySelector<HTMLButtonElement>(
    `button[data-kkb-key="${base}"]`,
  );
  if (!key) throw new Error(`no rendered key with base "${base}"`);
  key.click();
}

function clickShift(): void {
  const shift = document.querySelector<HTMLButtonElement>(
    "button[data-kkb-shift]",
  );
  if (!shift) throw new Error("no shift key rendered");
  shift.click();
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("rendering a layout", () => {
  it("renders the panel right-to-left for the Sorani layout", () => {
    attachSorani();
    const panel = document.querySelector<HTMLElement>(".kkb-panel");
    expect(panel?.dir).toBe("rtl");
  });

  it("renders every layout key as a button, row by row", () => {
    attachSorani();
    const rows = document.querySelectorAll(".kkb-panel .kkb-row");
    expect(rows.length).toBeGreaterThanOrEqual(soraniLayout.rows.length);
    const keyCount = soraniLayout.rows.reduce(
      (n, row) => n + row.keys.length,
      0,
    );
    expect(document.querySelectorAll("button[data-kkb-key]").length).toBe(
      keyCount,
    );
  });
});

describe("RTL host-field hint (D6)", () => {
  it("hints via console.info when an RTL layout attaches to a field without dir set", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    attachSorani(); // createInput() sets no dir
    expect(info).toHaveBeenCalledOnce();
    expect(String(info.mock.calls[0])).toMatch(/dir="rtl"|dir="auto"/);
    info.mockRestore();
  });

  it("stays silent when the field already declares rtl or auto", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const input = createInput();
    input.dir = "rtl";
    KurdishKeyboard.attachTo(input, { layout: soraniLayout });
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });
});

describe("typing Sorani", () => {
  it("types base-layer letters", () => {
    const input = attachSorani();
    clickKeyByBase("ک");
    clickKeyByBase("و");
    clickKeyByBase("ر");
    clickKeyByBase("د");
    expect(input.value).toBe("کورد");
  });

  it("shift then W types the two-codepoint وو and shift releases", () => {
    const input = attachSorani();
    clickShift();
    clickKeyByBase("و");
    expect(input.value).toBe("وو");
    // one-shot: shift released, next press is base again
    clickKeyByBase("و");
    expect(input.value).toBe("ووو");
  });

  it("shift relabels keys to their shift outputs while active", () => {
    attachSorani();
    const label = () =>
      document.querySelector<HTMLButtonElement>('button[data-kkb-key="و"]')
        ?.textContent;
    expect(label()).toBe("و");
    clickShift();
    expect(label()).toBe("وو");
    clickShift();
    expect(label()).toBe("و");
  });

  it("keys without a shift output still type their base while shifted", () => {
    const input = attachSorani();
    clickShift();
    clickKeyByBase(" "); // space has no distinct shift output
    expect(input.value).toBe(" ");
  });
});
