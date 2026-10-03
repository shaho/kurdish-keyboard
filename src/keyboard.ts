import { contentEditableAdapter, valueAdapter } from "./insertion.js";
import type { InsertionAdapter } from "./insertion.js";
import type { Layout, LayoutKey } from "./layout.js";

/**
 * What the panel can attach to: `.value`-backed fields, contenteditable
 * elements, or — with a custom `adapter` — anything at all.
 */
export type EditableElement = HTMLElement;

export interface AttachOptions {
  /** The layout to render. Defaults to a minimal built-in panel. */
  layout?: Layout;
  /**
   * Custom insertion adapter. When set, the panel routes every key through it
   * and skips its own target detection — attach to any element and translate
   * key presses into your editor's native operations. When omitted, a built-in adapter is chosen: value-based
   * for input/textarea, execCommand-based for contenteditable hosts.
   */
  adapter?: InsertionAdapter;
  /**
   * Sets `inputmode="none"` on the attached field so mobile browsers keep the
   * native soft keyboard hidden — the widget IS the keyboard (D5). Per-field
   * opt-in and off by default: it also disables native autocorrect for that
   * field, which is the integrator's trade-off to make. Restored on detach.
   */
  suppressNative?: boolean;
  /**
   * Where the panel lives: `inline` (default) right after the field, `docked`
   * fixed to the viewport bottom (reserving body padding so the field is never
   * obscured), or `floating` fixed near the viewport corner.
   */
  position?: PanelPosition;
  /** Language of the functional key labels (Shift, Space, …) exposed to assistive tech. */
  labelLanguage?: LabelLanguage;
}

export type PanelPosition = "inline" | "docked" | "floating";

export type LabelLanguage = "en" | "ku";

const EN_LABELS = {
  panel: "Kurdish keyboard",
  space: "Space",
  shift: "Shift",
  caps: "Caps Lock",
  zwnj: "Zero-width non-joiner",
  backspace: "Backspace",
  lineBreak: "New line",
  paragraph: "New paragraph",
};

// Kurdish strings pending native-speaker review
const UI_LABELS: Record<LabelLanguage, typeof EN_LABELS> = {
  en: EN_LABELS,
  ku: {
    panel: "تەختەکلیلی کوردی",
    space: "بۆشایی",
    shift: "شیفت",
    caps: "شیفتی چەسپاو",
    zwnj: "جیاکەرەوەی نەبینراو",
    backspace: "سڕینەوە",
    lineBreak: "دێڕی نوێ",
    paragraph: "بەندی نوێ",
  },
};

/** The functional (non-character) operations a panel key can trigger on the adapter. */
type ActionName = "deleteBack" | "insertLineBreak" | "insertParagraph";

const ACTION_GLYPHS: Record<ActionName, string> = {
  deleteBack: "⌫",
  insertLineBreak: "↵",
  insertParagraph: "¶",
};

// Pre-layout walking-skeleton panel: the five Kurmanji-specific letters.
const SKELETON_LAYOUT: Layout = {
  name: "skeleton",
  displayName: "Skeleton",
  script: "kurmanji",
  dir: "ltr",
  rows: [
    {
      keys: [
        { iso: "D01", base: "ç" },
        { iso: "D02", base: "ê" },
        { iso: "D03", base: "î" },
        { iso: "D04", base: "ş" },
        { iso: "D05", base: "û" },
      ],
    },
  ],
};

export class KurdishKeyboard {
  static attachTo(
    target: EditableElement,
    options: AttachOptions = {},
  ): KurdishKeyboard {
    return new KurdishKeyboard(target, options);
  }

  private readonly panel: HTMLDivElement;
  private layout: Layout;
  private shifted = false;
  private capsLock = false;
  private keysByIso = new Map<string, LayoutKey>();
  private buttonGrid: HTMLButtonElement[][] = [];
  private labels: (typeof UI_LABELS)[LabelLanguage];
  private position: PanelPosition;
  private readonly adapter: InsertionAdapter;
  /** Undo closures for reversible side effects on the host page, drained LIFO by detach(). */
  private restorers: Array<() => void> = [];

