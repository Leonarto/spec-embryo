import { describe, expect, test } from "bun:test";
import { buildMermaidThemeVariables } from "../web/src/lib/mermaid-theme.ts";

function makeReader(values: Record<string, string>) {
  return {
    getPropertyValue(name: string) {
      return values[name] ?? "";
    },
  };
}

describe("mermaid theme helper", () => {
  test("builds Mermaid theme variables from shared CSS tokens", () => {
    const reader = makeReader({
      "--mermaid-node-fill": "#20312b",
      "--mermaid-node-border": "#4bcf97",
      "--mermaid-node-text": "#e8e0d1",
      "--mermaid-line": "#79ddb2",
      "--mermaid-surface": "#141d21",
      "--mermaid-main-bg": "#182329",
      "--mermaid-cluster-bg": "#10181c",
      "--mermaid-cluster-border": "#3b584b",
    });

    expect(buildMermaidThemeVariables(reader)).toEqual({
      primaryColor: "#20312b",
      primaryBorderColor: "#4bcf97",
      primaryTextColor: "#e8e0d1",
      lineColor: "#79ddb2",
      tertiaryColor: "#141d21",
      background: "#141d21",
      mainBkg: "#182329",
      nodeBorder: "#4bcf97",
      clusterBkg: "#10181c",
      clusterBorder: "#3b584b",
      fontFamily: "var(--body-font)",
    });
  });

  test("falls back to the default light palette when tokens are missing", () => {
    const reader = makeReader({});
    const theme = buildMermaidThemeVariables(reader);

    expect(theme.primaryColor).toBe("#f5f0e6");
    expect(theme.background).toBe("#fffdf8");
    expect(theme.clusterBorder).toBe("#c9bcaa");
    expect(theme.fontFamily).toBe("var(--body-font)");
  });
});
