import {describe,expect,test} from 'bun:test';
import {graphContext,graphSpec,graphTask,seededGraph} from './fixtures/graph-inputs.ts';
import {buildSpecDetailFromContext,buildTaskDetailFromContext} from '../src/services/details.ts';
import {buildWorkspaceDetailEnvelope,buildWorkspaceRelationEnvelope} from '../src/services/workspace-detail.ts';
import {createWorkspaceSource} from '../src/services/workspace.ts';
import {boundSpecDetail,boundTaskDetail,normalizeRelationPage,parseRelationPages,relationPageHref,windowRelation} from '../src/services/detail-relations.ts';
import {validateDetailEnvelope,validateRelationEnvelope,validateRelationWindow} from '../web/src/lib/inspector/detail-resource.ts';
import {inspectorURL,withoutInspector} from '../web/src/lib/inspector/history.ts';
import {GET} from '../web/src/routes/workspace-relations/+server.ts';
import {load as taskLoad} from '../web/src/routes/tasks/[taskId]/+page.server.ts';
import {load as specLoad} from '../web/src/routes/specs/[specId]/+page.server.ts';

describe('v2 bounded detail projection',()=>{
 test('10k fanout and linked tasks preserve full totals/order without serializing nested cards or duplicate group arrays',()=>{
  const tasks=Array.from({length:10000},(_,n)=>graphTask(`TASK-${String(n).padStart(5,'0')}`,{dependsOn:n?['TASK-00000']:[],priority:n%3,status:n%2?'review':'todo'}));
  const context=graphContext(tasks,[graphSpec('SPEC-0',tasks.map(task=>task.id))]),before=JSON.stringify(context),source=createWorkspaceSource(context,0);
  const task=buildWorkspaceDetailEnvelope(source,{kind:'task',id:'TASK-00000'},{blockingTasks:100});
  const spec=buildWorkspaceDetailEnvelope(source,{kind:'spec',id:'SPEC-0'},{linkedTasks:100});
  if(task.kind!=='task'||!task.detail.found||spec.kind!=='spec'||!spec.detail.found)throw Error('fixture');
  expect(task.detail.blockingTasks).toMatchObject({page:100,pageSize:100,total:9999,totalPages:100});expect(task.detail.blockingTasks.items).toHaveLength(99);
  expect(spec.detail.linkedTasks).toMatchObject({page:100,total:10000,totalPages:100});expect(spec.detail.linkedTasks.items).toHaveLength(100);
  expect(spec.detail.linkedTaskGroups.reduce((total,group)=>total+group.total,0)).toBe(10000);
  const rawTask=buildTaskDetailFromContext(context,'TASK-00000',source.analysis),rawSpec=buildSpecDetailFromContext(context,'SPEC-0',source.analysis);
  if(!rawTask.found||!rawSpec.found)throw Error('fixture');
  expect(task.detail.blockingTasks.items.map(row=>row.id)).toEqual(rawTask.blockingTasks.slice(9900).map(row=>row.id));
  expect(spec.detail.linkedTasks.items.map(row=>row.id)).toEqual(rawSpec.linkedTaskGroups.flatMap(group=>group.tasks).slice(9900).map(row=>row.id));
  expect(spec.detail.progress).toEqual(rawSpec.progress);expect(JSON.stringify(spec)).not.toContain('dependsOn');expect(JSON.stringify(spec.detail.linkedTaskGroups)).not.toContain('"tasks"');
  expect(JSON.parse(JSON.stringify(task)).detail.blockingTasks.items).toHaveLength(99);expect(JSON.stringify(context)).toBe(before);
  expect(validateDetailEnvelope(task,task)).toBe(true);expect(validateDetailEnvelope(spec,spec)).toBe(true);
 });
 test('every page across mixed/missing/duplicate references follows legacy presentation order including group splits',()=>{
  for(const seed of [1,7,18]){
   const context=seededGraph(seed,true),source=createWorkspaceSource(context,0);
   for(const doc of context.tasks){const full=buildTaskDetailFromContext(context,doc.id,source.analysis),bounded=boundTaskDetail(full);if(!full.found||!bounded.found)throw Error('fixture');
    for(const name of ['dependencies','blockingTasks','unmetDependencyIds','linkedSpecs'] as const)expect(bounded[name].items.map(item=>typeof item==='string'?item:item.id)).toEqual(full[name].map(item=>typeof item==='string'?item:item.id));
   }
   for(const spec of context.specs){const full=buildSpecDetailFromContext(context,spec.id,source.analysis),bounded=boundSpecDetail(full);if(!full.found||!bounded.found)throw Error('fixture');expect(bounded.linkedTasks.items.map(row=>row.id)).toEqual(full.linkedTaskGroups.flatMap(group=>group.tasks.map(task=>task.id)));}
  }
  const tasks=Array.from({length:251},(_,n)=>graphTask(`TASK-${n}`,{status:n<80?'in_progress':n<170?'review':'todo'})),source=createWorkspaceSource(graphContext(tasks),0);
  const detail=buildWorkspaceDetailEnvelope(source,{kind:'spec',id:'SPEC-0'},{linkedTasks:2});if(detail.kind!=='spec'||!detail.detail.found)throw Error('fixture');
  expect(detail.detail.linkedTasks.items.filter(row=>row.groupId==='review')).toHaveLength(70);expect(detail.detail.linkedTasks.items.filter(row=>row.groupId==='todo')).toHaveLength(30);
 });
 test('all high-cardinality task collections, safe/clamped/empty pages and minimal missing are bounded',()=>{
  const tasks=Array.from({length:251},(_,n)=>graphTask(`TASK-${n}`)),specs=Array.from({length:251},(_,n)=>graphSpec(`SPEC-${n}`,[]));
  tasks[0]={...tasks[0]!,dependsOn:tasks.slice(1).map(task=>task.id).concat(['MISSING','MISSING']),specIds:specs.map(spec=>spec.id)};
  const source=createWorkspaceSource(graphContext(tasks,specs),0),env=buildWorkspaceDetailEnvelope(source,{kind:'task',id:'TASK-0'},{dependencies:999,linkedSpecs:2,unmetDependencyIds:3});
  if(env.kind!=='task'||!env.detail.found)throw Error('fixture');expect(env.detail.dependencies.page).toBe(3);expect(env.detail.dependencies.items).toHaveLength(50);expect(env.detail.linkedSpecs.items).toHaveLength(100);expect(env.detail.unmetDependencyIds.items).toHaveLength(52);
  expect(Object.keys(env.detail.dependencies.items[0]!)).toEqual(['id','title','summary']);expect(Object.keys(env.detail.linkedSpecs.items[0]!)).toEqual(['id']);
  expect(windowRelation([],999)).toEqual({page:1,pageSize:100,total:0,totalPages:1,items:[]});for(const invalid of [0,-1,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1,'2e1','+2','-2','',undefined])expect(normalizeRelationPage(invalid)).toBe(1);
  const missing=buildWorkspaceDetailEnvelope(source,{kind:'task',id:'TASK-MISSING'});expect(missing.detail).toEqual({found:false,kind:'task',id:'TASK-MISSING'});expect(JSON.stringify(missing)).not.toContain('availableIds');
 });
 test('201 related handoffs include every OR match, stable ties and irrelevant omissions while legacy stays newest3',()=>{
  const context=graphContext([graphTask('TASK-0',{specIds:['SPEC-0']})]);context.handoffs=Array.from({length:203},(_,n)=>({docKind:'handoff' as const,id:`HANDOFF-${n}`,title:`Handoff ${n}`,summary:'Full summary',createdAt:n<100?'2026-11-15':'2026-11-14',activeTaskIds:n<201&&n%2?['TASK-0']:[],relatedSpecIds:n<201&&!(n%2)?['SPEC-0']:[],tags:[],body:'untouched',filePath:`/fixture/handoff-${n}.md`}));
  const before=JSON.stringify(context),source=createWorkspaceSource(context,0);
  for(const kind of ['task','spec'] as const){const id=kind==='task'?'TASK-0':'SPEC-0',first=buildWorkspaceDetailEnvelope(source,{kind,id}),last=buildWorkspaceDetailEnvelope(source,{kind,id},{relatedHandoffs:3}),legacy=kind==='task'?buildTaskDetailFromContext(context,id):buildSpecDetailFromContext(context,id);
   if(!first.detail.found||!last.detail.found||!legacy.found)throw Error('fixture');expect(first.detail.relatedHandoffs.total).toBe(201);expect(first.detail.relatedHandoffs.items).toHaveLength(100);expect(last.detail.relatedHandoffs.items.map(row=>row.id)).toEqual(['HANDOFF-200']);expect(first.detail.relatedHandoffs.items.slice(0,3)).toEqual(legacy.relatedHandoffs);expect(first.detail.relatedHandoffs.items[99]?.id).toBe('HANDOFF-99');expect(legacy.relatedHandoffs).toHaveLength(3);}
  expect(JSON.stringify(context)).toBe(before);
 });
 test('SSR/native URLs retain unrelated state; close/new identity clears relations and sections retain them',()=>{
  const value='http://local/tasks?q=hello&inspect=task:TASK-0&section=document&trace=x&rel.blockingTasks=2&rel.relatedHandoffs=3';
  const next=new URL(relationPageHref(value,'blockingTasks',4));expect(next.searchParams.get('q')).toBe('hello');expect(next.searchParams.get('section')).toBe('document');expect(next.searchParams.get('rel.relatedHandoffs')).toBe('3');
  expect(new URL(inspectorURL(value,{kind:'task',id:'TASK-0'},'relations')).searchParams.get('rel.blockingTasks')).toBe('2');expect(new URL(inspectorURL(value,{kind:'task',id:'TASK-1'})).searchParams.has('rel.blockingTasks')).toBe(false);expect(new URL(withoutInspector(value)).searchParams.has('rel.relatedHandoffs')).toBe(false);
  expect(parseRelationPages('spec',new URLSearchParams('rel.dependencies=3&rel.linkedTasks=2&rel.unknown=9'))).toEqual({linkedTasks:2,relatedHandoffs:1});
 });
 test('relation endpoint validates before IO, no-store statuses and requested intent; canonical retains global revision',async()=>{
  const source=createWorkspaceSource(graphContext([graphTask('TASK-0')]),0),locals={workspaceSource:Promise.resolve(source)};
  const invoke=(query:string,state:object=locals)=>GET({url:new URL('http://local/workspace-relations?'+query),locals:state} as never);
  for(const query of ['kind=task&id=../oops&relation=dependencies','kind=spec&id=SPEC-0&relation=dependencies','kind=task&id=TASK-0&relation=bodySections'])expect((await invoke(query,{get workspaceSource(){throw Error('no IO');}})).status).toBe(400);
  const ok=await invoke('kind=task&id=TASK-0&relation=dependencies&page=999'),value=await ok.json();expect(ok.status).toBe(200);expect(ok.headers.get('cache-control')).toBe('no-store');expect(value.requestedPage).toBe(999);expect(value.window.page).toBe(1);expect(validateRelationEnvelope(value,{kind:'task',id:'TASK-0'},'dependencies',999)).toBe(true);expect(JSON.stringify(value)).not.toContain('bodySections');
  expect((await invoke('kind=task&id=TASK-MISSING&relation=dependencies')).status).toBe(404);expect((await invoke('kind=task&id=TASK-0&relation=dependencies',{get workspaceSource(){throw Error('read fail');}})).status).toBe(500);
  const task=await taskLoad({url:new URL('http://local/tasks/TASK-0?rel.dependencies=99'),params:{taskId:'TASK-0'},locals} as never) as any;
  const spec=await specLoad({url:new URL('http://local/specs/SPEC-0?rel.linkedTasks=2'),params:{specId:'SPEC-0'},locals} as never) as any;
  expect(task.sourceRevision).toBe(source.revision);expect(spec.sourceRevision).toBe(source.revision);expect(spec.detail.linkedTasks.page).toBe(1);expect(spec.pages.linkedTasks).toBe(2);expect(spec).not.toHaveProperty('specRevision');
 });
 test('unknown versions, unsafe counts and legacy nested relation arrays are rejected',()=>{
  const source=createWorkspaceSource(graphContext([graphTask('TASK-0')]),0),env=buildWorkspaceDetailEnvelope(source,{kind:'task',id:'TASK-0'});
  expect(validateDetailEnvelope({...env,schemaVersion:1},env)).toBe(false);expect(validateDetailEnvelope({...env,schemaVersion:99},env)).toBe(false);
  for(const patch of [{total:Infinity},{total:1.2},{page:0},{totalPages:0},{pageSize:200},{items:Array(101).fill('x')}])expect(validateRelationWindow({...windowRelation([],1),...patch},'unmetDependencyIds')).toBe(false);
  if(!env.detail.found)throw Error('fixture');expect(validateDetailEnvelope({...env,detail:{...env.detail,dependencies:[]}},env)).toBe(false);
 });
});
