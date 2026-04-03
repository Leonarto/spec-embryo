import type { PageServerLoad } from "./$types";
import { buildTaskDetailData } from "../../../../../src/services/details.ts";
import { resolveProjectRoot } from "../../../lib/server/project-root.ts";

export const load: PageServerLoad = async ({ params }) => {
  const rootDir = resolveProjectRoot();
  const detail = await buildTaskDetailData(rootDir, params.taskId);

  return {
    detail,
  };
};
