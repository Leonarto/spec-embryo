import {workspaceURL} from '../workspace/location.svelte.ts';
import {getContext,setContext,onMount,tick,untrack} from 'svelte';
import {page} from '$app/state';
import {beforeNavigate,goto,pushState,replaceState} from '$app/navigation';
import {normalizeViewQuery,type WorkspaceRoute} from '../../../../src/services/workspace-query.ts';
import type {InspectorIdentity,InspectorSection,WorkspaceDetailEnvelope} from '../../../../src/services/workspace-detail.ts';
import {InspectorDetailResource,type InspectorDetailState} from './detail-resource.ts';
import {InspectorHistoryLedger,canonicalDetailHref,inspectorURL,isPlainActivation,withoutInspector,type InspectorOpener} from './history.ts';
import {loadInspectorComponent,type DetailComponent} from './modules.ts';
import {getWorkspaceRefresh} from '../workspace/context.svelte.ts';
export interface InspectorListRegistration {kind:'task'|'spec';ids:()=>string[];capture:(id:string,columnKey:string)=>InspectorOpener;restore:(opener:InspectorOpener|undefined)=>void;focusToolbar:()=>void;focusGrid:()=>void;regionFor:(element:Element|null)=>'toolbar'|'grid'|undefined}
interface InspectorSeed {envelope:WorkspaceDetailEnvelope|null;component?:DetailComponent;moduleError?:boolean;readError?:boolean}
export type InspectorTransition={type:'open';identity:InspectorIdentity;opener?:InspectorOpener}|{type:'close'}|{type:'section';section:InspectorSection}|{type:'full-page'|'route'|'history';url:string};
const contextKey=Symbol('workspace-inspector');
const ledger=new InspectorHistoryLedger(); // Only browser lifecycle methods write this session ledger.
function identityAt(url:URL):{identity?:InspectorIdentity;section:InspectorSection}{
  if(!['/tasks','/specs','/timeline'].includes(url.pathname))return {section:'overview'};
  const view=normalizeViewQuery(url.pathname.slice(1) as WorkspaceRoute,url.searchParams);
  return {identity:view.inspect,section:(view.section??'overview') as InspectorSection};
}
const keyOf=(identity:InspectorIdentity|undefined)=>identity?`${identity.kind}:${identity.id}`:'';
export function provideInspector(seed:()=>InspectorSeed){
  const initial=untrack(seed),initialURL=untrack(()=>workspaceURL()),parsed=identityAt(initialURL);
  let detail=$state.raw<InspectorDetailState>({identity:parsed.identity,snapshot:initial.envelope??undefined,pending:!!parsed.identity&&!initial.envelope&&!initial.readError,error:initial.readError?'response':undefined,lastAttemptAt:0,lastSuccessAt:initial.envelope?Date.parse(initial.envelope.generatedAt):0});
  let component=$state.raw<DetailComponent|undefined>(initial.component),moduleError=$state(!!initial.moduleError),modulePending=$state(false),section=$state<InspectorSection>(parsed.section);
  const observedSeeds=new WeakSet<WorkspaceDetailEnvelope>();if(initial.envelope)observedSeeds.add(initial.envelope);
  let mounted=false,resource:InspectorDetailResource|undefined,moduleGeneration=0,lastSeed=initial.envelope,lastURL=initialURL.href;
  let list=$state.raw<InspectorListRegistration>(),opener:InspectorOpener|undefined,heading:HTMLElement|undefined,reader:HTMLElement|undefined;
  let breadcrumb=$state<InspectorIdentity[]>([]),announcement=$state('');
  const refreshContext=getWorkspaceRefresh();
  function marker(){return page.state.spmInspector?.entryId;}
  function ensureEntry(){const known=ledger.verified(marker(),workspaceURL().href);if(known)return known;const entry={id:crypto.randomUUID(),url:workspaceURL().href,opener};ledger.record(entry);replaceState(workspaceURL(),{...page.state,spmInspector:{entryId:entry.id}});return ledger.get(entry.id)!;}
  /** Read-only today;129 adds the actual dirty/saving policy at this single seam. */
  function allowTransition(_transition:InspectorTransition):boolean{return true;}
  async function transition(intent:InspectorTransition){
    if(!allowTransition(intent))return;
    if(intent.type==='open'){
      const current=identityAt(workspaceURL()).identity;
      if(!current){opener=intent.opener??list?.capture(intent.identity.id,'id');const base=ensureEntry(),id=crypto.randomUUID(),url=inspectorURL(workspaceURL(),intent.identity);ledger.record({id,url,predecessor:{id:base.id,url:workspaceURL().href},opener});pushState(url,{...page.state,spmInspector:{entryId:id}});breadcrumb=[];}
      else {const entry=ensureEntry(),url=inspectorURL(workspaceURL(),intent.identity);if(keyOf(current)!==keyOf(intent.identity))breadcrumb=[...breadcrumb,current];ledger.replace(entry.id,url);replaceState(url,{...page.state,spmInspector:{entryId:entry.id}});}
      await tick();heading?.focus({preventScroll:true});return;
    }
    if(intent.type==='close'){
      if(!identityAt(workspaceURL()).identity)return;
      if(ledger.canBackClose(marker(),workspaceURL().href))history.back();
      else {const url=withoutInspector(workspaceURL()),entry=ledger.verified(marker(),workspaceURL().href);if(entry)ledger.replace(entry.id,url);replaceState(url,{...page.state});}
      return;
    }
    if(intent.type==='section'){
      const identity=identityAt(workspaceURL()).identity;if(!identity)return;
      const entry=ensureEntry(),url=inspectorURL(workspaceURL(),identity,intent.section);ledger.replace(entry.id,url);replaceState(url,{...page.state,spmInspector:{entryId:entry.id}});await tick();scrollSection(intent.section);return;
    }
    if(intent.type==='full-page'||intent.type==='route')await goto(intent.url);
  }
  function scrollSection(next:InspectorSection){const target=reader?.querySelector<HTMLElement>(`[data-detail-section="${next}"]`);if(target&&reader)reader.scrollTop+=target.getBoundingClientRect().top-reader.getBoundingClientRect().top;}
  async function loadComponent(identity:InspectorIdentity,seedComponent?:DetailComponent,seedError=false){
    const generation=++moduleGeneration;component=seedComponent;moduleError=seedError;modulePending=!seedComponent&&!seedError;
    if(seedComponent||seedError)return;
    try{const resolved=await loadInspectorComponent(identity.kind);if(mounted&&generation===moduleGeneration&&keyOf(identity)===keyOf(detail.identity)){component=resolved;modulePending=false;}}
    catch{if(mounted&&generation===moduleGeneration&&keyOf(identity)===keyOf(detail.identity)){moduleError=true;modulePending=false;}}
  }
  function acceptURL(url:URL,currentSeed:InspectorSeed){
    if(!allowTransition({type:'history',url:url.href}))return;
    const next=identityAt(url),previous=detail.identity,changed=keyOf(next.identity)!==keyOf(previous),fresh=currentSeed.envelope!==lastSeed;
    const unseen=!!currentSeed.envelope&&!observedSeeds.has(currentSeed.envelope);
    if(currentSeed.envelope)observedSeeds.add(currentSeed.envelope);
    lastSeed=currentSeed.envelope;
    section=next.section;
    if(changed||fresh&&unseen&&next.identity&&keyOf(currentSeed.envelope??undefined)===keyOf(next.identity)){
      const accepted=next.identity&&currentSeed.envelope&&keyOf(currentSeed.envelope)===keyOf(next.identity)&&fresh&&unseen?currentSeed.envelope:undefined;
      if(next.identity){if(changed&&reader){reader.scrollTop=0;reader.scrollLeft=0;}const entry=ledger.verified(marker(),url.href);if(entry?.opener)opener=entry.opener;resource?.select(next.identity,accepted);void loadComponent(next.identity,accepted?currentSeed.component:undefined,!!accepted&&!!currentSeed.moduleError);if(changed)void tick().then(()=>{if(keyOf(detail.identity)===keyOf(next.identity))heading?.focus({preventScroll:true});});}
      else {resource?.select(undefined);moduleGeneration++;component=undefined;modulePending=false;moduleError=false;breadcrumb=[];if(previous)void tick().then(()=>list?.restore(opener));}
    }
    lastURL=url.href;
  }
  beforeNavigate(navigation=>{if(!allowTransition({type:'route',url:navigation.to?.url.href??''}))navigation.cancel();});
  onMount(()=>{
    mounted=true;resource=new InspectorDetailResource(workspaceURL().origin,{onChange:next=>detail=next,isVisible:()=>document.visibilityState==='visible'});
    if(parsed.identity){resource.select(parsed.identity,initial.envelope??undefined);void loadComponent(parsed.identity,initial.component,!!initial.moduleError);void tick().then(()=>{if(mounted&&document.activeElement===document.body)heading?.focus({preventScroll:true});});}
    const focus=()=>resource?.focus();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
    const unregister=refreshContext.registerInspectorRefresh(()=>resource?.refresh()??Promise.resolve());
    return ()=>{mounted=false;moduleGeneration++;resource?.dispose();unregister();window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
  });
  $effect(()=>{const currentSeed=seed(),href=workspaceURL().href;untrack(()=>{if(mounted&&(href!==lastURL||currentSeed.envelope!==lastSeed))acceptURL(new URL(href),currentSeed);});});
  const controller={
    get identity(){return detail.identity;},get section(){return section;},get state(){return detail;},get component(){return component;},get moduleError(){return moduleError;},get pending(){return detail.pending||modulePending;},get breadcrumb(){return breadcrumb;},get announcement(){return announcement;},
    get hasList(){return !!list;},
    get hasMatchingList(){return !!list&&list.kind===detail.identity?.kind;},
    get visibleIds(){return list&&list.kind===detail.identity?.kind?list.ids():[];},
    registerList(value:InspectorListRegistration){list=value;return ()=>{if(list===value)list=undefined;};},
    bindElements(nextHeading:HTMLElement|undefined,nextReader:HTMLElement|undefined){heading=nextHeading;reader=nextReader;},
    transition,open:(identity:InspectorIdentity,nextOpener?:InspectorOpener)=>transition({type:'open',identity,opener:nextOpener}),close:()=>transition({type:'close'}),setSection:(next:InspectorSection)=>transition({type:'section',section:next}),
    fullPage:(href?:string)=>detail.identity?transition({type:'full-page',url:href??canonicalDetailHref(detail.identity)}):Promise.resolve(),
    activate(event:MouseEvent,identity:InspectorIdentity,columnKey='id'){if(!isPlainActivation(event))return;event.preventDefault();void transition({type:'open',identity,opener:list?.capture(identity.id,columnKey)});},
    retry(){if(detail.identity){if(moduleError)void loadComponent(detail.identity);void resource?.refresh();}},
    regionFor(element:Element|null){return list?.regionFor(element);},
    focusHeading(){heading?.focus({preventScroll:true});},focusToolbar(){list?.focusToolbar();},focusGrid(){list?.focusGrid();},scrollSection,
    announce(message:string){announcement=message;},
  };
  setContext(contextKey,controller);return controller;
}
export type InspectorController=ReturnType<typeof provideInspector>;
export function getInspector(){return getContext<InspectorController>(contextKey);}
