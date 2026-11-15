import type { PageServerLoad } from "./$types";
import { buildWorkspaceEnvelope } from "../../../../src/services/workspace.ts";
import { getWorkspaceRequestSource } from "../../lib/server/workspace.ts";
export const load:PageServerLoad=async({locals,url})=>({workspace:await buildWorkspaceEnvelope(await getWorkspaceRequestSource(locals),'timeline',url.searchParams)});
