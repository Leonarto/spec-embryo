import {afterAll,beforeAll,describe,expect,test} from 'bun:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {initializeProject,loadProjectContext} from '../src/repository.ts';
import {createWorkspaceSource} from '../src/services/workspace.ts';
import {resolveUiProject,type UiProjectSelection} from '../src/services/ui-projects.ts';
import {buildWorkspaceDetailEnvelope,parseInspectorIdentity,type WorkspaceDetailEnvelope} from '../src/services/workspace-detail.ts';
import {normalizeViewQuery,workspaceListURL,workspaceRequestKey} from '../src/services/workspace-query.ts';
import {InspectorHistoryLedger,inspectorURL,isPlainActivation,withoutInspector} from '../web/src/lib/inspector/history.ts';
import {inspectorMode,maximumDockedWidth,parseInspectorWidth,stepInspectorWidth} from '../web/src/lib/inspector/geometry.ts';
import {InspectorDetailResource,validateDetailEnvelope} from '../web/src/lib/inspector/detail-resource.ts';
import {load as taskLoad} from '../web/src/routes/tasks/[taskId]/+page.server.ts';
import {load as specLoad} from '../web/src/routes/specs/[specId]/+page.server.ts';
import {load as layoutLoad} from '../web/src/routes/+layout.server.ts';
import {GET} from '../web/src/routes/workspace-detail/+server.ts';
let selection:UiProjectSelection;
let root:string,task:WorkspaceDetailEnvelope,spec:WorkspaceDetailEnvelope,missing:WorkspaceDetailEnvelope,source:ReturnType<typeof createWorkspaceSource>;
beforeAll(async()=>{root=await mkdtemp(join(tmpdir(),'spm-inspector-tests-'));await initializeProject(root);selection=await resolveUiProject(new URLSearchParams(),root,join(root,'empty-registry.json'));source=createWorkspaceSource(await loadProjectContext(root),Date.parse('2026-11-15T12:00:00Z'));task=buildWorkspaceDetailEnvelope(source,{kind:'task',id:source.context.tasks[0]!.id});spec=buildWorkspaceDetailEnvelope(source,{kind:'spec',id:source.context.specs[0]!.id});missing=buildWorkspaceDetailEnvelope(source,{kind:'task',id:'TASK-MISSING'});});
afterAll(async()=>{await rm(root,{recursive:true,force:true});});
const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status});
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};}
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
describe('inspector service and URL contracts',()=>{
 test('validates identities and separates inspector from list/trace request intention',()=>{
  expect(parseInspectorIdentity('task','TASK-001')).toEqual({kind:'task',id:'TASK-001'});for(const [kind,id] of [['bad','TASK-1'],['task','SPEC-1'],['spec','../x']])expect(parseInspectorIdentity(kind,id)).toBeUndefined();
  for(const route of ['tasks','specs','timeline'] as const){const a=new URLSearchParams('spec=SPEC-001&selected_task=TASK-001'),b=new URLSearchParams(a);b.set('inspect','spec:SPEC-001');b.set('section','document');expect(workspaceRequestKey(route,a)).toBe(workspaceRequestKey(route,b));}
  expect(workspaceRequestKey('timeline',new URLSearchParams('selected_task=TASK-001'))).not.toBe(workspaceRequestKey('timeline',new URLSearchParams('selected_task=TASK-002')));
  expect(workspaceListURL('http://local/tasks?q=x&inspect=task:TASK-1&section=document')).toBe('http://local/tasks?q=x');
  expect(normalizeViewQuery('tasks',new URLSearchParams('inspect=spec:SPEC-001&section=document')).inspect?.kind).toBe('spec');
 });
 test('projects shared detail envelopes and preserves local found:false',()=>{
  expect(validateDetailEnvelope(task,task)).toBe(true);expect(validateDetailEnvelope(spec,spec)).toBe(true);expect(validateDetailEnvelope(missing,missing)).toBe(true);expect(missing.detail.found).toBe(false);expect(task.revision).toBe(source.revision);
  expect(task.kind==='task'&&task.detail.found&&task.detail.task.id).toBe(source.context.tasks[0]!.id);
 });
 test('endpoint validates before IO and returns no-store 200/404/500 without list facade',async()=>{
  const invoke=(query:string,locals:object)=>GET({url:new URL('http://local/workspace-detail?'+query),locals} as never);
  const invalid=await invoke('kind=task&id=../outside',{get workspaceSource(){throw new Error('must not load');}});expect(invalid.status).toBe(400);
  const valid=await invoke(`kind=task&id=${task.id}`,{workspaceSource:Promise.resolve(source)});expect(valid.status).toBe(200);expect(valid.headers.get('cache-control')).toBe('no-store');expect((await valid.json()).detail.found).toBe(true);
  const absent=await invoke('kind=task&id=TASK-MISSING',{workspaceSource:Promise.resolve(source)});expect(absent.status).toBe(404);expect((await absent.json()).detail.found).toBe(false);
  const failed=await invoke('kind=task&id=TASK-001',{get workspaceSource(){throw new Error('read failure');}});expect(failed.status).toBe(500);expect(failed.headers.get('cache-control')).toBe('no-store');
 });
 test('canonical missing GET throws404 while direct list inspector remains a local DTO',async()=>{
  await expect(taskLoad({params:{taskId:'TASK-MISSING'},locals:{workspaceSource:Promise.resolve(source)}} as never)).rejects.toMatchObject({status:404});
  await expect(specLoad({params:{specId:'SPEC-MISSING'},locals:{workspaceSource:Promise.resolve(source)}} as never)).rejects.toMatchObject({status:404});
  const result=await layoutLoad({url:new URL('http://local/tasks?inspect=task:TASK-MISSING'),locals:{projectSelection:selection,workspaceSource:Promise.resolve(source)}} as never);
  expect(result).toMatchObject({inspector:{kind:'task',id:'TASK-MISSING',detail:{found:false}},inspectorReadError:false});
  const canonical=await layoutLoad({url:new URL(`http://local/tasks/${task.id}?inspect=spec:${spec.id}`),locals:{projectSelection:selection,workspaceSource:Promise.resolve(source)}} as never);expect(canonical).toMatchObject({inspector:null});
 });
 test('preserves every unrelated parameter and modified identity activation',()=>{
  const initial='http://local/timeline?selected_task=TASK-2&scope=all&q=x';const open=inspectorURL(initial,{kind:'spec',id:'SPEC-1'},'document');expect(withoutInspector(open)).toBe(initial);expect(new URL(open).searchParams.get('selected_task')).toBe('TASK-2');
  const event={button:0,ctrlKey:false,metaKey:false,shiftKey:false,altKey:false,defaultPrevented:false};expect(isPlainActivation(event)).toBe(true);for(const patch of [{button:1},{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{defaultPrevented:true}])expect(isPlainActivation({...event,...patch})).toBe(false);
 });
});
describe('verified session entry ledger',()=>{
 test('Back closes only a proven immediate same-query predecessor',()=>{
  const ledger=new InspectorHistoryLedger(),base='http://local/tasks?q=review',open=inspectorURL(base,{kind:'task',id:'TASK-1'});ledger.record({id:'base',url:base});ledger.record({id:'open',url:open,predecessor:{id:'base',url:base}});expect(ledger.canBackClose('open',open)).toBe(true);
  const second=inspectorURL(base,{kind:'task',id:'TASK-2'},'relations');ledger.replace('open',second);expect(ledger.canBackClose('open',second)).toBe(true);
  expect(ledger.canBackClose('open',inspectorURL('http://local/tasks?q=blocked',{kind:'task',id:'TASK-2'}))).toBe(false);expect(new InspectorHistoryLedger().canBackClose('open',second)).toBe(false);
  const filtered=inspectorURL('http://local/tasks?q=blocked',{kind:'task',id:'TASK-2'});ledger.record({id:'filter',url:filtered});expect(ledger.canBackClose('filter',filtered)).toBe(false);expect(ledger.canBackClose('open',second)).toBe(true);
 });
 test('unverified or forged markers/URLs never authorize Back',()=>{
  const ledger=new InspectorHistoryLedger();ledger.record({id:'open',url:'http://local/tasks?inspect=task%3ATASK-1',predecessor:{id:'missing',url:'http://local/tasks'}});expect(ledger.canBackClose('open','http://local/tasks?inspect=task%3ATASK-1')).toBe(false);expect(ledger.verified('open','http://other/tasks?inspect=task%3ATASK-1')).toBeUndefined();
 });
});
describe('responsive inspector geometry',()=>{
 test('docks only with both viewport and real table minimum, keeping explicit width',()=>{
  expect(inspectorMode(1440,1360,440)).toBe('docked');expect(inspectorMode(1280,1000,440)).toBe('overlay');expect(inspectorMode(1199,1300,360)).toBe('overlay');expect(inspectorMode(767,700,440)).toBe('fullscreen');expect(inspectorMode(1200,1008,440)).toBe('docked');expect(inspectorMode(1200,1007,440)).toBe('overlay');
  expect(maximumDockedWidth(1080)).toBe(512);expect(stepInspectorWidth(440,'ArrowLeft',512)).toBe(456);expect(stepInspectorWidth(440,'ArrowRight',512)).toBe(424);expect(stepInspectorWidth(440,'End',512)).toBe(512);expect(stepInspectorWidth(440,'Home',512)).toBe(360);
  expect(parseInspectorWidth('{bad')).toBe(440);expect(parseInspectorWidth('{"version":1,"width":999}')).toBe(640);expect(parseInspectorWidth('{"version":2,"width":360}')).toBe(440);
 });
});
describe('owned detail transport',()=>{
 test('matching SSR seed avoids duplicate fetch and section work',async()=>{let calls=0;const resource=new InspectorDetailResource('http://local',{onChange:()=>{},focusDebounceMs:2,fetcher:async()=>{calls++;return response(task);}});resource.select(task,task);expect(resource.current.snapshot).toBe(task);resource.select(task);resource.focus();await pause(5);expect(calls).toBe(0);resource.dispose();});
 test('identity switch removes previous body immediately, aborts and rejects late success/error',async()=>{
  for(const lateError of [false,true]){const a=deferred<Response>(),b=deferred<Response>();let calls=0;const signals:AbortSignal[]=[];const resource=new InspectorDetailResource('http://local',{onChange:()=>{},fetcher:async(_url,init)=>{signals.push(init!.signal as AbortSignal);return ++calls===1?a.promise:b.promise;}});resource.select(task);resource.select(spec);expect(resource.current.snapshot).toBeUndefined();expect(resource.current.identity?.id).toBe(spec.id);expect(signals[0]!.aborted).toBe(true);b.resolve(response(spec));await pause(0);if(lateError)a.reject(new Error('late'));else a.resolve(response(task));await pause(0);expect(resource.current.snapshot).toEqual(spec);expect(resource.current.error).toBeUndefined();resource.dispose();}
 });
 test('refresh failure retains same-identity detail and Retry accepts404 locally',async()=>{
  let failing=true;const resource=new InspectorDetailResource('http://local',{onChange:()=>{},fetcher:async()=>{if(failing)throw new Error('network');return response({...missing,id:task.id,detail:{...missing.detail,id:task.id}},404);}});resource.select(task,task);const success=resource.current.lastSuccessAt;await resource.refresh();expect(resource.current.snapshot).toBe(task);expect(resource.current.lastSuccessAt).toBe(success);expect(resource.current.error).toBe('network');failing=false;await resource.refresh();expect(resource.current.snapshot?.detail.found).toBe(false);expect(resource.current.error).toBeUndefined();resource.dispose();
 });
 test('malformed/identity/status failures cannot commit, and timeout releases pending',async()=>{
  for(const invalid of [response({...task,id:'TASK-OTHER'}),response({...task,detail:{}}),response(task,500),response(missing,200)]){const resource=new InspectorDetailResource('http://local',{onChange:()=>{},fetcher:async()=>invalid});resource.select(task,task);await resource.refresh();expect(resource.current.snapshot).toBe(task);expect(resource.current.error).toBe('response');resource.dispose();}
  const pending=deferred<Response>();let signal:AbortSignal|undefined;const resource=new InspectorDetailResource('http://local',{onChange:()=>{},deadlineMs:10,fetcher:async(_url,init)=>{signal=init!.signal as AbortSignal;return pending.promise;}});resource.select(task,task);await resource.refresh();expect(resource.current).toMatchObject({pending:false,error:'timeout'});expect(signal?.aborted).toBe(true);pending.resolve(response(task));await pause(0);resource.dispose();
 });
 test('disposal/close invalidates late completion and focus uses visibility/staleness',async()=>{
  let calls=0,visible=false,now=10000;const pending=deferred<Response>();const resource=new InspectorDetailResource('http://local',{onChange:()=>{},now:()=>now,isVisible:()=>visible,focusDebounceMs:2,fetcher:async()=>{calls++;return pending.promise;}});resource.select(task,task);resource.focus();await pause(5);expect(calls).toBe(0);visible=true;now+=6001;resource.focus();await pause(5);expect(calls).toBe(1);resource.focus();await pause(5);expect(calls).toBe(1);resource.select(undefined);pending.resolve(response(task));await pause(0);expect(resource.current.snapshot).toBeUndefined();expect(resource.current.pending).toBe(false);resource.dispose();
 });
});
