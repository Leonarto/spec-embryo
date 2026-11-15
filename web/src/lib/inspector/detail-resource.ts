import type {InspectorIdentity,WorkspaceDetailEnvelope} from '../../../../src/services/workspace-detail.ts';
export interface InspectorDetailState {identity?:InspectorIdentity;snapshot?:WorkspaceDetailEnvelope;pending:boolean;error?:'network'|'response'|'timeout';lastAttemptAt:number;lastSuccessAt:number}
interface Options {onChange:(state:InspectorDetailState)=>void;fetcher?:typeof fetch;now?:()=>number;deadlineMs?:number;focusDebounceMs?:number;isVisible?:()=>boolean}
const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null;
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const identified=(v:unknown)=>object(v)&&typeof v.id==='string'&&typeof v.title==='string';
const taskCard=(v:unknown)=>identified(v)&&object(v)&&typeof v.summary==='string'&&typeof v.statusLabel==='string'&&typeof v.priority==='number'&&Number.isFinite(v.priority)&&typeof v.effort==='number'&&strings(v.specIds);
export function validateDetailEnvelope(value:unknown,expected:InspectorIdentity):value is WorkspaceDetailEnvelope {
  if(!object(value)||value.schemaVersion!==1||value.kind!==expected.kind||value.id!==expected.id||typeof value.revision!=='string'||!value.revision||typeof value.generatedAt!=='string'||!Number.isFinite(Date.parse(value.generatedAt))||!object(value.detail))return false;
  const d=value.detail;if(d.kind!==expected.kind||typeof d.found!=='boolean')return false;
  if(!d.found)return d.id===expected.id&&strings(d.availableIds);
  const entity=expected.kind==='task'?d.task:d.spec;
  if(!identified(entity)||!object(entity)||entity.id!==expected.id||typeof entity.summary!=='string'||typeof entity.status!=='string'||!strings(entity.tags)||!object(d.currentState)||!['isActiveSpec','isActiveTask','isBlockedTask'].every(key=>typeof (d.currentState as Record<string,unknown>)[key]==='boolean')||typeof d.currentState.focus!=='string'||!Array.isArray(d.relatedHandoffs)||!d.relatedHandoffs.every(x=>identified(x)&&object(x)&&typeof x.summary==='string'&&typeof x.createdAt==='string')||!Array.isArray(d.bodySections)||!d.bodySections.every(section=>object(section)&&typeof section.heading==='string'&&typeof section.depth==='number'&&Array.isArray(section.blocks)&&section.blocks.every(block=>object(block)&&['paragraph','list','code'].includes(block.kind as string)&&strings(block.lines)&&(block.language===undefined||typeof block.language==='string'))))return false;
  if(expected.kind==='task')return typeof entity.priority==='number'&&Number.isFinite(entity.priority)&&Array.isArray(d.linkedSpecs)&&d.linkedSpecs.every(x=>identified(x)&&object(x)&&typeof x.status==='string')&&strings(d.unmetDependencyIds)&&Array.isArray(d.dependencies)&&d.dependencies.every(taskCard)&&Array.isArray(d.blockingTasks)&&d.blockingTasks.every(taskCard);
  return object(d.progress)&&['todo','inProgress','blocked','review','done','cancelled','completionRatio'].every(key=>typeof (d.progress as Record<string,unknown>)[key]==='number'&&Number.isFinite((d.progress as Record<string,number>)[key]))&&Array.isArray(d.linkedTasks)&&d.linkedTasks.every(taskCard)&&Array.isArray(d.linkedTaskGroups)&&d.linkedTaskGroups.every(group=>object(group)&&typeof group.id==='string'&&typeof group.title==='string'&&Array.isArray(group.tasks)&&group.tasks.every(taskCard))&&Array.isArray(d.openQuestions)&&d.openQuestions.every(question=>object(question)&&typeof question.id==='string'&&typeof question.question==='string')&&Array.isArray(d.resolvedDecisions)&&d.resolvedDecisions.every(decision=>object(decision)&&typeof decision.id==='string'&&typeof decision.answer==='string'&&(decision.question===undefined||typeof decision.question==='string'));
}
const same=(a:InspectorIdentity|undefined,b:InspectorIdentity|undefined)=>a?.kind===b?.kind&&a?.id===b?.id;
/** An identity change clears the previous body synchronously; refresh retains it. */
export class InspectorDetailResource {
  private state:InspectorDetailState={pending:false,lastAttemptAt:0,lastSuccessAt:0};private generation=0;private sequence=0;private request?:AbortController;private timer?:ReturnType<typeof setTimeout>;private disposed=false;
  constructor(private origin:string,private options:Options){}
  get current(){return this.state;}
  private publish(patch:Partial<InspectorDetailState>){this.state={...this.state,...patch};this.options.onChange(this.state);}
  select(identity:InspectorIdentity|undefined,seed?:WorkspaceDetailEnvelope){
    const changed=!same(identity,this.state.identity);
    if(!changed&&!seed)return;
    this.generation++;this.sequence++;this.request?.abort();this.request=undefined;if(this.timer)clearTimeout(this.timer);
    const accepted=identity&&seed&&validateDetailEnvelope(seed,identity)?seed:undefined;
    this.publish({identity,snapshot:accepted,pending:!!identity&&!accepted,error:undefined,lastAttemptAt:accepted?(this.options.now?.()??Date.now()):0,lastSuccessAt:accepted?Date.parse(accepted.generatedAt):0});
    if(identity&&!accepted)void this.refresh();
  }
  async refresh(reason:'manual'|'focus'='manual'){
    if(this.disposed||!this.state.identity||reason==='focus'&&this.state.pending)return;
    const identity=this.state.identity,generation=this.generation,sequence=++this.sequence;this.request?.abort();const controller=new AbortController();this.request=controller;
    const owned=()=>!this.disposed&&generation===this.generation&&sequence===this.sequence&&same(identity,this.state.identity);
    const now=()=>this.options.now?.()??Date.now();this.publish({pending:true,error:undefined,lastAttemptAt:now()});
    let timer:ReturnType<typeof setTimeout>|undefined,timeout=false;
    try{
      const url=new URL('/workspace-detail',this.origin);url.searchParams.set('kind',identity.kind);url.searchParams.set('id',identity.id);
      const response=(async()=>{const response=await(this.options.fetcher??fetch)(url.href,{signal:controller.signal,cache:'no-store',headers:{accept:'application/json'}});if(response.status!==200&&response.status!==404)throw new Error('response');let value:unknown;try{value=await response.json();}catch{throw new Error('response');}if(!validateDetailEnvelope(value,identity)||response.status===404&&value.detail.found||response.status===200&&!value.detail.found)throw new Error('response');return value;})();
      const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{timeout=true;controller.abort();reject(new Error('timeout'));},this.options.deadlineMs??15000);});
      const snapshot=await Promise.race([response,deadline]);if(owned())this.publish({snapshot,pending:false,error:undefined,lastSuccessAt:now()});
    }catch(error){if(owned())this.publish({pending:false,error:timeout?'timeout':error instanceof Error&&error.message==='response'?'response':'network'});}
    finally{if(timer)clearTimeout(timer);if(owned())this.request=undefined;}
  }
  focus(){if(this.disposed||this.options.isVisible?.()===false)return;if(this.timer)clearTimeout(this.timer);this.timer=setTimeout(()=>{this.timer=undefined;if(this.options.isVisible?.()!==false&&(this.options.now?.()??Date.now())-this.state.lastAttemptAt>5000)void this.refresh('focus');},this.options.focusDebounceMs??150);}
  dispose(){this.disposed=true;this.generation++;this.sequence++;this.request?.abort();if(this.timer)clearTimeout(this.timer);}
}
