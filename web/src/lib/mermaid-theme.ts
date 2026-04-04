export interface MermaidThemeReader {
  getPropertyValue(name: string): string;
}

export interface MermaidThemeVariables {
  primaryColor: string;
  primaryBorderColor: string;
  primaryTextColor: string;
  lineColor: string;
  tertiaryColor: string;
  background: string;
  mainBkg: string;
  nodeBorder: string;
  clusterBkg: string;
  clusterBorder: string;
  fontFamily: string;
}

function readThemeVar(reader: MermaidThemeReader, name: string, fallback: string): string {
  return reader.getPropertyValue(name).trim() || fallback;
}

export function buildMermaidThemeVariables(reader: MermaidThemeReader): MermaidThemeVariables {
  return {
    primaryColor: readThemeVar(reader, "--mermaid-node-fill", "#f5f0e6"),
    primaryBorderColor: readThemeVar(reader, "--mermaid-node-border", "#2e6a52"),
    primaryTextColor: readThemeVar(reader, "--mermaid-node-text", "#1d271f"),
    lineColor: readThemeVar(reader, "--mermaid-line", "#2e6a52"),
    tertiaryColor: readThemeVar(reader, "--mermaid-surface", "#fffdf8"),
    background: readThemeVar(reader, "--mermaid-surface", "#fffdf8"),
    mainBkg: readThemeVar(reader, "--mermaid-main-bg", "#f8f2e8"),
    nodeBorder: readThemeVar(reader, "--mermaid-node-border", "#2e6a52"),
    clusterBkg: readThemeVar(reader, "--mermaid-cluster-bg", "#f7f4ed"),
    clusterBorder: readThemeVar(reader, "--mermaid-cluster-border", "#c9bcaa"),
    fontFamily: "var(--body-font)",
  };
}
