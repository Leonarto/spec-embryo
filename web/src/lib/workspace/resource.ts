import { SPEC_STATUSES, TASK_STATUSES } from "../../../../src/domain.ts";
import type { WorkspaceEnvelope } from "../../../../src/services/workspace.ts";
import { TASK_SORT_KEYS, SPEC_SORT_KEYS } from "../../../../src/services/workspace-query.ts";

export interface WorkspaceResourceState<Envelope extends WorkspaceEnvelope = WorkspaceEnvelope> {
  snapshot: Envelope; pending: boolean; error?: "network" | "response" | "timeout";
  lastSuccessAt: number; lastAttemptAt: number;
}
type Fetcher = (input:string,init:RequestInit)=>Promise<Response>;
interface Options<Envelope extends WorkspaceEnvelope> {
  fetcher?: Fetcher; now?:()=>number; deadlineMs?:number; focusDebounceMs?:number;
  isVisible?:()=>boolean; onChange:(state:WorkspaceResourceState<Envelope>)=>void;
}
const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
const integer=(v:unknown,min=0)=>finite(v)&&Number.isInteger(v)&&(v as number)>=min;
const scopes=['all','archived','unarchived'];
function option(v:unknown):boolean{return object(v)&&typeof v.id==='string'&&SPEC_STATUSES.includes(v.status as never)&&(typeof v.title==='string'||v.labelOmitted===true&&v.reason==='title-budget');}
function filters(v:unknown):boolean {
  if(!object(v)||!strings(v.selectedSpecIds)||!strings(v.unavailableSpecIds)||typeof v.hasActiveFilters!=='boolean'||typeof v.includesArchived!=='boolean'||typeof v.legacyArchive!=='boolean'||!['all','archived','unarchived'].includes(v.scope as string)||!object(v.options))return false;
  const o=v.options;return Array.isArray(o.options)&&o.options.length<=100&&o.options.every(option)&&Array.isArray(o.selected)&&o.selected.every(option)&&integer(o.totalMatching)&&integer(o.page,1)&&integer(o.pageSize,1)&&typeof o.q==='string';
}
function progress(v:unknown):boolean{return object(v)&&['todo','inProgress','blocked','review','done','cancelled'].every(key=>integer(v[key]))&&finite(v.completionRatio)&&(v.completionRatio as number)>=0&&(v.completionRatio as number)<=1;}
function task(v:unknown):boolean{return object(v)&&typeof v.id==='string'&&typeof v.title==='string'&&typeof v.summary==='string'&&TASK_STATUSES.includes(v.rawStatus as never)&&TASK_STATUSES.includes(v.effectiveStatus as never)&&finite(v.priority)&&strings(v.specIds)&&strings(v.dependsOn)&&strings(v.unmetDependencies)&&integer(v.downstreamCount)&&finite(v.effort);}
function spec(v:unknown):boolean{return object(v)&&typeof v.id==='string'&&typeof v.title==='string'&&typeof v.summary==='string'&&SPEC_STATUSES.includes(v.status as never)&&strings(v.taskIds)&&strings(v.tags)&&integer(v.linkedTaskCount)&&progress(v.progress);}
function identity(v:unknown):boolean{return object(v)&&typeof v.id==='string'&&typeof v.title==='string';}
function normalizedQuery(v:unknown,kind:'task'|'spec'):boolean {
  if(!object(v)||v.kind!==kind||typeof v.q!=='string'||!strings(v.specIds)||!integer(v.page,1)||![50,100,200].includes(v.pageSize as number)||!Array.isArray(v.sort)||v.sort.length<1||v.sort.length>2||!v.sort.every(sort=>object(sort)&&(kind==='task'?TASK_SORT_KEYS:SPEC_SORT_KEYS).includes(sort.key as never)&&['asc','desc'].includes(sort.direction as string))||!strings(v.statuses)||(v.window!==undefined&&!['7d','30d','90d'].includes(v.window as string)))return false;
  return kind==='task'?v.statuses.every(status=>TASK_STATUSES.includes(status as never))&&Array.isArray(v.priorities)&&v.priorities.every(finite)&&scopes.includes(v.scope as string):v.statuses.every(status=>SPEC_STATUSES.includes(status as never))&&scopes.includes(v.taskScope as string)&&typeof v.legacyArchive==='boolean';
}
function selection(v:unknown):boolean {
  return object(v)&&typeof v.taskId==='string'&&typeof v.title==='string'&&typeof v.primarySpecId==='string'&&['specIds','directDependencyIds','transitiveDependencyIds','directDependentIds','transitiveDependentIds','directBlockedDependentIds','transitiveBlockedDependentIds','directRelatedSpecIds','transitiveRelatedSpecIds'].every(key=>strings(v[key]));
}

