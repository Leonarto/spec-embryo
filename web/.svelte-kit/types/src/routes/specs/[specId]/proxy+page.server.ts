// @ts-nocheck
import type { PageServerLoad } from "./$types";
import { buildSpecDetailData } from "../../../../../src/services/details.ts";
import { resolveProjectRoot } from "../../../lib/server/project-root.ts";

export const load = async ({ params }: Parameters<PageServerLoad>[0]) => {
  const rootDir = resolveProjectRoot();
  const detail = await buildSpecDetailData(rootDir, params.specId);

  return {
    detail,
  };
};
