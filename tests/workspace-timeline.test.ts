import {describe,test,expect,spyOn} from 'bun:test';
import * as dashboard from '../src/services/dashboard.ts';
import type {DashboardTaskCard} from '../src/services/dashboard.ts';
import {buildWorkspaceTimelineProjection,diagnoseTimeline} from '../src/services/workspace-timeline.ts';
import {isWorkspaceTimelineProjection} from '../src/services/workspace-timeline-contract.ts';
import {normalizeViewQuery,parseWorkspaceTimelineQuery,serializeViewQuery,workspaceRequestKey} from '../src/services/workspace-query.ts';
const query=(q='')=>parseWorkspaceTimelineQuery(new URLSearchParams(q));
const card=(id:string,patch:Partial<DashboardTaskCard>={}):DashboardTaskCard=>({id,title:id,summary:'',rawStatus:'todo',effectiveStatus:'todo',priority:1,specIds:['SPEC-1'],dependsOn:[],unmetDependencies:[],downstreamCount:0,effort:2,...patch});
const project=(cards:DashboardTaskCard[],q='timeline_mode=all',global?:string[])=>buildWorkspaceTimelineProjection(cards,[{id:'SPEC-1',title:'One',status:'active'}],query(q),new Set(global??cards.map(c=>c.id)));
describe('Timeline safe workspace projection',()=>{
  test('retains exact finite legacy projection across generated graphs/statuses/ties/duplicates',()=>{
    let seed=130;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
    for(let run=0;run<180;run++){
      const cards=Array.from({length:1+Math.floor(random()*18)},(_,i)=>card(`TASK-${i}`,{effectiveStatus:['todo','blocked','in_progress','review','done','cancelled'][Math.floor(random()*6)] as DashboardTaskCard['effectiveStatus'],effort:1+Math.floor(random()*8),priority:Math.floor(random()*3),specIds:random()<.3?['SPEC-2']:['SPEC-1']}));
      for(const c of cards)c.dependsOn=Array.from({length:Math.floor(random()*4)},()=>`TASK-${Math.floor(random()*(cards.length+2))}`);
      if(run%4===0)cards.push({...cards[0]!,title:'last duplicate',effort:3});
      for(const mode of ['active','all'] as const){
        const q=query(`timeline_mode=${mode}&selected_task=TASK-0`),raw=dashboard.buildTimelineProjection(cards,[{id:'SPEC-1',title:'One',status:'active'}],{selectedSpecIds:q.specIds,mode,selectedTaskId:q.selectedTaskId}),safe=project(cards,`timeline_mode=${mode}&selected_task=TASK-0`);
        const {diagnostics,unitsState,...plain}=safe.timeline;
        expect({...plain,groups:plain.groups.map(g=>({...g,rows:g.rows.map(({placementState,...row})=>row)}))}).toEqual(raw);
        expect(isWorkspaceTimelineProjection(JSON.parse(JSON.stringify(safe)))).toBe(true);
      }
    }
  });
  test('distinguishes missing/outside edges, last-ID graph values and deterministic repeated gray edges',()=>{
    const cards=[card('TASK-A',{dependsOn:['TASK-X']}),card('TASK-B',{dependsOn:['TASK-A','TASK-A']}),card('TASK-A',{dependsOn:['TASK-B','TASK-GLOBAL','TASK-MISSING','TASK-MISSING']})];
    const d=diagnoseTimeline(cards,new Set(['TASK-A','TASK-B','TASK-GLOBAL']));
    expect(d.graphTaskCount).toBe(2);expect(d.outsideViewReferenceCount).toBe(1);
    expect(d.missingReferences).toEqual({count:2,samples:[{taskId:'TASK-A',dependencyId:'TASK-MISSING',dependencyIndex:2},{taskId:'TASK-A',dependencyId:'TASK-MISSING',dependencyIndex:3}],omittedCount:0});
    expect(d.backEdges).toEqual({count:2,samples:[{taskId:'TASK-B',dependencyId:'TASK-A',dependencyIndex:0},{taskId:'TASK-B',dependencyId:'TASK-A',dependencyIndex:1}],omittedCount:0});expect(d.hasCycles).toBe(true);
    const active=project([card('TASK-A',{dependsOn:['TASK-DONE']}),card('TASK-DONE',{effectiveStatus:'done'})],'');expect(active.timeline.diagnostics.outsideViewReferenceCount).toBe(1);expect(active.timeline.diagnostics.missingReferences.count).toBe(0);
  });
  test('bounds each diagnostic sample independently and completes10k chain/30k edges iteratively',()=>{
    const cards=Array.from({length:10_000},(_,i)=>card(`TASK-${i}`,{dependsOn:[...(i?[`TASK-${i-1}`]:[]),'TASK-ABSENT','TASK-ABSENT']}));
    const safe=project(cards);expect(safe.timeline.taskCount).toBe(10_000);expect(safe.timeline.totalUnits).toBe(20_000);expect(safe.timeline.diagnostics.missingReferences).toMatchObject({count:20_000,omittedCount:19_900});expect(safe.timeline.diagnostics.missingReferences.samples).toHaveLength(100);
    const cycle=diagnoseTimeline([card('TASK-A',{dependsOn:Array(150).fill('TASK-A')})],new Set(['TASK-A']));expect(cycle.backEdges.count).toBe(150);expect(cycle.backEdges.samples).toHaveLength(100);expect(cycle.backEdges.omittedCount).toBe(50);
  });
  test('preserves rows and finite fields when effort or derived placement overflows',()=>{
    for(const effort of [Infinity,NaN,Number.MAX_VALUE]){
      const safe=project([card('TASK-A',{effort}),card('TASK-B',{effort,dependsOn:['TASK-A']})]);
      expect(safe.timeline.unitsState).toBe('unavailable');expect(safe.timeline.totalUnits).toBeNull();expect(safe.timeline.groups[0]!.rows).toHaveLength(2);
      expect(safe.timeline.groups[0]!.rows[0]!.start).toBe(0);expect(safe.timeline.diagnostics.invalidPlacements.count).toBeGreaterThan(0);expect(isWorkspaceTimelineProjection(JSON.parse(JSON.stringify(safe)))).toBe(true);
      expect(JSON.stringify(safe)).not.toMatch(/NaN|Infinity/);
    }
    expect(()=>project([card('TASK-A',{priority:Infinity})])).toThrow('Invalid workspace Timeline');
  });
  test('uses one legacy projection, bounds fallback slice, handles empty/last/clamp and intent identity',()=>{
    const spy=spyOn(dashboard,'buildTimelineProjection');try{const empty=project([]);expect(spy).toHaveBeenCalledTimes(1);expect(empty.fallbackPage).toMatchObject({rows:[],page:1,totalMatching:0,totalPages:1});expect(empty.timeline.totalUnits).toBe(1);}finally{spy.mockRestore();}
    const cards=Array.from({length:205},(_,i)=>card(`TASK-${i}`));const last=project(cards,'timeline_mode=all&page=3');expect(last.fallbackPage.rows).toHaveLength(5);expect(last.fallbackPage).toMatchObject({page:3,requestedPage:3,totalMatching:205,totalPages:3,pageSize:100});
    const clamped=project(cards.slice(0,100),'timeline_mode=all&page=3');expect(clamped.fallbackPage).toMatchObject({page:1,requestedPage:3,totalMatching:100});expect(clamped.fallbackPage.rows).toHaveLength(100);
    expect(workspaceRequestKey('timeline',new URLSearchParams('page=3'))).toBe(workspaceRequestKey('timeline',new URLSearchParams('page=3&inspect=task:TASK-1&section=document')));
    const input=normalizeViewQuery('timeline',new URLSearchParams('page=2&pageSize=200&selected_task=TASK-1&inspect=spec:SPEC-1&section=document&simple=1'));
    expect(normalizeViewQuery('timeline',serializeViewQuery(input))).toEqual(input);expect(query('page=Infinity&pageSize=4')).toMatchObject({page:1,pageSize:100});
  });
  test('rejects inconsistent nullable fields, samples, counts, metadata and fallback rows',()=>{
    const valid=project([card('TASK-A',{effort:Infinity}),card('TASK-B',{dependsOn:['TASK-A']})]);
    const changes:Array<(v:typeof valid)=>void>=[v=>{v.timeline.groups[0]!.rows[0]!.placementState='available';},v=>{v.timeline.diagnostics.hasCycles=true;},v=>{v.timeline.diagnostics.invalidPlacements.samples[0]!.fields=['end','effort'];},v=>{v.timeline.diagnostics.invalidPlacements.samples[0]!.taskId='wrong';},v=>{v.timeline.diagnostics.invalidPlacements.omittedCount=1;},v=>{v.timeline.diagnostics.invalidPlacements.samples=[];},v=>{v.timeline.groups[0]!.rows[0]!.priority=Infinity;},v=>{v.fallbackPage.rows=[];},v=>{v.fallbackPage.totalMatching=10;},v=>{v.timeline.diagnostics.graphTaskCount=2**54;}];
    expect(isWorkspaceTimelineProjection(valid)).toBe(true);for(const change of changes){const bad=structuredClone(valid);change(bad);expect(isWorkspaceTimelineProjection(bad)).toBe(false);}
  });
  test('related-spec DTO slices full legacy selection with independent clamping and no duplicate full arrays',()=>{
    const cards=Array.from({length:2001},(_,i)=>card(`TASK-${i}`,{specIds:[`SPEC-${i}`],dependsOn:i===0?Array.from({length:2000},(_,j)=>`TASK-${j+1}`):[]}));
    const safe=project(cards,'timeline_mode=all&selected_task=TASK-0&trace_direct_page=40&trace_transitive_page=99');
    expect(safe.timeline.selection!.directRelatedSpecIds).toHaveLength(2000);
    expect(safe.relatedSpecPages!.direct).toMatchObject({page:40,requestedPage:40,total:2000,totalPages:40});expect(safe.relatedSpecPages!.direct.ids).toEqual(safe.timeline.selection!.directRelatedSpecIds.slice(1950));
    expect(safe.relatedSpecPages!.transitive).toMatchObject({page:1,requestedPage:99,total:0,totalPages:1,ids:[]});
    const bad=structuredClone(safe);bad.relatedSpecPages!.direct.ids.reverse();expect(isWorkspaceTimelineProjection(bad)).toBe(false);
    const missing=structuredClone(safe);missing.relatedSpecPages=null;expect(isWorkspaceTimelineProjection(missing)).toBe(false);
    const noSelection=project(cards);expect(noSelection.relatedSpecPages).toBeNull();
  });
});
