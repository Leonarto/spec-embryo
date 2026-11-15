import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProjectContext, SpecDocument, TaskDocument } from "../src/domain.ts";
import * as engine from "../src/engine.ts";
import * as dashboard from "../src/services/dashboard.ts";
import { initializeProject, loadProjectContext } from "../src/repository.ts";
import { buildWorkspaceEnvelope, createWorkspaceSource, queryWorkspaceOptions, queryWorkspaceSpecs, queryWorkspaceTasks } from "../src/services/workspace.ts";
import { parseWorkspaceListQuery } from "../src/services/workspace-query.ts";
import { buildSpecDetailFromContext, buildTaskDetailFromContext } from "../src/services/details.ts";
import { getWorkspaceRequestSource, type WorkspaceRequestState } from "../web/src/lib/server/workspace.ts";

const now=Date.parse('2026-11-15T12:00:00Z');
let root:string,base:ProjectContext;
const params=(text:string)=>new URLSearchParams(text);
function task(id:string,patch:Partial<TaskDocument>={}):TaskDocument{return {docKind:'task',id,title:id,summary:'Fixture',status:'todo',priority:2,specIds:['SPEC-1'],dependsOn:[],blockedBy:[],tags:[],body:'Private document body',filePath:`/fixture/${id}.md`,...patch};}
function spec(id:string,taskIds:string[],patch:Partial<SpecDocument>={}):SpecDocument{return {docKind:'spec',id,title:id,summary:'Intent',status:'active',taskIds,tags:[],body:'Spec body',filePath:`/fixture/${id}.md`,...patch};}
function context():ProjectContext{return {...base,tasks:[task('TASK-1',{status:'done',archivedAt:'2026-11-12T00:00:00Z',completedAt:'2026-11-13T00:00:00Z',priority:-1}),task('TASK-2',{dependsOn:['TASK-1'],priority:0,title:'Ｆｏｏ alpha'}),task('TASK-3',{dependsOn:['TASK-4'],priority:1.5}),task('TASK-4',{status:'cancelled',cancelledAt:'2026-11-14T00:00:00Z'}),task('TASK-5',{status:'review',specIds:['SPEC-2'],updatedAt:'2026-11-15T00:00:00Z'}),task('TASK-6',{status:'done',completedAt:'2025-01-01T00:00:00Z'}),task('TASK-7',{status:'in_progress',updatedAt:'2026-11-15T00:00:00Z'})],specs:[spec('SPEC-1',['TASK-1','TASK-3','MISSING']),spec('SPEC-2',['TASK-4','TASK-5'],{status:'archived'})]};}

beforeAll(async()=>{root=await mkdtemp(join(tmpdir(),'spm-workspace-tests-'));await initializeProject(root);base=await loadProjectContext(root);});
afterAll(async()=>{await rm(root,{recursive:true,force:true});});

