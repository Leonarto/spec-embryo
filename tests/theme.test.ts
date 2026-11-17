import { describe, expect, test } from "bun:test";
import { normalizeColorMode, resolveTheme } from "../web/src/lib/theme.ts";

describe("theme helpers", () => {
  test("normalizes unknown values to system", () => {
    expect(normalizeColorMode("dark")).toBe("dark");
    expect(normalizeColorMode("light")).toBe("light");
    expect(normalizeColorMode("system")).toBe("system");
    expect(normalizeColorMode("weird")).toBe("system");
    expect(normalizeColorMode(null)).toBe("system");
  });

  test("resolves system mode to dark when preference is unavailable", () => {
    expect(resolveTheme("system", null)).toBe("dark");
    expect(resolveTheme("system", undefined)).toBe("dark");
  });

  test("resolves explicit and system themes correctly", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
