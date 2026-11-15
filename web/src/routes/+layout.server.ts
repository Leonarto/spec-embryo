import type { LayoutServerLoad } from "./$types";
import { buildWorkspaceShell } from "../../../src/services/workspace.ts";
import { getWorkspaceRequestSource } from "../lib/server/workspace.ts";

export const load: LayoutServerLoad = async ({locals}) => ({shell:buildWorkspaceShell(await getWorkspaceRequestSource(locals))});