describe('bounded workspace projections',()=>{
  test('keeps request intention stable across page removal, empty results, and reappearing pages',async()=>{
    const make=(count:number)=>({...base,tasks:Array.from({length:count},(_,n)=>task(`TASK-${n}`)),specs:[spec('SPEC-1',[])]});
    const url=params('page=2');
    const original=await buildWorkspaceEnvelope(createWorkspaceSource(make(101),now),'tasks',url);
    expect(original.data.result).toMatchObject({requestedPage:2,page:2,totalMatching:101});
    for(const count of [100,0,101]){
      const fresh=await buildWorkspaceEnvelope(createWorkspaceSource(make(count),now),'tasks',url);
      expect(fresh.requestKey).toBe(original.requestKey);
      expect(fresh.data.result).toMatchObject({requestedPage:2,page:count===101?2:1,totalMatching:count});
      expect(fresh.data.result.normalizedQuery.page).toBe(fresh.data.result.page);
      expect(JSON.parse(JSON.stringify(fresh)).requestKey).toBe(fresh.requestKey);
    }
    expect((await buildWorkspaceEnvelope(createWorkspaceSource(make(101),now),'tasks',params('page=1'))).requestKey).not.toBe(original.requestKey);
  });
  test('reports unavailable spec intentions without silently broadening results or changing request identity',async()=>{
    const make=(ids:string[])=>({...base,tasks:[task('TASK-A',{specIds:['SPEC-A']}),task('TASK-B',{specIds:['SPEC-B']})],specs:ids.map(id=>spec(id,[]))});
    for(const intent of ['spec=SPEC-A&spec=SPEC-B','spec=SPEC-A']){
      const original=await buildWorkspaceEnvelope(createWorkspaceSource(make(['SPEC-A','SPEC-B']),now),'tasks',params(intent));
      const missing=await buildWorkspaceEnvelope(createWorkspaceSource(make(['SPEC-B']),now),'tasks',params(intent));
      expect(missing.requestKey).toBe(original.requestKey);
      expect(missing.data.filters.unavailableSpecIds).toEqual(['SPEC-A']);
      expect(missing.data.filters.selectedSpecIds).toEqual(intent.includes('SPEC-B')?['SPEC-B']:[]);
      expect(missing.data.result.rows.map(row=>row.id)).toEqual(intent.includes('SPEC-B')?['TASK-B']:['TASK-A','TASK-B']);
      const returned=await buildWorkspaceEnvelope(createWorkspaceSource(make(['SPEC-A','SPEC-B']),now),'tasks',params(intent));
      expect(returned.requestKey).toBe(original.requestKey);expect(returned.data.filters.unavailableSpecIds).toEqual([]);expect(returned.data.result.rows).toEqual(original.data.result.rows);
    }
  });
  test('orders timestamp instants with offsets chronologically and invalid timestamps last in either direction',()=>{
    const ctx=context();
    ctx.tasks=[task('TASK-A',{updatedAt:'2026-11-15T02:00:00+03:00'}),task('TASK-B',{updatedAt:'2026-11-15T00:00:00Z'}),task('TASK-C',{updatedAt:'invalid'}),task('TASK-D')];
    ctx.specs=[spec('SPEC-A',[],{updatedAt:'2026-11-15T02:00:00+03:00'}),spec('SPEC-B',[],{updatedAt:'2026-11-15T00:00:00Z'}),spec('SPEC-C',[],{updatedAt:'invalid'})];
    const source=createWorkspaceSource(ctx,now);
    expect(queryWorkspaceTasks(source,parseWorkspaceListQuery('task',params('sort=updatedAt.asc'))).rows.map(t=>t.id)).toEqual(['TASK-A','TASK-B','TASK-C','TASK-D']);
    expect(queryWorkspaceTasks(source,parseWorkspaceListQuery('task',params('sort=updatedAt.desc'))).rows.map(t=>t.id)).toEqual(['TASK-B','TASK-A','TASK-C','TASK-D']);
    expect(queryWorkspaceSpecs(source,parseWorkspaceListQuery('spec',params('sort=updatedAt.asc'))).rows.map(t=>t.id)).toEqual(['SPEC-A','SPEC-B','SPEC-C']);
    expect(queryWorkspaceSpecs(source,parseWorkspaceListQuery('spec',params('sort=updatedAt.desc'))).rows.map(t=>t.id)).toEqual(['SPEC-B','SPEC-A','SPEC-C']);
  });
  test('filters effective statuses, OR facets/AND categories, scope, canonical numeric priorities and normalized search',()=>{
    const source=createWorkspaceSource(context(),now);
    const run=(query:string)=>queryWorkspaceTasks(source,parseWorkspaceListQuery('task',params(query)));
    expect(run('').totalMatching).toBe(6);
    expect(run('scope=archived').rows.map(t=>t.id)).toEqual(['TASK-1']);
    expect(run('scope=all&status=todo,blocked&spec=SPEC-1&priority=0,1.5').rows.map(t=>[t.id,t.effectiveStatus])).toEqual([['TASK-2','todo'],['TASK-3','blocked']]);
    expect(run('q=foo+ALPHA').rows.map(t=>t.id)).toEqual(['TASK-2']);
    expect(run('scope=all&window=7d').rows.map(t=>t.id)).toEqual(['TASK-1','TASK-4']);
    expect(run('status=blocked').rows[0]).toMatchObject({id:'TASK-3',rawStatus:'todo',effectiveStatus:'blocked',unmetDependencies:['TASK-4']});
    expect(run('status=review&spec=SPEC-1').rows).toEqual([]);
  });
  test('keeps canonical spec relation and status independent of metric taskScope/window',()=>{
    const source=createWorkspaceSource(context(),now);
    const run=(query:string)=>queryWorkspaceSpecs(source,parseWorkspaceListQuery('spec',params(query)));
    expect(run('spec=SPEC-1').rows[0]).toMatchObject({linkedTaskCount:2,progress:{done:1,blocked:1,completionRatio:.5}});
    expect(run('spec=SPEC-1&taskScope=unarchived').rows[0]).toMatchObject({linkedTaskCount:1,progress:{done:0,blocked:1}});
    expect(run('status=archived&taskScope=all').rows.map(s=>s.id)).toEqual(['SPEC-2']);
    expect(run('spec=SPEC-2&window=7d').rows[0]).toMatchObject({linkedTaskCount:1,progress:{cancelled:1,review:0}});
  });
  test('uses stable global ordering, empty values last in either direction, and clamps pages after filtering',()=>{
    const ctx=context();ctx.tasks[0]!.updatedAt='2026-01-01T00:00:00Z';
    const source=createWorkspaceSource(ctx,now);
    const run=(query:string)=>queryWorkspaceTasks(source,parseWorkspaceListQuery('task',params(query)));
    expect(run('scope=all&sort=updatedAt.desc').rows.map(t=>t.id)).toEqual(['TASK-5','TASK-7','TASK-1','TASK-2','TASK-3','TASK-4','TASK-6']);
    expect(run('scope=all&sort=updatedAt.asc').rows.map(t=>t.id)).toEqual(['TASK-1','TASK-5','TASK-7','TASK-2','TASK-3','TASK-4','TASK-6']);
    expect(run('page=999&pageSize=50')).toMatchObject({page:1,pageSize:50,totalMatching:6,normalizedQuery:{page:1}});
    expect(run('q=no-match&page=999')).toMatchObject({rows:[],page:1,totalMatching:0,totalInScope:6});
  });
  test('keeps input revision deterministic without clocks and updates projections when content changes',async()=>{
    const a=createWorkspaceSource(context(),now),b=createWorkspaceSource(context(),now+1000);
    expect(a.revision).toBe(b.revision);
    const ea=await buildWorkspaceEnvelope(a,'tasks',params('spec=SPEC-1'));
    const eb=await buildWorkspaceEnvelope(b,'tasks',params('spec=SPEC-1'));
    expect(ea.revision).toBe(eb.revision);expect(ea.generatedAt).not.toBe(eb.generatedAt);
    const changed=context();changed.tasks[1]!.title='Changed externally';
    expect((await buildWorkspaceEnvelope(createWorkspaceSource(changed,now),'tasks',params('spec=SPEC-1'))).revision).not.toBe(ea.revision);
    const wire=JSON.parse(JSON.stringify(ea));expect(wire).toEqual(JSON.parse(JSON.stringify(await buildWorkspaceEnvelope(a,'tasks',params('spec=SPEC-1')))));
    expect(wire.data.result.rows[0].body).toBeUndefined();expect(wire.data.timeline).toBeUndefined();expect(wire.data.kanban).toBeUndefined();expect(wire.data.agents).toBeUndefined();
  });
  test('does not invoke overview/timeline/facade for Tasks, Specs, options, or details',async()=>{
    const status=spyOn(engine,'deriveStatusSnapshot');const timeline=spyOn(dashboard,'buildTimelineProjection');const facade=spyOn(dashboard,'buildDashboardData');
    try{const source=createWorkspaceSource(context(),now);await buildWorkspaceEnvelope(source,'tasks',params(''));await buildWorkspaceEnvelope(source,'specs',params(''));queryWorkspaceOptions(source,{q:'',page:1,pageSize:50,selectedIds:[]});expect(buildTaskDetailFromContext(source.context,'TASK-3',source.analysis).found).toBe(true);expect(buildSpecDetailFromContext(source.context,'SPEC-1',source.analysis).found).toBe(true);expect(status).not.toHaveBeenCalled();expect(timeline).not.toHaveBeenCalled();expect(facade).not.toHaveBeenCalled();}finally{status.mockRestore();timeline.mockRestore();facade.mockRestore();}
  });
  test('shares one in-flight load/index per request and separates requests',async()=>{
    const locals:WorkspaceRequestState={};let loads=0,indexes=0;
    const factory=async()=>{loads++;await Promise.resolve();indexes++;return createWorkspaceSource(context(),now);};
    const first=getWorkspaceRequestSource(locals,root,factory),second=getWorkspaceRequestSource(locals,root,factory);
    expect(first).toBe(second);const [a,b]=await Promise.all([first,second]);expect(a).toBe(b);expect(loads).toBe(1);expect(indexes).toBe(1);
    expect(await getWorkspaceRequestSource({},root,factory)).not.toBe(a);expect(loads).toBe(2);
  });
  test('provides searched/paged options and selected IDs with explicit omitted-label diagnostics',()=>{
    const ctx=context();ctx.specs=Array.from({length:135},(_,n)=>spec(`SPEC-${String(n).padStart(3,'0')}`,[],{title:n===134?'Huge title '.repeat(2000):`Title ${n}`}));
    const source=createWorkspaceSource(ctx,now);
    const page=queryWorkspaceOptions(source,{q:'',page:2,pageSize:50,selectedIds:['SPEC-001','SPEC-134']});
    expect(page).toMatchObject({page:2,totalMatching:135});expect(page.options).toHaveLength(50);expect(page.options[0]!.id).toBe('SPEC-050');expect(page.selected.map(s=>s.id)).toEqual(['SPEC-001','SPEC-134']);expect(page.selected[1]).toMatchObject({labelOmitted:true,reason:'title-budget'});expect(page.selected[1]!.title).toBeUndefined();
    expect(queryWorkspaceOptions(source,{q:'TITLE 12',page:1,pageSize:50,selectedIds:[]}).options.map(s=>s.id)).toEqual(['SPEC-012','SPEC-120','SPEC-121','SPEC-122','SPEC-123','SPEC-124','SPEC-125','SPEC-126','SPEC-127','SPEC-128','SPEC-129']);
  });
  test('bounds 10k/2k page100 payload including shell and first option page, without foreign arrays/bodies',async()=>{
    const ctx={...base,tasks:Array.from({length:10_000},(_,n)=>task(`TASK-${String(n+1).padStart(5,'0')}`,{specIds:[`SPEC-${String(n%2000+1).padStart(5,'0')}`],dependsOn:n?[`TASK-${String(n).padStart(5,'0')}`]:[]})),specs:Array.from({length:2000},(_,n)=>spec(`SPEC-${String(n+1).padStart(5,'0')}`,Array.from({length:5},(_,i)=>`TASK-${String(n+1+i*2000).padStart(5,'0')}`)))};
    const source=createWorkspaceSource(ctx,now);
    for(const route of ['tasks','specs'] as const){const envelope=await buildWorkspaceEnvelope(source,route,params('page=2'));expect(envelope.data.result.rows).toHaveLength(100);expect(envelope.data.result.totalMatching).toBe(route==='tasks'?10_000:2000);expect(envelope.data.filters.options.options).toHaveLength(50);const text=JSON.stringify(envelope);expect(Buffer.byteLength(text)).toBeLessThanOrEqual(250*1024);expect(text).not.toContain('Private document body');expect(text).not.toContain('"body"');expect(text).not.toContain('"kanban"');expect(text).not.toContain('"timeline"');}
  });
  test('preserves legacy timeline semantics with groups only and explicit archive override',async()=>{
    const source=createWorkspaceSource(context(),now);
    const old=await buildWorkspaceEnvelope(source,'timeline',params('spec=SPEC-1&timeline_mode=all'));
    expect(old.data.filters).toMatchObject({legacyArchive:true,scope:'all'});expect(old.data.timeline.taskCount).toBe(5);expect('items'in old.data.timeline).toBe(false);
    const active=await buildWorkspaceEnvelope(source,'timeline',params('spec=SPEC-1&scope=unarchived&timeline_mode=all'));
    expect(active.data.timeline.taskCount).toBe(4);expect(active.data.filters.legacyArchive).toBe(false);
  });
});
