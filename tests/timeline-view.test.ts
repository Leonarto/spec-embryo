import {test,expect} from 'bun:test';
import {flattenTimeline,viewportItems,timelineTicks,barPosition,indexAt,reconcileTimelineAnchor,unitLabel} from '../web/src/lib/components/timeline/model.ts';
import {buildWorkspaceTimelineProjection,pageRelatedSpecs} from '../src/services/workspace-timeline.ts';
import {parseWorkspaceTimelineQuery,normalizeViewQuery,serializeViewQuery} from '../src/services/workspace-query.ts';
import {validateWorkspaceEnvelope,WorkspaceResource} from '../web/src/lib/workspace/resource.ts';
import type {DashboardTaskCard} from '../src/services/dashboard.ts';
import type {WorkspaceEnvelope} from '../src/services/workspace.ts';
const cards=(n:number):DashboardTaskCard[]=>Array.from({length:n},(_,i)=>({id:`TASK-${i}`,title:`Title ${i}`,summary:'',rawStatus:'todo',effectiveStatus:'todo',priority:1,specIds:[`SPEC-${Math.floor(i/100)}`],dependsOn:[],unmetDependencies:[],downstreamCount:0,effort:2}));
const projection=(n:number)=>{const c=cards(n);return buildWorkspaceTimelineProjection(c,[],parseWorkspaceTimelineQuery(new URLSearchParams()),new Set(c.map(t=>t.id)));};
test('virtual windows bound10k rows, pin focus by stable occurrence, logical IDs ignore scrolling',()=>{
  const groups=projection(10_000).timeline.groups,flat=flattenTimeline(groups,new Set(),'compact');
  expect(flat.logicalIds).toHaveLength(10_000);expect(flat.items[0]!.kind).toBe('group');
  for(const top of [0,5000,100_000,flat.height-700]){const window=viewportItems(flat.items,flat.taskCount,top,700,'task:SPEC-0:TASK-0:0');expect(window.filter(i=>i.kind==='task').length).toBeLessThanOrEqual(80);expect(window.some(i=>i.key==='task:SPEC-0:TASK-0:0')).toBe(true);expect(flat.logicalIds[0]).toBe('TASK-0');}
  const collapsed=flattenTimeline(groups,new Set(['SPEC-0']),'compact');expect(collapsed.logicalIds).toHaveLength(9900);expect(collapsed.logicalIds[0]).toBe('TASK-100');
  const coarse=flattenTimeline(groups,new Set(),'compact',true);expect(coarse.items.every(i=>i.height===44)).toBe(true);expect(coarse.items[10]!.top).toBe(440);expect(indexAt(coarse.items,440)).toBe(10);
  const small=flattenTimeline(groups.slice(0,5),new Set(),'comfortable');expect(viewportItems(small.items,500,0,700)).toBe(small.items);
});
test('adaptive ticks and bars reject nonfinite arithmetic while preserving relative units',()=>{
  for(const total of [1,10,1000,10_000,Number.MAX_VALUE])for(const width of [320,960,10_000]){const ticks=timelineTicks(total,width);expect(ticks.length).toBeLessThanOrEqual(64);expect(ticks.every(Number.isFinite)).toBe(true);for(let i=1;i<ticks.length;i++)expect((ticks[i]!-ticks[i-1]!)/total*width).toBeGreaterThanOrEqual(63.999);}
  expect(unitLabel(Number.MIN_VALUE)).toBe(String(Number.MIN_VALUE));expect(unitLabel(.0001)).toBe('0.0001');expect(timelineTicks(null,900)).toEqual([]);expect(timelineTicks(Infinity,900)).toEqual([]);
  const task=projection(1).timeline.groups[0]!.rows[0]!;expect(barPosition(task,2)).toEqual({left:0,width:100});expect(barPosition({...task,start:null,placementState:'unavailable'},2)).toBeUndefined();expect(barPosition(task,Infinity)).toBeUndefined();
});
test('related-spec pure pages preserve original order/independent clamping and all2000 IDs',()=>{
  for(const n of [0,1,50,51,2000]){const ids=Array.from({length:n},(_,i)=>`SPEC-${n-i}`);const page=pageRelatedSpecs(ids,1000);expect(page.ids).toEqual(ids.slice((page.page-1)*50,page.page*50));expect(page.ids.length).toBeLessThanOrEqual(50);expect(page.total).toBe(n);expect(page.requestedPage).toBe(1000);if(n)expect(page.ids.at(-1)).toBe('SPEC-1');}
  const input=normalizeViewQuery('timeline',new URLSearchParams('selected_task=TASK-1&trace_direct_page=40&trace_transitive_page=2&page=3&inspect=spec:SPEC-1&section=document'));
  expect(normalizeViewQuery('timeline',serializeViewQuery(input))).toEqual(input);expect(parseWorkspaceTimelineQuery(new URLSearchParams('trace_direct_page=40'))).toMatchObject({relatedDirectPage:1,relatedTransitivePage:1});
});
test('route-specific v2 rejection retains Timeline snapshot; all other route schemas stay1',async()=>{
  const p=projection(1),snapshot={schemaVersion:2,route:'timeline',requestKey:'intent',revision:'revision',generatedAt:new Date().toISOString(),shell:{project:{name:'Fixture',memoryDir:'docs/spm',key:'a'.repeat(64)},git:{available:false,dirty:false}},data:{...p,filters:{selectedSpecIds:[],unavailableSpecIds:[],hasActiveFilters:false,includesArchived:false,legacyArchive:false,scope:'unarchived',options:{options:[],selected:[],totalMatching:0,page:1,pageSize:50,q:'',revision:'r'}}}} as WorkspaceEnvelope<'timeline'>;
  expect(validateWorkspaceEnvelope(snapshot,snapshot)).toBe(true);expect(validateWorkspaceEnvelope({...snapshot,schemaVersion:1},snapshot)).toBe(false);
  const resource=new WorkspaceResource(snapshot,'http://fixture/timeline',{onChange:()=>{},fetcher:async()=>new Response(JSON.stringify({...snapshot,schemaVersion:1}))});await resource.refresh();expect(resource.current.error).toBe('response');expect(resource.current.snapshot).toBe(snapshot);resource.dispose();
});

test('height reduction clamps last-pixel offsets to retain the same visible occurrence',()=>{
  const groups=projection(1000).timeline.groups;
  const compact=flattenTimeline(groups,new Set(),'compact'),comfortable=flattenTimeline(groups,new Set(),'comfortable'),coarse=flattenTimeline(groups,new Set(),'compact',true);
  for(const old of [comfortable,coarse]){
    const row=old.items.find(item=>item.kind==='task')!,top=row.top+row.height-1,newTop=reconcileTimelineAnchor(old.items,compact.items,top)!;
    const restored=compact.items[indexAt(compact.items,newTop)]!;expect(restored.key).toBe(row.key);expect(newTop-restored.top).toBe(31);
    const window=viewportItems(compact.items,compact.taskCount,100_000,700,row.key);expect(window.find(item=>item.key===row.key)?.key).toBe(row.key);expect(window.map(item=>item.position)).toEqual(window.map(item=>item.position).sort((a,b)=>a-b));
  }
});
