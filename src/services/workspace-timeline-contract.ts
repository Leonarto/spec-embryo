import { TASK_STATUSES } from '../domain.ts';
import type { DashboardTimelineGroup, DashboardTimelineRow, DashboardTimelineSelection } from './dashboard.ts';

export type UnitField = 'effort' | 'start' | 'end';
export interface EdgeSample { taskId:string; dependencyId:string; dependencyIndex:number }
export interface Samples<T> { count:number; samples:T[]; omittedCount:number }
export interface TimelineDiagnostics {
  scope:'filtered-timeline'; graphTaskCount:number;
  missingReferences:Samples<EdgeSample>; outsideViewReferenceCount:number;
  backEdges:Samples<EdgeSample>; hasCycles:boolean;
  invalidPlacements:Samples<{taskId:string;fields:UnitField[]}>; nonFiniteTotal:boolean;
}
export type WorkspaceTimelineTask = Omit<DashboardTimelineRow,UnitField> & {
  effort:number|null; start:number|null; end:number|null; placementState:'available'|'unavailable';
};
export type WorkspaceTimelineGroup = Omit<DashboardTimelineGroup,'rows'> & { rows:WorkspaceTimelineTask[] };
export interface WorkspaceTimeline {
  totalUnits:number|null; unitsState:'available'|'unavailable'; taskCount:number;
  groups:WorkspaceTimelineGroup[]; mode:'active'|'all'; selection?:DashboardTimelineSelection;
  diagnostics:TimelineDiagnostics;
}
export interface TimelineFallbackPage {
  rows:Array<{groupId:string;groupTitle:string;task:WorkspaceTimelineTask}>;
  requestedPage:number; page:number; pageSize:50|100|200; totalMatching:number; totalPages:number;
}
export interface RelatedSpecPage {ids:string[];requestedPage:number;page:number;pageSize:50;total:number;totalPages:number}
export interface WorkspaceTimelineProjection { timeline:WorkspaceTimeline; fallbackPage:TimelineFallbackPage;relatedSpecPages:null|{direct:RelatedSpecPage;transitive:RelatedSpecPage} }

const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const count=(v:unknown,min=0):v is number=>Number.isSafeInteger(v)&&(v as number)>=min;
const unitFields:UnitField[]=['effort','start','end'];
const rowStates=['none','selected','dependency','dependency_transitive','dependent','dependent_transitive','blocked_dependent','blocked_dependent_transitive','dimmed'];
function samples(v:unknown,entry:(v:unknown)=>boolean):v is Samples<unknown>{
  return object(v)&&count(v.count)&&Array.isArray(v.samples)&&v.samples.length===Math.min(v.count,100)&&v.samples.every(entry)&&count(v.omittedCount)&&v.omittedCount===v.count-v.samples.length;
}
function edge(v:unknown):boolean{return object(v)&&typeof v.taskId==='string'&&typeof v.dependencyId==='string'&&count(v.dependencyIndex);}
function invalid(v:unknown):boolean{
  if(!object(v)||typeof v.taskId!=='string'||!Array.isArray(v.fields))return false;
  const fields=v.fields;
  return fields.length>0&&fields.length<=3&&fields.every((field,i)=>unitFields.includes(field as UnitField)&&(i===0||unitFields.indexOf(fields[i-1] as UnitField)<unitFields.indexOf(field as UnitField)));
}
function row(v:unknown):v is WorkspaceTimelineTask {
  if(!object(v)||typeof v.taskId!=='string'||typeof v.title!=='string'||!TASK_STATUSES.includes(v.effectiveStatus as never)||!strings(v.specIds)||!finite(v.priority)||typeof v.statusLabel!=='string'||typeof v.primarySpecId!=='string'||!count(v.dependencyCount)||typeof v.isCrossSpecRelated!=='boolean'||!rowStates.includes(v.selectionState as string)||(v.archivedAt!==undefined&&typeof v.archivedAt!=='string'))return false;
  if(!unitFields.every(field=>v[field]===null||finite(v[field])))return false;
  return v.placementState===(unitFields.some(field=>v[field]===null)?'unavailable':'available');
}
function selection(v:unknown):boolean{return object(v)&&typeof v.taskId==='string'&&typeof v.title==='string'&&typeof v.primarySpecId==='string'&&['specIds','directDependencyIds','transitiveDependencyIds','directDependentIds','transitiveDependentIds','directBlockedDependentIds','transitiveBlockedDependentIds','directRelatedSpecIds','transitiveRelatedSpecIds'].every(key=>strings(v[key]));}