  private constructor(
    private readonly target: EditableElement,
    options: AttachOptions,
  ) {
    this.adapter = options.adapter ?? KurdishKeyboard.defaultAdapter(target);
    this.layout = options.layout ?? SKELETON_LAYOUT;
    this.panel = document.createElement("div");
    this.panel.className = "kkb-panel";
    this.labels = UI_LABELS[options.labelLanguage ?? "en"];
    // Pointer presses must not steal focus from the field being typed into
    // (keyboard/AT users still focus keys via Tab and the roving tabindex).
    this.panel.addEventListener("mousedown", (e) => e.preventDefault());
    this.panel.addEventListener("click", (e) => this.onClick(e));
    this.panel.addEventListener("keydown", (e) => this.onKeydown(e));
    this.position = options.position ?? "inline";
    this.render();
    this.place();
    if (options.suppressNative) {
      const prior = this.target.getAttribute("inputmode");
      this.target.setAttribute("inputmode", "none");
      this.restorers.push(() => {
        // Only undo our own suppression: if someone else (another keyboard,
        // host code) changed inputmode since, restoring would clobber them.
        if (this.target.getAttribute("inputmode") !== "none") return;
        if (prior === null) this.target.removeAttribute("inputmode");
        else this.target.setAttribute("inputmode", prior);
      });
    }
    this.hintIfDirMismatch();
  }

  detach(): void {
    this.panel.remove();
    while (this.restorers.length > 0) this.restorers.pop()!();
  }

