import {acceptedRelationPages,normalizeRelationPage,relationPagesKey,relationsFor,writeRelationPages,type DetailRelation,type RelationPages,type RelationWindow} from '../../../../src/services/detail-relations.ts';
import type {InspectorIdentity,WorkspaceDetailEnvelope} from '../../../../src/services/workspace-detail.ts';
import {validateDetailEnvelope,validateRelationEnvelope} from './detail-validation.ts';
export {validateDetailEnvelope,validateRelationEnvelope,validateRelationWindow} from './detail-validation.ts';
export interface RelationRequestState {pending:boolean;requestedPage:number;error?:'network'|'response'|'timeout'|'revision'}
export interface InspectorDetailState {identity?:InspectorIdentity;snapshot?:WorkspaceDetailEnvelope;desiredPages:RelationPages;relations:Partial<Record<DetailRelation,RelationRequestState>>;refreshRequired:boolean;blockedRefresh:boolean;pending:boolean;error?:'network'|'response'|'timeout';lastAttemptAt:number;lastSuccessAt:number}
interface Options {allowFullRefresh?:(candidate?:WorkspaceDetailEnvelope)=>boolean;onChange:(state:InspectorDetailState)=>void;onCanonize?:(pages:RelationPages)=>void;fetcher?:typeof fetch;now?:()=>number;deadlineMs?:number;focusDebounceMs?:number;isVisible?:()=>boolean}
const same=(a:InspectorIdentity|undefined,b:InspectorIdentity|undefined)=>a?.kind===b?.kind&&a?.id===b?.id;
/** Full snapshots are atomic; relation windows can merge only within the accepted epoch/revision. */
export class InspectorDetailResource {
 private state:InspectorDetailState={pending:false,desiredPages:{},relations:{},refreshRequired:false,blockedRefresh:false,lastAttemptAt:0,lastSuccessAt:0};
 private generation=0;private epoch=0;private sequence=0;private request?:AbortController;private timer?:ReturnType<typeof setTimeout>;private disposed=false;
 private relationSequences=new Map<DetailRelation,number>();private relationRequests=new Map<DetailRelation,AbortController>();
 constructor(private origin:string,private options:Options){}
 get current(){return this.state;}
 get snapshotEpoch(){return this.epoch;}
 private allowed(candidate?:WorkspaceDetailEnvelope){try{return !this.state.snapshot||this.options.allowFullRefresh?.(candidate)!==false;}catch{return false;}}
 private blockFull(pages=this.state.desiredPages){
  this.sequence++;this.request?.abort();this.request=undefined;
  const changed=this.state.identity?relationsFor(this.state.identity.kind).filter(name=>normalizeRelationPage(pages[name])!==normalizeRelationPage(this.state.desiredPages[name])):[];
  const relations={...this.state.relations};
  for(const name of changed){this.relationRequests.get(name)?.abort();this.relationRequests.delete(name);this.relationSequences.set(name,(this.relationSequences.get(name)??0)+1);relations[name]={pending:false,requestedPage:normalizeRelationPage(pages[name])};}
  this.publish({desiredPages:pages,relations,pending:false,blockedRefresh:true});
  for(const name of changed){const detail=this.state.snapshot?.detail;if(detail?.found&&(detail as unknown as Record<string,RelationWindow<unknown>>)[name]!.page!==normalizeRelationPage(pages[name]))void this.loadRelation(name);}
 }
 private publish(patch:Partial<InspectorDetailState>){this.state={...this.state,...patch};this.options.onChange(this.state);}
 private abortRelations(){for(const request of this.relationRequests.values())request.abort();this.relationRequests.clear();this.relationSequences.clear();}
 private canonize(snapshot:WorkspaceDetailEnvelope){const pages=acceptedRelationPages(snapshot.detail);if(!snapshot.detail.found)return;this.publish({desiredPages:pages});this.options.onCanonize?.(pages);}
 select(identity:InspectorIdentity|undefined,seed?:WorkspaceDetailEnvelope,pages:RelationPages=seed?.pages??{}){
  const changed=!same(identity,this.state.identity);
  if(!changed&&!seed){this.setPages(pages);return;}
  if(!changed&&seed&&!validateDetailEnvelope(seed,identity!,pages)){this.publish({error:'response'});return;}
  if(!changed&&seed&&validateDetailEnvelope(seed,identity!,pages)&&!this.allowed(seed)){this.blockFull(pages);return;}
  this.generation++;this.epoch++;this.sequence++;this.request?.abort();this.request=undefined;this.abortRelations();if(this.timer)clearTimeout(this.timer);
  const accepted=identity&&seed&&validateDetailEnvelope(seed,identity,pages)?seed:undefined;
  this.publish({identity,snapshot:accepted,desiredPages:pages,relations:{},refreshRequired:false,blockedRefresh:false,pending:!!identity&&!accepted,error:undefined,lastAttemptAt:accepted?(this.options.now?.()??Date.now()):0,lastSuccessAt:accepted?Date.parse(accepted.generatedAt):0});
  if(accepted)this.canonize(accepted);else if(identity)void this.refresh();
 }
 /** Reconcile URL intent even when identity is unchanged (including history traversal). */
 setPages(pages:RelationPages){
  const identity=this.state.identity;if(!identity||relationPagesKey(identity.kind,pages)===relationPagesKey(identity.kind,this.state.desiredPages))return;
  this.publish({desiredPages:pages});
  if(this.state.pending||!this.state.snapshot){void this.refresh();if(this.state.pending||!this.state.snapshot)return;}
  for(const name of relationsFor(identity.kind)){
   const desired=normalizeRelationPage(pages[name]),snapshot=this.state.snapshot;
   if(!snapshot.detail.found)continue;
   const accepted=(snapshot.detail as unknown as Record<string,RelationWindow<unknown>>)[name]!;
   if(accepted.page===desired){this.relationRequests.get(name)?.abort();this.relationRequests.delete(name);this.relationSequences.set(name,(this.relationSequences.get(name)??0)+1);this.publish({relations:{...this.state.relations,[name]:{pending:false,requestedPage:desired}}});}
   else if(this.state.relations[name]?.pending&&this.state.relations[name]?.requestedPage===desired)continue;
   else void this.loadRelation(name);
  }
 }
 private async read(url:URL,controller:AbortController):Promise<unknown>{
  let timer:ReturnType<typeof setTimeout>|undefined,abort:()=>void=()=>{};
  try{return await Promise.race([(async()=>{const response=await(this.options.fetcher??fetch)(url.href,{signal:controller.signal,cache:'no-store',headers:{accept:'application/json'}});if(response.status!==200&&response.status!==404)throw new Error('response');try{return {value:await response.json(),status:response.status};}catch{throw new Error('response');}})(),new Promise<never>((_,reject)=>{abort=()=>reject(controller.signal.reason instanceof Error?controller.signal.reason:new Error('aborted'));controller.signal.addEventListener('abort',abort,{once:true});if(controller.signal.aborted)abort();timer=setTimeout(()=>controller.abort(new Error('timeout')),this.options.deadlineMs??15000);})]);}
  finally{if(timer)clearTimeout(timer);controller.signal.removeEventListener('abort',abort);}
 }
 async loadRelation(relation:DetailRelation){
  const identity=this.state.identity,snapshot=this.state.snapshot;if(this.disposed||!identity||!snapshot?.detail.found||this.state.pending||!relationsFor(identity.kind).includes(relation))return;
  const requestedPage=normalizeRelationPage(this.state.desiredPages[relation]),generation=this.generation,epoch=this.epoch,revision=snapshot.revision,sequence=(this.relationSequences.get(relation)??0)+1;
  this.relationSequences.set(relation,sequence);this.relationRequests.get(relation)?.abort();const controller=new AbortController();this.relationRequests.set(relation,controller);
  const owned=()=>!this.disposed&&generation===this.generation&&epoch===this.epoch&&sequence===this.relationSequences.get(relation)&&same(identity,this.state.identity)&&this.state.snapshot?.revision===revision&&normalizeRelationPage(this.state.desiredPages[relation])===requestedPage;
  this.publish({relations:{...this.state.relations,[relation]:{pending:true,requestedPage}}});
  try{
   const url=new URL('/workspace-relations',this.origin);url.searchParams.set('kind',identity.kind);url.searchParams.set('id',identity.id);url.searchParams.set('relation',relation);url.searchParams.set('page',String(requestedPage));
   const {value,status}=await this.read(url,controller) as {value:unknown;status:number};
   if(!owned())return;
   if(status!==200||!validateRelationEnvelope(value,identity,relation,requestedPage))throw new Error('response');
   if(value.revision!==revision){this.publish({refreshRequired:true,relations:{...this.state.relations,[relation]:{pending:false,requestedPage,error:'revision'}}});return;}
   const next={...this.state.snapshot!,detail:{...this.state.snapshot!.detail,[relation]:value.window}} as WorkspaceDetailEnvelope;
   const pages={...this.state.desiredPages,[relation]:value.window.page};
   this.publish({snapshot:next,desiredPages:pages,relations:{...this.state.relations,[relation]:{pending:false,requestedPage:value.window.page}}});
   if(value.window.page!==requestedPage)this.options.onCanonize?.({[relation]:value.window.page});
  }catch(error){if(owned())this.publish({relations:{...this.state.relations,[relation]:{pending:false,requestedPage,error:error instanceof Error&&error.message==='timeout'?'timeout':error instanceof Error&&error.message==='response'?'response':'network'}}});}
  finally{if(this.relationRequests.get(relation)===controller)this.relationRequests.delete(relation);}
 }
 private fullWork?:Promise<void>;private fullKey='';
 /** Reject all pre-outcome work while retaining the displayed snapshot and URL intent. */
 invalidateBeforeOutcome(){this.epoch++;this.sequence++;this.request?.abort();this.request=undefined;this.abortRelations();this.fullWork=undefined;this.fullKey='';this.publish({pending:false,relations:{}});}
 refresh(reason:'manual'|'focus'='manual'):Promise<void>{
  const key=this.state.identity?JSON.stringify([this.state.identity,relationPagesKey(this.state.identity.kind,this.state.desiredPages)]):'';
  if(this.fullWork&&this.request&&!this.request.signal.aborted&&key===this.fullKey)return this.fullWork;
  this.fullKey=key;const work=this.performRefresh(reason);this.fullWork=work;void work.finally(()=>{if(this.fullWork===work){this.fullWork=undefined;this.fullKey='';}});return work;
 }
 private async performRefresh(reason:'manual'|'focus'='manual'){
  if(this.disposed||!this.state.identity||reason==='focus'&&this.state.pending)return;
  if(!this.allowed()){this.blockFull();return;}
  const identity=this.state.identity,pages={...this.state.desiredPages},generation=this.generation,epoch=++this.epoch,sequence=++this.sequence;this.request?.abort();this.abortRelations();const controller=new AbortController();this.request=controller;
  const owned=()=>!this.disposed&&generation===this.generation&&epoch===this.epoch&&sequence===this.sequence&&same(identity,this.state.identity)&&relationPagesKey(identity.kind,pages)===relationPagesKey(identity.kind,this.state.desiredPages);
  const now=()=>this.options.now?.()??Date.now();this.publish({pending:true,error:undefined,blockedRefresh:false,relations:{},lastAttemptAt:now()});
  try{
   const url=new URL('/workspace-detail',this.origin);url.searchParams.set('kind',identity.kind);url.searchParams.set('id',identity.id);writeRelationPages(url.searchParams,identity.kind,pages);
   const {value,status}=await this.read(url,controller) as {value:unknown;status:number};
   if(!owned())return;
   if(!validateDetailEnvelope(value,identity,pages)||status===404&&value.detail.found||status===200&&!value.detail.found)throw new Error('response');
   if(!this.allowed(value)){this.blockFull();return;}
   this.publish({snapshot:value,pending:false,error:undefined,refreshRequired:false,blockedRefresh:false,lastSuccessAt:now()});this.canonize(value);
  }catch(error){if(owned())this.publish({pending:false,error:error instanceof Error&&error.message==='timeout'?'timeout':error instanceof Error&&error.message==='response'?'response':'network'});}
  finally{if(this.request===controller)this.request=undefined;}
 }
 focus(){if(this.disposed||this.options.isVisible?.()===false)return;if(this.timer)clearTimeout(this.timer);this.timer=setTimeout(()=>{this.timer=undefined;if(this.options.isVisible?.()!==false&&(this.options.now?.()??Date.now())-this.state.lastAttemptAt>5000)void this.refresh('focus');},this.options.focusDebounceMs??150);}
 dispose(){this.disposed=true;this.generation++;this.epoch++;this.sequence++;this.request?.abort();this.abortRelations();if(this.timer)clearTimeout(this.timer);}
}
