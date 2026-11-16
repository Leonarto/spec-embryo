import { createWorkspaceSource, loadWorkspaceSource, type WorkspaceSource } from "../../../../src/services/workspace.ts";
import { resolveProjectRoot } from "./project-root.ts";

export interface WorkspaceRequestState { workspaceSource?: Promise<WorkspaceSource>;specAnswerOutcome?:import("./spec-answers.ts").SpecAnswerOutcome }
/** Store the promise before awaiting: concurrent layout/page loaders share one read. */
export function getWorkspaceRequestSource(locals: WorkspaceRequestState, rootDir = resolveProjectRoot(), load = loadWorkspaceSource): Promise<WorkspaceSource> {
  const context=locals.specAnswerOutcome?.context;
  return locals.workspaceSource ??= context?Promise.resolve().then(()=>createWorkspaceSource(context)):load(rootDir);
}
