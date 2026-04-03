import type { LayoutServerLoad } from "./$types";
import { buildDashboardData } from "../../../src/services/dashboard.ts";
import { resolveProjectRoot } from "../lib/server/project-root.ts";

export const load: LayoutServerLoad = async () => {
  const rootDir = resolveProjectRoot();
  const dashboard = await buildDashboardData(rootDir);

  return {
    dashboard,
  };
};
