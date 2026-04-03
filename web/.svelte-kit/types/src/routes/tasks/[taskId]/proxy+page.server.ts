// @ts-nocheck
import type { PageServerLoad } from "./$types";
import { buildTaskDetailData } from "../../../../../src/services/details.ts";
import { resolveProjectRoot } from "../../../lib/server/project-root.ts";

export const load = async ({ params }: Parameters<PageServerLoad>[0]) => {
  const rootDir = resolveProjectRoot();
  const detail = await buildTaskDetailData(rootDir, params.taskId);

  return {
    detail,
  };
};
