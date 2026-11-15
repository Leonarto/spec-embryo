import type { WorkspaceRequestState } from "./lib/server/workspace.ts";
declare global {
  namespace App {
    interface Locals extends WorkspaceRequestState {}
  }
}
export {};