/** Reject malformed transport data before it can replace a working rendered snapshot. */
export function validateWorkspaceEnvelope(value:unknown,expected:Pick<WorkspaceEnvelope,'route'|'requestKey'>):value is WorkspaceEnvelope {
  if(!object(value)||value.schemaVersion!==1||value.route!==expected.route||value.requestKey!==expected.requestKey||typeof value.revision!=='string'||!value.revision||typeof value.generatedAt!=='string'||!Number.isFinite(Date.parse(value.generatedAt))||!object(value.shell)||!object(value.shell.project)||typeof value.shell.project.name!=='string'||typeof value.shell.project.memoryDir!=='string'||typeof value.shell.project.key!=='string'||!/^[a-f0-9]{64}$/.test(value.shell.project.key)||!object(value.shell.git)||typeof value.shell.git.available!=='boolean'||typeof value.shell.git.dirty!=='boolean'||!object(value.data))return false;
  const data=value.data;
  if(value.route==='tasks'||value.route==='specs'){
    if(value.route==='tasks'&&!['table','board'].includes(data.view as string))return false;
    if(!object(data.result)||!filters(data.filters))return false;
    const result=data.result;
    return Array.isArray(result.rows)&&result.rows.length<=200&&result.rows.length<=(result.pageSize as number)&&result.rows.every(value.route==='tasks'?task:spec)&&integer(result.totalMatching)&&integer(result.totalInScope)&&integer(result.page,1)&&integer(result.requestedPage,1)&&[50,100,200].includes(result.pageSize as number)&&normalizedQuery(result.normalizedQuery,value.route==='tasks'?'task':'spec')&&typeof result.revision==='string'&&typeof result.generatedAt==='string'&&(value.route!=='specs'||typeof data.progressIsSubset==='boolean');
  }
  if(value.route==='timeline')return filters(data.filters)&&object(data.timeline)&&finite(data.timeline.totalUnits)&&integer(data.timeline.taskCount)&&['active','all'].includes(data.timeline.mode as string)&&(data.timeline.selection===undefined||selection(data.timeline.selection))&&Array.isArray(data.timeline.groups)&&data.timeline.groups.every(group=>object(group)&&typeof group.specId==='string'&&typeof group.specTitle==='string'&&typeof group.specStatus==='string'&&typeof group.selectionState==='string'&&Array.isArray(group.rows)&&group.rows.every(row=>object(row)&&typeof row.taskId==='string'&&typeof row.title==='string'&&typeof row.statusLabel==='string'&&typeof row.primarySpecId==='string'&&typeof row.selectionState==='string'&&typeof row.isCrossSpecRelated==='boolean'&&integer(row.dependencyCount)&&finite(row.start)&&finite(row.end)&&finite(row.effort)&&TASK_STATUSES.includes(row.effectiveStatus as never)&&strings(row.specIds)));
  return object(data.counts)&&['specs','tasks','activeSpecs','inProgressTasks','reviewTasks','blockedTasks','readyTasks'].every(key=>integer((data.counts as Record<string,unknown>)[key]))&&object(data.currentState)&&typeof data.currentState.summary==='string'&&typeof data.currentState.focus==='string'&&strings(data.currentState.activeSpecIds)&&strings(data.currentState.activeTaskIds)&&strings(data.currentState.nextActionHints)&&strings(data.nextActions)&&object(data.agents)&&typeof data.agents.ok==='boolean'&&finite(data.agents.maxFileTokens)&&finite(data.agents.maxChainTokens)&&strings(data.agents.failures)&&['blockedTasks','reviewTasks','criticalPath'].every(key=>Array.isArray(data[key])&&(data[key] as unknown[]).every(identity))&&Array.isArray(data.specs)&&data.specs.every(spec=>object(spec)&&typeof spec.id==='string'&&integer(spec.linkedTaskCount))&&Array.isArray(data.dependencyIssues)&&data.dependencyIssues.every(issue=>object(issue)&&typeof issue.taskId==='string'&&typeof issue.missingTaskId==='string')&&(data.recentHandoff===undefined||object(data.recentHandoff)&&identity(data.recentHandoff)&&typeof data.recentHandoff.summary==='string'&&typeof data.recentHandoff.createdAt==='string');
}

