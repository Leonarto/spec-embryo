export const COLOR_MODES = ["system", "dark", "light"] as const;
export const THEME_STORAGE_KEY = "spm-color-mode";

export type ColorMode = (typeof COLOR_MODES)[number];
export type ResolvedTheme = "dark" | "light";

export function normalizeColorMode(value: string | null | undefined): ColorMode {
  if (value === "dark" || value === "light" || value === "system") {
    return value;
  }

  return "system";
}

export function resolveTheme(mode: ColorMode, prefersDark: boolean | null | undefined): ResolvedTheme {
  if (mode === "dark" || mode === "light") {
    return mode;
  }

  if (prefersDark === false) {
    return "light";
  }

  return "dark";
}
