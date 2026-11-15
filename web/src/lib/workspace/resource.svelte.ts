import {workspaceURL} from './location.svelte.ts';
import { onMount, untrack, tick } from "svelte";
import type { WorkspaceEnvelope } from "../../../../src/services/workspace.ts";
import {workspaceRequestKey,type WorkspaceRoute} from "../../../../src/services/workspace-query.ts";
import { WorkspaceResource, type WorkspaceResourceState } from "./resource.ts";
import { getWorkspaceRefresh } from "./context.svelte.ts";

export function useWorkspaceResource<Route extends WorkspaceRoute>(seed:()=>WorkspaceEnvelope<Route>){
  let state=$state.raw<WorkspaceResourceState<WorkspaceEnvelope<Route>>>({snapshot:seed(),pending:false,lastSuccessAt:Date.parse(seed().generatedAt),lastAttemptAt:0});
  let resource:WorkspaceResource<WorkspaceEnvelope<Route>>|undefined;
  let mounted=false;
  let appliedSeed=untrack(seed);
  const shell=getWorkspaceRefresh();
  const registration={get state(){return state;},refresh:async()=>{await Promise.all([resource?.refresh(),shell.refreshInspector()]);}};
  let unregister:(()=>void)|undefined;
  function preserveFocusedEntity(){
    const active=document.activeElement instanceof HTMLElement?document.activeElement:null;
    if(active?.closest('[data-table-grid]'))return ()=>{}; // The grid restores its own row/column target.
    const card=active?.closest<HTMLElement>('[data-entity-id]');
    if(!card)return ()=>{};
    const identity=card.dataset.entityId!;
    const siblings=Array.from(document.querySelectorAll<HTMLElement>('[data-entity-id]'));
    const index=siblings.findIndex(el=>el.dataset.entityId===identity);
    return ()=>{
      if(document.activeElement!==document.body||active?.isConnected)return;
      const remaining=Array.from(document.querySelectorAll<HTMLElement>('[data-entity-id]'));
      const same=remaining.find(el=>el.dataset.entityId===identity);
      const nearest=same??remaining[Math.min(index,remaining.length-1)];
      const target=nearest?.querySelector<HTMLElement>('a,button,input')??document.querySelector<HTMLElement>('.view-toolbar h1');
      if(target&&!target.matches('a,button,input,select,textarea,[tabindex]'))target.setAttribute('tabindex','-1');
      target?.focus({preventScroll:true});
      const announcement=document.querySelector<HTMLElement>('[data-workspace-announcement]');
      if(announcement&&!same)announcement.textContent=`${identity} ya no está en esta página. Foco restaurado.`;
    };
  }
  onMount(()=>{
    mounted=true;
    resource=new WorkspaceResource(seed(),workspaceURL().href,{isVisible:()=>document.visibilityState==='visible',onChange:next=>{
      const changed=next.snapshot!==state.snapshot;
      const restore=changed?preserveFocusedEntity():()=>{};
      const pane=changed?document.querySelector<HTMLElement>('.view-frame'):null;
      const top=pane?.scrollTop??0,left=pane?.scrollLeft??0;
      state=next;
      void tick().then(()=>{
        if(!mounted||shell.active!==registration||state.snapshot!==next.snapshot)return;
        if(pane){pane.scrollTop=top;pane.scrollLeft=left;}
        restore();
      });
    }});
    state=resource.current;unregister=shell.register(registration);
    const focus=()=>resource?.focus();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
    return ()=>{mounted=false;resource?.dispose();unregister?.();window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
  });
  $effect(()=>{const initial=seed(),url=workspaceURL().href;untrack(()=>{
    const key=workspaceRequestKey(initial.route,new URL(url).searchParams);
    if(resource){if(initial!==appliedSeed&&initial.requestKey===key){appliedSeed=initial;resource.seed(initial,url);}else if(state.snapshot.requestKey===key)resource.retarget(url);}
    else {appliedSeed=initial;state={snapshot:initial,pending:false,lastSuccessAt:Date.parse(initial.generatedAt),lastAttemptAt:0};}
  });});
  return {get snapshot(){return state.snapshot;},get pending(){return state.pending;}};
}