  private static defaultAdapter(target: EditableElement): InsertionAdapter {
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      return valueAdapter(target);
    }
    // Check the attribute, not `isContentEditable`: that property is false on
    // detached elements (and unimplemented in jsdom), and attach legitimately
    // happens before the host is in the document or focused.
    const attr = target.getAttribute("contenteditable");
    if (
      target.isContentEditable ||
      attr === "" ||
      attr === "true" ||
      attr === "plaintext-only"
    ) {
      return contentEditableAdapter(target);
    }
    throw new Error(
      "kurdish-keyboard: attachTo target must be an <input>, <textarea>, or contenteditable element — or pass options.adapter for a custom host.",
    );
  }

  private place(): void {
    if (this.position === "inline") {
      this.target.insertAdjacentElement("afterend", this.panel);
      return;
    }
    // Fixed modes style the panel from JS so they work without the stylesheet;
    // the classes exist for theming overrides.
    this.panel.style.position = "fixed";
    if (this.position === "docked") {
      this.panel.classList.add("kkb-docked");
      this.panel.style.bottom = "0px";
      this.panel.style.left = "0px";
      this.panel.style.right = "0px";
      document.body.appendChild(this.panel);
      const priorPadding = document.body.style.paddingBottom;
      this.restorers.push(() => {
        document.body.style.paddingBottom = priorPadding;
      });
      this.updateDockedPadding();
    } else {
      this.panel.classList.add("kkb-floating");
      this.panel.style.bottom = "16px";
      this.panel.style.insetInlineEnd = "16px";
      document.body.appendChild(this.panel);
    }
  }

  /** Reserve room so the docked panel never covers the focused field; height changes with the layout. */
  private updateDockedPadding(): void {
    if (this.position === "docked" && this.panel.isConnected) {
      document.body.style.paddingBottom = `${this.panel.offsetHeight}px`;
    }
  }

  setLabelLanguage(language: LabelLanguage): void {
    this.labels = UI_LABELS[language];
    this.render();
  }

  setLayout(layout: Layout): void {
    this.layout = layout;
    this.shifted = false;
    this.capsLock = false;
    this.render();
    this.hintIfDirMismatch();
  }

  // the widget renders RTL itself but never mutates the host field's
  // direction — that's the integrator's call, so hint when it looks wrong.
  private hintIfDirMismatch(): void {
    if (
      this.layout.dir === "rtl" &&
      this.target.dir !== "rtl" &&
      this.target.dir !== "auto"
    ) {
      console.info(
        `kurdish-keyboard: the "${this.layout.name}" layout is right-to-left but the attached field has no dir set — consider dir="rtl" or dir="auto" on it.`,
      );
    }
  }

  private onClick(e: MouseEvent): void {
    const button = (e.target as HTMLElement).closest<HTMLElement>("button");
    if (!button) return;
    if (button.dataset["kkbShift"] !== undefined) {
      this.setShifted(!this.shifted);
      return;
    }
    if (button.dataset["kkbCaps"] !== undefined) {
      this.capsLock = !this.capsLock;
      this.render();
      return;
    }
    const action = button.dataset["kkbAction"] as ActionName | undefined;
    if (action !== undefined) {
      this.adapter[action]?.();
      return; // functional keys don't consume the one-shot shift
    }
    const key =
      button.dataset["kkbIso"] && this.keysByIso.get(button.dataset["kkbIso"]);
    if (!key) return;
    this.adapter.insertChar(this.outputOf(key));
    if (this.shifted) this.setShifted(false); // one-shot shift, like mobile keyboards
  }

  /** A casing key's shift output is exactly the uppercase of its base (ç → Ç). */
  private static isCasingKey(key: LayoutKey): boolean {
    return (
      key.shift !== undefined &&
      key.shift !== key.base &&
      key.shift === key.base.toUpperCase()
    );
  }

  private outputOf(key: LayoutKey): string {
    // Caps Lock sustains the shift layer for casing keys only; one-shot Shift
    // applies to every key and inverts Caps on casing keys (caps+shift → lowercase).
    const useShiftLayer =
      this.shifted !== (this.capsLock && KurdishKeyboard.isCasingKey(key));
    return useShiftLayer && key.shift !== undefined ? key.shift : key.base;
  }

  private setShifted(shifted: boolean): void {
    this.shifted = shifted;
    this.render();
  }

  private render(): void {
    // A re-render replaces every button; remember which one held keyboard
    // focus so focus (and the roving tabindex) survives shift/caps/setLayout.
    const focused = document.activeElement;
    const focusedSelector =
      focused instanceof HTMLElement && this.panel.contains(focused)
        ? focused.dataset["kkbIso"] !== undefined
          ? `button[data-kkb-iso="${focused.dataset["kkbIso"]}"]`
          : focused.dataset["kkbAction"] !== undefined
            ? `button[data-kkb-action="${focused.dataset["kkbAction"]}"]`
            : focused.dataset["kkbShift"] !== undefined
              ? "button[data-kkb-shift]"
              : "button[data-kkb-caps]"
        : null;

    this.panel.replaceChildren();
    this.panel.dir = this.layout.dir;
    this.panel.setAttribute("role", "group");
    this.panel.setAttribute(
      "aria-label",
      `${this.labels.panel} — ${this.layout.displayName}`,
    );
    this.keysByIso = new Map();
    this.buttonGrid = [];
    const hasShiftLayer = this.layout.rows.some((row) =>
      row.keys.some((k) => k.shift !== undefined),
    );

    for (const row of this.layout.rows) {
      const rowEl = document.createElement("div");
      rowEl.className = "kkb-row";
      const rowButtons: HTMLButtonElement[] = [];
      for (const key of row.keys) {
        this.keysByIso.set(key.iso, key);
        const button = document.createElement("button");
        button.type = "button";
        // kkbIso is the key's identity (drives the click lookup); kkbKey stays
        // the base output across layers as a stable, human-queryable handle.
        button.dataset["kkbIso"] = key.iso;
        button.dataset["kkbKey"] = key.base;
        const output = this.outputOf(key);
        button.textContent = output;
        // Invisible outputs need spoken names; visible glyphs name themselves.
        // Only ZWNJ today \u2014 a layout adding other format chars (ZWJ, RLM\u2026)
        // must add its own label rather than widen this test.
        if (output === " ")
          button.setAttribute("aria-label", this.labels.space);
        else if (/^\u200c+$/.test(output))
          button.setAttribute("aria-label", this.labels.zwnj);
        rowEl.appendChild(button);
        rowButtons.push(button);
      }
      this.panel.appendChild(rowEl);
      this.buttonGrid.push(rowButtons);
    }

    const controls = document.createElement("div");
    controls.className = "kkb-row kkb-controls";
    const controlButtons: HTMLButtonElement[] = [];
    if (hasShiftLayer) {
      controlButtons.push(
        this.makeToggle("kkbShift", "⇧", this.labels.shift, this.shifted),
      );
      if (
        this.layout.rows.some((row) =>
          row.keys.some(KurdishKeyboard.isCasingKey),
        )
      ) {
        controlButtons.push(
          this.makeToggle("kkbCaps", "⇪", this.labels.caps, this.capsLock),
        );
      }
    }
    // One key per adapter operation the target supports; nothing rendered for
    // operations the adapter omits.
    controlButtons.push(this.makeAction("deleteBack", this.labels.backspace));
    if (this.adapter.insertLineBreak) {
      controlButtons.push(
        this.makeAction("insertLineBreak", this.labels.lineBreak),
      );
    }
    if (this.adapter.insertParagraph) {
      controlButtons.push(
        this.makeAction("insertParagraph", this.labels.paragraph),
      );
    }
    controls.append(...controlButtons);
    this.panel.appendChild(controls);
    this.buttonGrid.push(controlButtons);

    const preferred = focusedSelector
      ? this.panel.querySelector<HTMLButtonElement>(focusedSelector)
      : null;
    this.setRovingFocus(
      preferred ?? this.buttonGrid[0]?.[0] ?? null,
      focusedSelector !== null,
    );
    this.updateDockedPadding();
  }

  private makeAction(action: ActionName, label: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset["kkbAction"] = action;
    button.textContent = ACTION_GLYPHS[action];
    button.setAttribute("aria-label", label);
    return button;
  }

  private makeToggle(
    flag: "kkbShift" | "kkbCaps",
    glyph: string,
    label: string,
    pressed: boolean,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset[flag] = "";
    button.textContent = glyph;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(pressed));
    return button;
  }

  /** APG roving tabindex: one tabbable key; optionally move real focus to it. */
  private setRovingFocus(
    button: HTMLButtonElement | null,
    focus: boolean,
  ): void {
    for (const row of this.buttonGrid) for (const b of row) b.tabIndex = -1;
    if (!button) return;
    button.tabIndex = 0;
    if (focus) button.focus();
  }

  private onKeydown(e: KeyboardEvent): void {
    const target = (e.target as HTMLElement).closest("button");
    if (!(target instanceof HTMLButtonElement)) return;
    const row = this.buttonGrid.findIndex((r) => r.includes(target));
    if (row === -1) return;
    const col = this.buttonGrid[row]!.indexOf(target);
    // Horizontal arrows follow the visual direction: in an RTL panel the next
    // DOM sibling renders to the LEFT, so the deltas invert.
    const forward = this.layout.dir === "rtl" ? -1 : 1;
    let next: HTMLButtonElement | undefined;
    switch (e.key) {
      case "ArrowRight":
        next = this.buttonGrid[row]![col + forward];
        break;
      case "ArrowLeft":
        next = this.buttonGrid[row]![col - forward];
        break;
      case "ArrowDown":
        next = this.rowNeighbor(row + 1, col);
        break;
      case "ArrowUp":
        next = this.rowNeighbor(row - 1, col);
        break;
      case "Home":
        next = this.buttonGrid[row]![0];
        break;
      case "End":
        next = this.buttonGrid[row]![this.buttonGrid[row]!.length - 1];
        break;
      default:
        return; // Tab and everything else keep their native behavior
    }
    e.preventDefault();
    if (next) this.setRovingFocus(next, true);
  }

  private rowNeighbor(row: number, col: number): HTMLButtonElement | undefined {
    const targetRow = this.buttonGrid[row];
    if (!targetRow) return undefined;
    return targetRow[Math.min(col, targetRow.length - 1)];
  }
}
