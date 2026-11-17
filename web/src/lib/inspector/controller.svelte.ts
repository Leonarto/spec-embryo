import {projectHref} from '../workspace/project.ts';
import {SpecSeedAdapter} from './spec-seed-adapter.ts';
import {provideQuestionNavigation,type QuestionRegistration} from '../components/detail/question-context.ts';
import {RelationURLCanonizer} from './relation-url.ts';
import {parseRelationPages,setRelationPage,type DetailRelation,type RelationPages} from '../../../../src/services/detail-relations.ts';
import type {RelationReader} from './relation-reader.ts';
import {workspaceURL} from '../workspace/location.svelte.ts';
import {getContext,setContext,onMount,tick,untrack} from 'svelte';
import {page} from '$app/state';
import {afterNavigate,beforeNavigate,goto,pushState,replaceState} from '$app/navigation';
import {normalizeViewQuery,type WorkspaceRoute} from '../../../../src/services/workspace-query.ts';
import type {InspectorIdentity,InspectorSection,WorkspaceDetailEnvelope} from '../../../../src/services/workspace-detail.ts';
import {InspectorDetailResource,type InspectorDetailState} from './detail-resource.ts';
import {InspectorHistoryLedger,canonicalDetailHref,inspectorURL,isPlainActivation,withoutInspector,type InspectorOpener} from './history.ts';
import {loadInspectorComponent,type DetailComponent} from './modules.ts';
import {getWorkspaceRefresh} from '../workspace/context.svelte.ts';
export interface InspectorListRegistration {navigationScope?:'page'|'expanded';kind:'task'|'spec';ids:()=>string[];capture:(id:string,columnKey:string)=>InspectorOpener;restore:(opener:InspectorOpener|undefined)=>void;focusToolbar:()=>void;focusGrid:()=>void;regionFor:(element:Element|null)=>'toolbar'|'grid'|undefined}
interface InspectorSeed {projectKey?:string;envelope:WorkspaceDetailEnvelope|null;component?:DetailComponent;moduleError?:boolean;readError?:boolean}
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
  const supplied=untrack(seed);
  const seeds=new SpecSeedAdapter(()=>seed().projectKey??'');
  const initial={...supplied,envelope:seeds.observe(supplied.envelope).seed??null},initialURL=untrack(()=>workspaceURL()),parsed=identityAt(initialURL);
  let detail=$state.raw<InspectorDetailState>({identity:parsed.identity,snapshot:initial.envelope??undefined,pending:!!parsed.identity&&!initial.envelope&&!initial.readError,error:initial.readError?'response':undefined,desiredPages:parsed.identity?parseRelationPages(parsed.identity.kind,initialURL.searchParams):{},relations:{},refreshRequired:false,blockedRefresh:false,lastAttemptAt:0,lastSuccessAt:initial.envelope?Date.parse(initial.envelope.generatedAt):0});
  let component=$state.raw<DetailComponent|undefined>(initial.component),moduleError=$state(!!initial.moduleError),modulePending=$state(false),section=$state<InspectorSection>(parsed.section);
  let navigationReady=$state(false);
  let questionEditor:QuestionRegistration|undefined;
  provideQuestionNavigation({register:editor=>{questionEditor=editor;return()=>{if(questionEditor===editor)questionEditor=undefined;};}});
  let mounted=false,resource:InspectorDetailResource|undefined,moduleGeneration=0,lastSeed=initial.envelope,lastURL=initialURL.href;
  let list=$state.raw<InspectorListRegistration>(),opener:InspectorOpener|undefined,heading:HTMLElement|undefined,reader:HTMLElement|undefined;
  let breadcrumb=$state<InspectorIdentity[]>([]),announcement=$state('');
  const refreshContext=getWorkspaceRefresh();
  const canonizer=new RelationURLCanonizer(()=>({identity:detail.identity,urlIdentity:identityAt(workspaceURL()).identity,revision:detail.snapshot?.revision,epoch:resource?.snapshotEpoch??0,pending:detail.pending,url:workspaceURL()}),url=>{const entry=ledger.verified(marker(),workspaceURL().href);if(entry)ledger.replace(entry.id,url.href);replaceState(url,{...page.state});});
  afterNavigate(navigation=>void canonizer.afterNavigation(navigation.complete).then(()=>{navigationReady=canonizer.enhanced;}));
  function pageRelation(name:DetailRelation,value:number){if(!detail.identity||detail.pending||!canonizer.enhanced)return;const url=workspaceURL();setRelationPage(url.searchParams,name,value);const entry=ledger.verified(marker(),workspaceURL().href);if(entry)ledger.replace(entry.id,url.href);replaceState(url,{...page.state});resource?.setPages(parseRelationPages(detail.identity.kind,workspaceURL().searchParams));}
  function marker(){return page.state.spmInspector?.entryId;}
  function ensureEntry(){const known=ledger.verified(marker(),workspaceURL().href);if(known)return known;const entry={id:crypto.randomUUID(),url:workspaceURL().href,opener};ledger.record(entry);replaceState(workspaceURL(),{...page.state,spmInspector:{entryId:entry.id}});return ledger.get(entry.id)!;}
  let confirmation=$state(false),confirmationError=$state('');
  type HistoryIntent={target:string;state:App.PageState};
  let pendingTransition=$state.raw<{run:()=>void|Promise<void>;generation:number;history?:HistoryIntent;label?:string}>(),transitionGeneration=0,bypass=false;
  let acceptedMarker:string|undefined,acceptedPageState:App.PageState=untrack(()=>({...page.state}));
  let restoring:{url:string;from:string;markers:Array<string|undefined>}|undefined;
  function destructive(intent:InspectorTransition){
    if(intent.type==='section')return false;
    if(intent.type==='open')return detail.identity?.kind!==intent.identity.kind||detail.identity.id!==intent.identity.id;
    if(intent.type==='close'||intent.type==='full-page')return true;
    const next=new URL(intent.url,workspaceURL());
    if(next.searchParams.get('project')!==new URL(lastURL).searchParams.get('project'))return true;
    if(next.pathname===new URL(lastURL).pathname){const old=identityAt(new URL(lastURL)).identity,current=identityAt(next).identity;if(keyOf(old)===keyOf(current))return false;}
    return true;
  }
  function queueTransition(run:()=>void|Promise<void>,history?:HistoryIntent,label?:string){pendingTransition={run,generation:++transitionGeneration,history,label};confirmation=true;confirmationError='';}
  function repairAcceptedHistory(){
    for(const id of [acceptedMarker,marker(),...(restoring?.markers??[])])ledger.invalidateProof(id);
    restoring=undefined;replaceState(new URL(lastURL),{...acceptedPageState});
  }
  function coalesceHistory(target:string,state:App.PageState){
    repairAcceptedHistory();queueTransition(()=>replaceState(new URL(target),{...state}),{target,state});
  }
  function allowTransition(intent:InspectorTransition){return bypass||!questionEditor?.protected()||!destructive(intent);}
  async function resolveQuestionTransition(choice:'keep'|'discard'|'save'){
    if(restoring){const intended=pendingTransition?.history;repairAcceptedHistory();if(intended)queueTransition(()=>replaceState(new URL(intended.target),{...intended.state}),intended);}
    const pending=pendingTransition;if(!pending)return;
    if(choice==='keep'){pendingTransition=undefined;confirmation=false;return;}
    if(questionEditor?.saving()){confirmationError='Wait for the current save to finish.';return;}
    if(choice==='save'&&questionEditor?.protected()&&!await questionEditor.save()){if(pending===pendingTransition)confirmationError='Answers were not fully saved. Review errors and recovered answers before leaving.';return;}
    if(pending!==pendingTransition)return;
    if(choice==='discard')questionEditor?.discard();
    pendingTransition=undefined;confirmation=false;bypass=true;try{await pending.run();}finally{bypass=false;}
  }
  async function transition(intent:InspectorTransition){
    if(!allowTransition(intent)){queueTransition(()=>transition(intent),undefined,intent.type==='open'?`Open ${intent.identity.id}`:intent.type==='close'?'Close inspector':'url' in intent?intent.url:'Change section');return;}
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
    if(restoring){
      if(url.href===restoring.url){restoring=undefined;lastURL=url.href;acceptedMarker=marker();acceptedPageState={...page.state};}
      else if(url.href!==restoring.from)coalesceHistory(url.href,{...page.state});
      return;
    }
    if(!allowTransition({type:'history',url:url.href})){
      const target=url.href,previousURL=lastURL,previousMarker=acceptedMarker,targetMarker=marker(),state={...page.state};
      const previous=ledger.verified(previousMarker,previousURL),destination=ledger.verified(targetMarker,target),delta=previous&&destination?ledger.delta(previousMarker,targetMarker):undefined;
      if(delta!==undefined&&delta!==0){restoring={url:previousURL,from:target,markers:[previousMarker,targetMarker]};history.go(-delta);queueTransition(()=>{history.go(delta);},{target,state});}
      else coalesceHistory(target,state);
      return;
    }
    const next=identityAt(url),previous=detail.identity,changed=keyOf(next.identity)!==keyOf(previous),fresh=currentSeed.envelope!==lastSeed;
    const observation=seeds.observe(currentSeed.envelope),unseen=observation.fresh;
    lastSeed=currentSeed.envelope;
    section=next.section;let selectedSeed=false;
    if(changed||fresh&&unseen&&next.identity&&keyOf(currentSeed.envelope??undefined)===keyOf(next.identity)){
      const accepted=next.identity&&observation.seed&&keyOf(observation.seed)===keyOf(next.identity)&&fresh&&unseen?observation.seed:undefined;
      selectedSeed=!!accepted;
      if(next.identity){if(changed&&reader){reader.scrollTop=0;reader.scrollLeft=0;}const entry=ledger.verified(marker(),url.href);if(entry?.opener)opener=entry.opener;resource?.select(next.identity,accepted,parseRelationPages(next.identity.kind,url.searchParams));if(!accepted&&fresh&&currentSeed.envelope&&observation.fenced)void resource?.refresh();if(changed||!component&&!modulePending)void loadComponent(next.identity,accepted?currentSeed.component:undefined,!!accepted&&!!currentSeed.moduleError);if(changed)void tick().then(()=>{if(keyOf(detail.identity)===keyOf(next.identity))heading?.focus({preventScroll:true});});}
      else {resource?.select(undefined);moduleGeneration++;component=undefined;modulePending=false;moduleError=false;breadcrumb=[];if(previous)void tick().then(()=>list?.restore(opener));}
    }
    const currentURL=workspaceURL(),currentIdentity=identityAt(currentURL).identity;
    if(currentIdentity&&keyOf(currentIdentity)===keyOf(resource?.current.identity)&&(canonizer.enhanced||!selectedSeed))resource?.setPages(parseRelationPages(currentIdentity.kind,currentURL.searchParams));
    lastURL=currentURL.href;acceptedMarker=marker();acceptedPageState={...page.state};
  }
  beforeNavigate(navigation=>{const url=navigation.to?.url.href;if(!url)return;if(!allowTransition({type:'route',url})){navigation.cancel();queueTransition(()=>goto(url),undefined,url);}});
  onMount(()=>{
    mounted=true;canonizer.mount();navigationReady=canonizer.enhanced;resource=new InspectorDetailResource(workspaceURL().origin,{workspaceURL:workspaceURL().href,projectKey:seed().projectKey,allowFullRefresh:candidate=>questionEditor?.accept(candidate)??true,onChange:next=>detail=next,onCanonize:pages=>canonizer.enqueue(pages),isVisible:()=>document.visibilityState==='visible'});
    if(parsed.identity){resource.select(parsed.identity,initial.envelope??undefined,parseRelationPages(parsed.identity.kind,initialURL.searchParams));void loadComponent(parsed.identity,initial.component,!!initial.moduleError);void tick().then(()=>{if(mounted&&document.activeElement===document.body)heading?.focus({preventScroll:true});});}
    acceptedMarker=marker();acceptedPageState={...page.state};
    const unload=(event:BeforeUnloadEvent)=>{if(!bypass&&questionEditor?.protected()){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',unload);
    const focus=()=>resource?.focus();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
    const unregister=refreshContext.registerInspectorRefresh(()=>resource?.refresh()??Promise.resolve());
    return ()=>{window.removeEventListener('beforeunload',unload);mounted=false;canonizer.dispose();moduleGeneration++;resource?.dispose();unregister();window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
  });
  $effect(()=>{const currentSeed=seed(),href=workspaceURL().href;untrack(()=>{if(mounted&&(href!==lastURL||currentSeed.envelope!==lastSeed||restoring))acceptURL(new URL(href),currentSeed);});});
  const controller={
    get identity(){return detail.identity;},get section(){return section;},get state(){return detail;},get component(){return component;},get moduleError(){return moduleError;},get pending(){return detail.pending||modulePending;},get breadcrumb(){return breadcrumb;},get announcement(){return announcement;},
    get confirmation(){return confirmation;},get confirmationError(){return confirmationError;},get confirmationDestination(){const pending=pendingTransition;if(pending?.history){const url=new URL(pending.history.target);return url.pathname+url.search+url.hash;}return pending?.label??'Leave this spec';},get questionSaving(){return questionEditor?.saving()??false;},resolveQuestionTransition,
    get projectKey(){return seed().projectKey??'';},
    registerQuestionEditor(editor:QuestionRegistration){questionEditor=editor;return()=>{if(questionEditor===editor)questionEditor=undefined;};},
    invalidateBeforeOutcome(){resource?.invalidateBeforeOutcome();},
    refreshDetails(){return resource?.refresh()??Promise.resolve();},
    get relationReader():RelationReader{return {url:workspaceURL().href,state:detail,enhanced:navigationReady,page:pageRelation,retry:name=>void resource?.loadRelation(name)};},
    get hasList(){return !!list;},
    get navigationScope():'page'|'expanded'{return list?.navigationScope??'page';},
    get hasMatchingList(){return !!list&&list.kind===detail.identity?.kind;},
    get visibleIds(){return list&&list.kind===detail.identity?.kind?list.ids():[];},
    registerList(value:InspectorListRegistration){list=value;return ()=>{if(list===value)list=undefined;};},
    bindElements(nextHeading:HTMLElement|undefined,nextReader:HTMLElement|undefined){heading=nextHeading;reader=nextReader;},
    switchProject:(url:string)=>{if(!allowTransition({type:'route',url})){queueTransition(()=>{window.location.href=url;},undefined,url);return;}window.location.href=url;},
    transition,open:(identity:InspectorIdentity,nextOpener?:InspectorOpener)=>transition({type:'open',identity,opener:nextOpener}),close:()=>transition({type:'close'}),setSection:(next:InspectorSection)=>transition({type:'section',section:next}),
    fullPage:(href?:string)=>detail.identity?transition({type:'full-page',url:href??projectHref(canonicalDetailHref(detail.identity),workspaceURL())}):Promise.resolve(),
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
