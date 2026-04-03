// @ts-nocheck
import type { LayoutServerLoad } from "./$types";
import { buildDashboardData } from "../../../src/services/dashboard.ts";
import { resolveProjectRoot } from "../lib/server/project-root.ts";

export const load = async () => {
  const rootDir = resolveProjectRoot();
  const dashboard = await buildDashboardData(rootDir);

  return {
    dashboard,
  };
};
;null as any as LayoutServerLoad;