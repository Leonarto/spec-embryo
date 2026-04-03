// @ts-nocheck
import type { LayoutServerLoad } from "./$types";
import { buildDashboardData, type DashboardTimeWindow, type DashboardTimelineMode } from "../../../src/services/dashboard.ts";
import { resolveProjectRoot } from "../lib/server/project-root.ts";

const timeWindows = new Set<DashboardTimeWindow>(["7d", "30d", "90d"]);
const timelineModes = new Set<DashboardTimelineMode>(["active", "all"]);

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

function parseTimelineMode(searchParams: URLSearchParams): DashboardTimelineMode | undefined {
  const value = searchParams.get("timeline_mode");
  if (!value || !timelineModes.has(value as DashboardTimelineMode)) {
    return undefined;
  }

  return value as DashboardTimelineMode;
}

export const load = async ({ url }: Parameters<LayoutServerLoad>[0]) => {
  const rootDir = resolveProjectRoot();
  const dashboard = await buildDashboardData(rootDir, {
    selectedSpecIds: parseSelectedSpecIds(url.searchParams),
    timeWindow: parseTimeWindow(url.searchParams),
    timelineMode: parseTimelineMode(url.searchParams),
  });

  return {
    dashboard,
  };
};
