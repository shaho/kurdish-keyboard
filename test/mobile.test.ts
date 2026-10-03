import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { KurdishKeyboard, soraniLayout } from "../src/index";
import { clickKeyByBase, createInput } from "./helpers";

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.paddingBottom = "";
});

describe('suppressNative (inputmode="none")', () => {
  it("is off by default: attaching never touches the field inputmode", () => {
    const input = createInput("auto");
    KurdishKeyboard.attachTo(input, { layout: soraniLayout });
    expect(input.hasAttribute("inputmode")).toBe(false);
  });

  it('sets inputmode="none" on the field when opted in, and typing still works', () => {
    const input = createInput("auto");
    KurdishKeyboard.attachTo(input, {
      layout: soraniLayout,
      suppressNative: true,
    });
    expect(input.getAttribute("inputmode")).toBe("none");
    clickKeyByBase("ک");
    expect(input.value).toBe("ک");
  });

  it("detach removes the inputmode it added", () => {
    const input = createInput("auto");
    const kb = KurdishKeyboard.attachTo(input, {
      layout: soraniLayout,
      suppressNative: true,
    });
    kb.detach();
    expect(input.hasAttribute("inputmode")).toBe(false);
  });

  it("detach restores a pre-existing inputmode instead of deleting it", () => {
    const input = createInput("auto");
    input.setAttribute("inputmode", "numeric");
    const kb = KurdishKeyboard.attachTo(input, {
      layout: soraniLayout,
      suppressNative: true,
    });
    expect(input.getAttribute("inputmode")).toBe("none");
    kb.detach();
    expect(input.getAttribute("inputmode")).toBe("numeric");
  });
});

describe("panel placement modes", () => {
  it("defaults to inline: panel sits right after the field", () => {
    const input = createInput("auto");
    KurdishKeyboard.attachTo(input, { layout: soraniLayout });
    expect(input.nextElementSibling?.classList.contains("kkb-panel")).toBe(
      true,
    );
  });

  it("docked: fixed to the viewport bottom on body, reserving room so the field is not obscured", () => {
    const input = createInput("auto");
    const kb = KurdishKeyboard.attachTo(input, {
      layout: soraniLayout,
      position: "docked",
    });
    const panel = document.querySelector<HTMLElement>(".kkb-panel")!;
    expect(panel.parentElement).toBe(document.body);
    expect(panel.classList.contains("kkb-docked")).toBe(true);
    expect(panel.style.position).toBe("fixed");
    expect(panel.style.bottom).toBe("0px");
    expect(document.body.style.paddingBottom).toBe(`${panel.offsetHeight}px`);
    kb.detach();
    expect(document.body.style.paddingBottom).toBe("");
  });

  it("floating: fixed panel with the floating class", () => {
    const input = createInput("auto");
    KurdishKeyboard.attachTo(input, {
      layout: soraniLayout,
      position: "floating",
    });
    const panel = document.querySelector<HTMLElement>(".kkb-panel")!;
    expect(panel.parentElement).toBe(document.body);
    expect(panel.classList.contains("kkb-floating")).toBe(true);
    expect(panel.style.position).toBe("fixed");
  });
});

describe("lifecycle edge cases (from spec review)", () => {
  it("two suppressing keyboards detached in attach order leave the field clean", () => {
    const input = createInput("auto");
    const kb1 = KurdishKeyboard.attachTo(input, {
      layout: soraniLayout,
      suppressNative: true,
    });
    const kb2 = KurdishKeyboard.attachTo(input, {
      layout: soraniLayout,
      suppressNative: true,
    });
    kb1.detach();
    kb2.detach();
    expect(input.hasAttribute("inputmode")).toBe(false);
  });

  it("docked body padding follows the panel height across setLayout", () => {
    const input = createInput("auto");
    const kb = KurdishKeyboard.attachTo(input, {
      layout: soraniLayout,
      position: "docked",
    });
    const panel = document.querySelector<HTMLElement>(".kkb-panel")!;
    Object.defineProperty(panel, "offsetHeight", {
      value: 120,
      configurable: true,
    });
    kb.setLayout(soraniLayout); // re-render with the (mocked) new height
    expect(document.body.style.paddingBottom).toBe("120px");
  });
});

describe("no user-agent sniffing", () => {
  it("src/ never reads navigator.userAgent or platform", () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (/\.(ts|json)$/.test(entry.name)) {
          const content = readFileSync(path, "utf8");
          if (/userAgent|navigator\.platform/.test(content))
            offenders.push(path);
        }
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });
});
