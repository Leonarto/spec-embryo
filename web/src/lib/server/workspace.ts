import { createWorkspaceSource, loadWorkspaceSource, type WorkspaceSource } from "../../../../src/services/workspace.ts";
import type { UiProjectSelection } from "../../../../src/services/ui-projects.ts";

export interface WorkspaceRequestState { projectSelectionError?: boolean; projectSelection?: UiProjectSelection; workspaceSource?: Promise<WorkspaceSource>;specAnswerOutcome?:import("./spec-answers.ts").SpecAnswerOutcome }
/** Store the promise before awaiting: concurrent layout/page loaders share one read. */
export function getWorkspaceRequestSource(locals: WorkspaceRequestState, rootDir = locals.projectSelection?.root, load = loadWorkspaceSource): Promise<WorkspaceSource> {
  if (locals.workspaceSource) return locals.workspaceSource;
  const context=locals.specAnswerOutcome?.context;
  if (context) return locals.workspaceSource=Promise.resolve().then(()=>createWorkspaceSource(context));
  if (!rootDir) throw new Error("Project request selection was not resolved.");
  return locals.workspaceSource=load(rootDir);
}
