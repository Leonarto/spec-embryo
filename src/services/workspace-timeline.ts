import { buildTimelineProjection, type DashboardTaskCard, type DashboardAnalysisState } from './dashboard.ts';
import type { WorkspaceTimelineQuery } from './workspace-query.ts';
import { isWorkspaceTimelineProjection, type EdgeSample, type Samples, type TimelineDiagnostics, type UnitField, type RelatedSpecPage, type WorkspaceTimelineProjection } from './workspace-timeline-contract.ts';

const category=<T>():Samples<T>=>({count:0,samples:[],omittedCount:0});
function append<T>(category:Samples<T>,sample:T){category.count++;if(category.samples.length<100)category.samples.push(sample);else category.omittedCount++;}
/** Diagnoses exactly the placement input graph, retaining duplicate edge occurrences. */
export function diagnoseTimeline(cards:DashboardTaskCard[],allTaskIds:ReadonlySet<string>):TimelineDiagnostics {
  const byId=new Map(cards.map(card=>[card.id,card])),missingReferences=category<EdgeSample>(),backEdges=category<EdgeSample>();
  let outsideViewReferenceCount=0;
  for(const task of byId.values())for(let dependencyIndex=0;dependencyIndex<task.dependsOn.length;dependencyIndex++){
    const dependencyId=task.dependsOn[dependencyIndex]!;
    if(!allTaskIds.has(dependencyId))append(missingReferences,{taskId:task.id,dependencyId,dependencyIndex});
    else if(!byId.has(dependencyId))outsideViewReferenceCount++;
  }
  const colors=new Map<string,1|2>();
  for(const root of byId.values()){
    if(colors.has(root.id))continue;
    colors.set(root.id,1);const stack=[{task:root,index:0}];
    while(stack.length){
      const frame=stack[stack.length-1]!;
      if(frame.index===frame.task.dependsOn.length){colors.set(frame.task.id,2);stack.pop();continue;}
      const dependencyIndex=frame.index++,dependencyId=frame.task.dependsOn[dependencyIndex]!,dependency=byId.get(dependencyId);
      if(!dependency)continue;
      if(colors.get(dependencyId)===1)append(backEdges,{taskId:frame.task.id,dependencyId,dependencyIndex});
      else if(!colors.has(dependencyId)){colors.set(dependencyId,1);stack.push({task:dependency,index:0});}
    }
  }
  return {scope:'filtered-timeline',graphTaskCount:byId.size,missingReferences,outsideViewReferenceCount,backEdges,hasCycles:backEdges.count>0,invalidPlacements:category(),nonFiniteTotal:false};
}

export function pageRelatedSpecs(ids:string[],requestedPage:number):RelatedSpecPage {
  const totalPages=Math.max(1,Math.ceil(ids.length/50)),page=Math.min(requestedPage,totalPages);
  return {ids:ids.slice((page-1)*50,page*50),requestedPage,page,pageSize:50,total:ids.length,totalPages};
}

/** One unchanged legacy projection; explicit JSON-safe units and a bounded fallback slice. */
export function buildWorkspaceTimelineProjection(cards:DashboardTaskCard[],specs:DashboardAnalysisState['availableSpecs'],query:WorkspaceTimelineQuery,allTaskIds:ReadonlySet<string>):WorkspaceTimelineProjection {
  const raw=buildTimelineProjection(cards,specs,{selectedSpecIds:query.specIds,mode:query.mode,selectedTaskId:query.selectedTaskId});
  const graph=query.mode==='all'?cards:cards.filter(card=>card.effectiveStatus!=='done'&&card.effectiveStatus!=='cancelled');
  const diagnostics=diagnoseTimeline(graph,allTaskIds),fields:UnitField[]=['effort','start','end'],invalid=new Map<string,Set<UnitField>>();
  let totalMatching=0;
  const groups=raw.groups.map(group=>({...group,rows:group.rows.map(task=>{
    totalMatching++;const nonfinite=fields.filter(field=>!Number.isFinite(task[field]));
    if(nonfinite.length){let affected=invalid.get(task.taskId);if(!affected){affected=new Set();invalid.set(task.taskId,affected);}for(const field of nonfinite)affected.add(field);}
    return {...task,effort:Number.isFinite(task.effort)?task.effort:null,start:Number.isFinite(task.start)?task.start:null,end:Number.isFinite(task.end)?task.end:null,placementState:nonfinite.length?'unavailable' as const:'available' as const};
  })}));
  for(const [taskId,invalidFields]of invalid)append(diagnostics.invalidPlacements,{taskId,fields:fields.filter(field=>invalidFields.has(field))});
  diagnostics.nonFiniteTotal=!Number.isFinite(raw.totalUnits);
  const unavailable=diagnostics.nonFiniteTotal||invalid.size>0;
  const totalPages=Math.max(1,Math.ceil(totalMatching/query.pageSize)),page=Math.min(query.page,totalPages),offset=(page-1)*query.pageSize;
  const rows:WorkspaceTimelineProjection['fallbackPage']['rows']=[];let index=0;
  for(const group of groups)for(const task of group.rows){if(index>=offset&&rows.length<query.pageSize)rows.push({groupId:group.specId,groupTitle:group.specTitle,task});index++;}
  const relatedSpecPages=raw.selection?{direct:pageRelatedSpecs(raw.selection.directRelatedSpecIds,query.relatedDirectPage),transitive:pageRelatedSpecs(raw.selection.transitiveRelatedSpecIds,query.relatedTransitivePage)}:null;
  const result:WorkspaceTimelineProjection={relatedSpecPages,timeline:{...raw,groups,totalUnits:unavailable?null:raw.totalUnits,unitsState:unavailable?'unavailable':'available',diagnostics},fallbackPage:{rows,requestedPage:query.page,page,pageSize:query.pageSize,totalMatching,totalPages}};
  if(!isWorkspaceTimelineProjection(result))throw new Error('Invalid workspace Timeline projection');
  return result;
}
