import { getContext, setContext } from "svelte";
import type { WorkspaceEnvelope } from "../../../../src/services/workspace.ts";
import type { WorkspaceResourceState } from "./resource.ts";

interface Registration { state:WorkspaceResourceState; refresh:()=>Promise<void> }
const key=Symbol('workspace-refresh');
export function provideWorkspaceRefresh(){
  let active=$state.raw<Registration>();
  let inspectorRefresh:(()=>Promise<void>)|undefined;
  const context={
    get active(){return active;},
    registerInspectorRefresh(refresh:()=>Promise<void>){inspectorRefresh=refresh;return ()=>{if(inspectorRefresh===refresh)inspectorRefresh=undefined;};},
    refreshInspector(){return inspectorRefresh?.()??Promise.resolve();},
    register(registration:Registration){active=registration;return ()=>{if(active===registration)active=undefined;};},
  };
  setContext(key,context);return context;
}
export type WorkspaceRefreshContext=ReturnType<typeof provideWorkspaceRefresh>;
export function getWorkspaceRefresh(){return getContext<WorkspaceRefreshContext>(key);}
export type {WorkspaceEnvelope};
