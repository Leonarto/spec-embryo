import type { PageServerLoad } from "./$types";
import { buildTaskDetailFromContext } from "../../../../../src/services/details.ts";
import { getWorkspaceRequestSource } from "../../../lib/server/workspace.ts";

export const load: PageServerLoad = async ({ params, locals }) => {
  const source = await getWorkspaceRequestSource(locals);
  const detail = buildTaskDetailFromContext(source.context, params.taskId, source.analysis);

  return {
    detail,
  };
};
