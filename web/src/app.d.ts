import type { WorkspaceRequestState } from "./lib/server/workspace.ts";
declare global {
  namespace App {
    interface Locals extends WorkspaceRequestState {specAnswerOutcome?: import("./lib/server/spec-answers.ts").SpecAnswerOutcome}
    interface PageState {spmInspector?:{entryId:string}}
  }
}
export {};