/** Active-route ownership, not revision sorting, decides which response may commit. */
export class WorkspaceResource<Envelope extends WorkspaceEnvelope = WorkspaceEnvelope> {
  private state:WorkspaceResourceState<Envelope>;
  private generation=0;
  private sequence=0;
  private disposed=false;
  private request?:AbortController;
  private focusTimer?:ReturnType<typeof setTimeout>;
  private clock:()=>number;
  constructor(seed:Envelope,private url:string,private options:Options<Envelope>){
    this.clock=options.now??Date.now;
    this.state={snapshot:seed,pending:false,lastSuccessAt:Date.parse(seed.generatedAt),lastAttemptAt:this.clock()};
  }
  get current():WorkspaceResourceState<Envelope>{return this.state;}
  private publish(patch:Partial<WorkspaceResourceState<Envelope>>){this.state={...this.state,...patch};this.options.onChange(this.state);}
  seed(snapshot:Envelope,url:string){
    this.generation++;this.sequence++;this.request?.abort();this.request=undefined;
    if(this.focusTimer)clearTimeout(this.focusTimer);
    this.url=url;this.publish({snapshot,pending:false,error:undefined,lastSuccessAt:Date.parse(snapshot.generatedAt),lastAttemptAt:this.clock()});
  }
  /** Inspector navigation only retargets the controlled endpoint, keeping ownership/state. */
  retarget(url:string){this.url=url;}
  async refresh(reason:'manual'|'focus'='manual'):Promise<void>{
    if(this.disposed||(reason==='focus'&&this.state.pending))return;
    const generation=this.generation,sequence=++this.sequence;
    this.request?.abort();
    const controller=new AbortController();this.request=controller;
    const expected=this.state.snapshot;
    const endpoint=new URL('/workspace-data',this.url);
    endpoint.search=new URL(this.url).search;
    endpoint.searchParams.set('route',expected.route);
    const owned=()=>!this.disposed&&this.generation===generation&&this.sequence===sequence;
    this.publish({pending:true,error:undefined,lastAttemptAt:this.clock()});
    let timer:ReturnType<typeof setTimeout>|undefined;
    let timeout=false;
    try{
      const response=(async()=>{
        const response=await (this.options.fetcher??fetch)(endpoint.href,{signal:controller.signal,cache:'no-store',headers:{accept:'application/json'}});
        if(!response.ok)throw new Error('response');
        let value:unknown;try{value=await response.json();}catch{throw new Error('response');}
        if(!validateWorkspaceEnvelope(value,expected))throw new Error('response');
        return value as Envelope;
      })();
      const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{timeout=true;controller.abort();reject(new Error('timeout'));},this.options.deadlineMs??15_000);});
      const snapshot=await Promise.race([response,deadline]);
      if(owned())this.publish({snapshot,pending:false,error:undefined,lastSuccessAt:this.clock()});
    }catch(error){
      if(owned())this.publish({pending:false,error:timeout?'timeout':error instanceof Error&&error.message==='response'?'response':'network'});
    }finally{
      if(timer)clearTimeout(timer);
      if(owned())this.request=undefined;
    }
  }
  focus(){
    if(this.disposed||this.options.isVisible?.()===false)return;
    if(this.focusTimer)clearTimeout(this.focusTimer);
    this.focusTimer=setTimeout(()=>{this.focusTimer=undefined;if(this.options.isVisible?.()!==false&&this.clock()-this.state.lastAttemptAt>5_000)void this.refresh('focus');},this.options.focusDebounceMs??150);
  }
  dispose(){this.disposed=true;this.generation++;this.sequence++;this.request?.abort();if(this.focusTimer)clearTimeout(this.focusTimer);}
}
