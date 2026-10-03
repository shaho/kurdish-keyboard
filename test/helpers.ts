import { readFileSync } from "node:fs";
import Ajv from "ajv";
import type { ErrorObject } from "ajv";

export function createInput(dir?: string): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  if (dir !== undefined) input.dir = dir;
  document.body.appendChild(input);
  return input;
}

export function clickKeyByBase(base: string): void {
  const key = document.querySelector<HTMLButtonElement>(
    `button[data-kkb-key="${base}"]`,
  );
  if (!key) throw new Error(`no rendered key with base "${base}"`);
  key.click();
}

export const shiftButton = (): HTMLButtonElement | null =>
  document.querySelector<HTMLButtonElement>("button[data-kkb-shift]");

export const capsButton = (): HTMLButtonElement | null =>
  document.querySelector<HTMLButtonElement>("button[data-kkb-caps]");

/** Validates a layout object against schema/layout.schema.json; returns ajv errors (empty = valid). */
export function layoutSchemaErrors(layout: unknown): ErrorObject[] {
  const schema = JSON.parse(readFileSync("schema/layout.schema.json", "utf8"));
  const validate = new Ajv({ allErrors: true }).compile(schema);
  validate(JSON.parse(JSON.stringify(layout)));
  return validate.errors ?? [];
}
