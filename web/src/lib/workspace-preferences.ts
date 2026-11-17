export const WORKSPACE_PREFERENCES_KEY = "spm-workspace-v1";
export type RailMode = "collapsed" | "expanded";
export interface WorkspacePreferences { version: 1; rail: RailMode }

export function parseWorkspacePreferences(raw: string | null | undefined): WorkspacePreferences {
  const fallback: WorkspacePreferences = { version: 1, rail: "collapsed" };
  if (!raw) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || !("version" in value) || value.version !== 1 || !("rail" in value)) return fallback;
    return { version: 1, rail: value.rail === "expanded" ? "expanded" : "collapsed" };
  } catch { return fallback; }
}

export function isWorkspaceRoute(pathname: string, destination: string): boolean {
  return destination === "/" ? pathname === "/" : pathname === destination || pathname.startsWith(`${destination}/`);
}

export function workspaceRouteLabel(pathname: string): string {
  if (isWorkspaceRoute(pathname, "/tasks")) return "Tasks";
  if (isWorkspaceRoute(pathname, "/specs")) return "Specs";
  if (isWorkspaceRoute(pathname, "/timeline")) return "Timeline";
  return "Overview";
}