/** Shared server/client wire guard. Linear in rows; no graph calculation or domain loading. */
export function isWorkspaceTimelineProjection(value:unknown):value is WorkspaceTimelineProjection {
  if(!object(value)||!object(value.timeline)||!object(value.fallbackPage))return false;
  const t=value.timeline,p=value.fallbackPage,d=t.diagnostics;
  if(!['active','all'].includes(t.mode as string)||!count(t.taskCount)||!Array.isArray(t.groups)||(t.selection!==undefined&&!selection(t.selection))||!object(d)||d.scope!=='filtered-timeline'||!count(d.graphTaskCount)||!count(d.outsideViewReferenceCount)||!samples(d.missingReferences,edge)||!samples(d.backEdges,edge)||d.hasCycles!==(d.backEdges.count>0)||!samples(d.invalidPlacements,invalid)||typeof d.nonFiniteTotal!=='boolean')return false;
  if(!count(p.requestedPage,1)||!count(p.page,1)||![50,100,200].includes(p.pageSize as number)||!count(p.totalMatching)||!count(p.totalPages,1)||p.totalPages!==Math.max(1,Math.ceil(p.totalMatching/(p.pageSize as number)))||p.page!==Math.min(p.requestedPage,p.totalPages)||!Array.isArray(p.rows))return false;
  if(t.selection){
    if(!object(value.relatedSpecPages))return false;
    for(const [category,field]of [['direct','directRelatedSpecIds'],['transitive','transitiveRelatedSpecIds']] as const){
      const page=value.relatedSpecPages[category],ids=(t.selection as Record<string,unknown>)[field] as string[];
      if(!object(page)||page.pageSize!==50||!count(page.requestedPage,1)||!count(page.page,1)||page.total!==ids.length||page.totalPages!==Math.max(1,Math.ceil(ids.length/50))||page.page!==Math.min(page.requestedPage,page.totalPages as number)||!strings(page.ids)||JSON.stringify(page.ids)!==JSON.stringify(ids.slice((page.page-1)*50,page.page*50)))return false;
    }
  }else if(value.relatedSpecPages!==null)return false;
  const offset=(p.page-1)*(p.pageSize as number),invalidById=new Map<string,Set<UnitField>>();
  let occurrences=0,selected=0;
  for(const group of t.groups){
    if(!object(group)||typeof group.specId!=='string'||typeof group.specTitle!=='string'||typeof group.specStatus!=='string'||!['none','selected','related_direct','related_transitive'].includes(group.selectionState as string)||!Array.isArray(group.rows))return false;
    for(const task of group.rows){
      if(!row(task))return false;
      if(task.placementState==='unavailable'){
        let fields=invalidById.get(task.taskId);if(!fields){fields=new Set();invalidById.set(task.taskId,fields);}
        for(const field of unitFields)if(task[field]===null)fields.add(field);
      }
      if(occurrences>=offset&&selected<(p.pageSize as number)){
        const slice=p.rows[selected++];
        if(!object(slice)||slice.groupId!==group.specId||slice.groupTitle!==group.specTitle||JSON.stringify(slice.task)!==JSON.stringify(task))return false;
      }
      occurrences++;
    }
  }
  if(occurrences!==p.totalMatching||selected!==p.rows.length||p.rows.length!==Math.min(p.pageSize as number,Math.max(0,occurrences-offset))||d.invalidPlacements.count!==invalidById.size)return false;
  const expected=[...invalidById].slice(0,100).map(([taskId,fields])=>({taskId,fields:unitFields.filter(field=>fields.has(field))}));
  if(JSON.stringify(d.invalidPlacements.samples)!==JSON.stringify(expected))return false;
  const unavailable=d.nonFiniteTotal||invalidById.size>0;
  return unavailable?t.unitsState==='unavailable'&&t.totalUnits===null:t.unitsState==='available'&&finite(t.totalUnits)&&t.totalUnits>=1;
}
