import type {WorkspaceTimelineGroup,WorkspaceTimelineTask} from '../../../../../src/services/workspace-timeline-contract.ts';
export type Density='compact'|'comfortable';
export type TimelineItem={key:string;top:number;height:number;position:number;taskPosition:number;group:WorkspaceTimelineGroup} & ({kind:'group'}|{kind:'task';task:WorkspaceTimelineTask});
export function flattenTimeline(groups:WorkspaceTimelineGroup[],collapsed:ReadonlySet<string>,density:Density,coarse=false){
  const items:TimelineItem[]=[],logicalIds:string[]=[],seen=new Set<string>();let top=0,taskCount=0;
  for(const group of groups){
    items.push({position:items.length+1,taskPosition:taskCount,kind:'group',key:`group:${group.specId}`,top,height:coarse?44:40,group});top+=coarse?44:40;
    if(collapsed.has(group.specId))continue;
    const occurrences=new Map<string,number>();
    for(const task of group.rows){const occurrence=occurrences.get(task.taskId)??0;occurrences.set(task.taskId,occurrence+1);const height=coarse?44:density==='compact'?32:40;items.push({position:items.length+1,taskPosition:taskCount+1,kind:'task',key:`task:${group.specId}:${task.taskId}:${occurrence}`,top,height,group,task});top+=height;taskCount++;if(!seen.has(task.taskId)){seen.add(task.taskId);logicalIds.push(task.taskId);}}
  }
  return {items,height:top,taskCount,logicalIds};
}
export function indexAt(items:TimelineItem[],offset:number):number {
  let low=0,high=items.length;while(low<high){const mid=(low+high)>>>1;if(items[mid]!.top+items[mid]!.height<=offset)low=mid+1;else high=mid;}return Math.min(low,Math.max(0,items.length-1));
}
export function viewportItems(items:TimelineItem[],taskCount:number,scrollTop:number,height:number,focusedKey?:string){
  if(taskCount<=500)return items;
  const first=Math.max(0,indexAt(items,Math.max(0,scrollTop))-8),last=Math.min(items.length,indexAt(items,scrollTop+height)+9),visible=items.slice(first,last);
  const focused=focusedKey?items.find(item=>item.key===focusedKey):undefined;
  if(focused&&!visible.some(item=>item.key===focusedKey))visible.push(focused);visible.sort((left,right)=>left.position-right.position);
  return visible;
}
/** Relative-unit ticks:1/2/5 powers, at least64px apart and never more than64. */
export function timelineTicks(total:number|null,width:number):number[]{
  if(total===null||!Number.isFinite(total)||total<1||!Number.isFinite(width)||width<=0)return [];
  const intervals=Math.max(1,Math.min(63,Math.floor(width/64))),target=total/intervals,exponent=Math.floor(Math.log10(target)),power=10**exponent;
  let step=[1,2,5,10].map(multiplier=>multiplier*power).find(candidate=>candidate>=target&&Number.isFinite(candidate));
  if(!step)step=total;
  const ticks:number[]=[];for(let i=0;i<=63;i++){const value=i*step;if(!Number.isFinite(value)||value>total)break;ticks.push(value);}return ticks;
}
export function barPosition(task:WorkspaceTimelineTask,total:number|null):{left:number;width:number}|undefined{
  if(total===null||!Number.isFinite(total)||total<1||task.placementState!=='available'||task.start===null||task.end===null)return;
  const left=task.start/total*100,width=(task.end/total-task.start/total)*100;
  return Number.isFinite(left)&&Number.isFinite(width)&&left>=0&&width>=0?{left,width}:undefined;
}
export function unitLabel(value:number|null){return value===null?'Unavailable':String(value);}

// Client-only route-session collapse memory; never a project/domain cache.
export const timelineCollapseSession=new Map<string,Set<string>>();

export function parseTimelineDensity(raw:string|null):Density {try{const value=JSON.parse(raw??'null');return value?.version===1&&value.density==='comfortable'?'comfortable':'compact';}catch{return 'compact';}}

/** Preserve a visible occurrence through row-height changes, including its last visible pixel. */
export function reconcileTimelineAnchor(previous:TimelineItem[],next:TimelineItem[],scrollTop:number):number|undefined {
  const anchor=previous[indexAt(previous,scrollTop)];if(!anchor)return;
  const match=next.find(item=>item.key===anchor.key);if(!match)return;
  return match.top+Math.max(0,Math.min(scrollTop-anchor.top,match.height-1));
}
