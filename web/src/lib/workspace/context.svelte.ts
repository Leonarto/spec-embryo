import { getContext, setContext } from "svelte";
import type { WorkspaceEnvelope } from "../../../../src/services/workspace.ts";
import type { WorkspaceResourceState } from "./resource.ts";

interface Registration { state:WorkspaceResourceState; refresh:()=>Promise<void> }
const key=Symbol('workspace-refresh');
export function provideWorkspaceRefresh(){
  let active=$state.raw<Registration>();
  const context={
    get active(){return active;},
    register(registration:Registration){active=registration;return ()=>{if(active===registration)active=undefined;};},
  };
  setContext(key,context);return context;
}
export type WorkspaceRefreshContext=ReturnType<typeof provideWorkspaceRefresh>;
export function getWorkspaceRefresh(){return getContext<WorkspaceRefreshContext>(key);}
export type {WorkspaceEnvelope};
