import type { LayoutServerLoad } from "./$types";
import { buildDashboardData, type DashboardTimeWindow } from "../../../src/services/dashboard.ts";
import { resolveProjectRoot } from "../lib/server/project-root.ts";

const timeWindows = new Set<DashboardTimeWindow>(["7d", "30d", "90d"]);

function parseSelectedSpecIds(searchParams: URLSearchParams): string[] {
  const fromRepeated = searchParams.getAll("spec");
  if (fromRepeated.length > 0) {
    return fromRepeated.flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean);
  }

  const fromSingle = searchParams.get("spec");
  if (!fromSingle) {
    return [];
  }

  return fromSingle.split(",").map((value) => value.trim()).filter(Boolean);
}

function parseTimeWindow(searchParams: URLSearchParams): DashboardTimeWindow | undefined {
  const value = searchParams.get("window");
  if (!value || !timeWindows.has(value as DashboardTimeWindow)) {
    return undefined;
  }

  return value as DashboardTimeWindow;
}

export const load: LayoutServerLoad = async ({ url }) => {
  const rootDir = resolveProjectRoot();
  const dashboard = await buildDashboardData(rootDir, {
    selectedSpecIds: parseSelectedSpecIds(url.searchParams),
    timeWindow: parseTimeWindow(url.searchParams),
  });

  return {
    dashboard,
  };
};
