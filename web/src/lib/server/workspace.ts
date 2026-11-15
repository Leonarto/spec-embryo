import { loadWorkspaceSource, type WorkspaceSource } from "../../../../src/services/workspace.ts";
import { resolveProjectRoot } from "./project-root.ts";

export interface WorkspaceRequestState { workspaceSource?: Promise<WorkspaceSource> }
/** Store the promise before awaiting: concurrent layout/page loaders share one read. */
export function getWorkspaceRequestSource(locals: WorkspaceRequestState, rootDir = resolveProjectRoot(), load = loadWorkspaceSource): Promise<WorkspaceSource> {
  return locals.workspaceSource ??= load(rootDir);
}
