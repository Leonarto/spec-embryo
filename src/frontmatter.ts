import { parse as parseToml } from "smol-toml";

export interface ParsedFrontmatter {
  attributes: unknown;
  body: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatTomlPrimitive(value: string | number | boolean): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatTomlValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return formatTomlPrimitive(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => formatTomlValue(item)).join(", ")}]`;
  }

  throw new Error(`Unsupported TOML value: ${String(value)}`);
}

function formatTomlSection(data: Record<string, unknown>, prefix = ""): string[] {
  const lines: string[] = [];
  const nested: Array<{ name: string; value: Record<string, unknown> }> = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }

    if (isPlainObject(value)) {
      nested.push({ name: key, value });
      continue;
    }

    lines.push(`${key} = ${formatTomlValue(value)}`);
  }

  for (const section of nested) {
    const sectionName = prefix ? `${prefix}.${section.name}` : section.name;
    lines.push("");
    lines.push(`[${sectionName}]`);
    lines.push(...formatTomlSection(section.value, sectionName));
  }

  return lines;
}

export function parseTomlFrontmatter(input: string): ParsedFrontmatter {
  const normalized = input.replace(/\r\n/g, "\n");

  if (!normalized.startsWith("+++\n")) {
    return { attributes: {}, body: normalized.trim() };
  }

  const match = normalized.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+\n?([\s\S]*)$/);

  if (!match) {
    throw new Error("Invalid TOML frontmatter. Expected opening and closing +++ fences.");
  }

  const [, rawAttributes, body = ""] = match;
  return {
    attributes: parseToml(rawAttributes),
    body: body.trim(),
  };
}

export function serializeTomlFrontmatter(attributes: Record<string, unknown>, body: string): string {
  const toml = formatTomlSection(attributes).join("\n").trimEnd();
  const trimmedBody = body.trim();
  return `+++\n${toml}\n+++\n\n${trimmedBody}\n`;
}
