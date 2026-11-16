import {describe,expect,test} from 'bun:test';
import {graphContext,graphTask} from './fixtures/graph-inputs.ts';
import {createWorkspaceSource} from '../src/services/workspace.ts';
import {buildWorkspaceDetailEnvelope,buildWorkspaceRelationEnvelope,type WorkspaceDetailEnvelope} from '../src/services/workspace-detail.ts';
import {type DetailRelation,type RelationPages} from '../src/services/detail-relations.ts';
import {InspectorDetailResource} from '../web/src/lib/inspector/detail-resource.ts';
const context=graphContext(Array.from({length:451},(_,n)=>graphTask(`TASK-${n}`,{dependsOn:n?['TASK-0']:Array.from({length:251},(_,j)=>`MISSING-${j}`)})));
const source=createWorkspaceSource(context,0),identity={kind:'task' as const,id:'TASK-0'};
const envelope=(pages:RelationPages={},revision='A')=>({...buildWorkspaceDetailEnvelope(source,identity,pages),revision}) as WorkspaceDetailEnvelope;
const relation=(name:DetailRelation,page:number,revision='A')=>({...buildWorkspaceRelationEnvelope(source,identity,name,page)!,revision});
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
function deferred(){let resolve!:(response:Response)=>void,reject!:(error:Error)=>void;const promise=new Promise<Response>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status});
function harness(seed=envelope()){
 const requests:Array<{url:URL;signal:AbortSignal;resolve:(response:Response)=>void;reject:(error:Error)=>void}>=[],canonized:RelationPages[]=[];
 const resource=new InspectorDetailResource('http://local',{onChange:()=>{},onCanonize:pages=>canonized.push(pages),fetcher:async(url,init)=>{const pending=deferred();requests.push({url:new URL(String(url)),signal:init!.signal as AbortSignal,...pending});return pending.promise;}});
 resource.select(identity,seed);canonized.length=0;return {resource,requests,canonized};
}
const windowAt=(resource:InspectorDetailResource,name='blockingTasks')=>(resource.current.snapshot!.detail as any)[name];
describe('revision-owned relation and full-snapshot races',()=>{
 test('failed page3 retains accepted page2 and URL intent; Retry targets3 and preserves other windows/body identity',async()=>{
  const {resource,requests}=harness(envelope({blockingTasks:2,unmetDependencyIds:2})),seed=resource.current.snapshot!,body=(seed.detail as any).bodySections,other=windowAt(resource,'unmetDependencyIds');
  resource.setPages({...resource.current.desiredPages,blockingTasks:3});expect(windowAt(resource).page).toBe(2);expect(resource.current.desiredPages.blockingTasks).toBe(3);expect(resource.current.relations.blockingTasks).toMatchObject({pending:true,requestedPage:3});
  requests[0]!.reject(new Error('offline'));await pause();expect(windowAt(resource).page).toBe(2);expect(resource.current.relations.blockingTasks).toMatchObject({pending:false,requestedPage:3,error:'network'});
  const retry=resource.loadRelation('blockingTasks');expect(requests[1]!.url.searchParams.get('page')).toBe('3');requests[1]!.resolve(response(relation('blockingTasks',3)));await retry;
  expect(windowAt(resource).page).toBe(3);expect(windowAt(resource,'unmetDependencyIds')).toBe(other);expect((resource.current.snapshot!.detail as any).bodySections).toBe(body);expect(resource.current.relations.blockingTasks?.error).toBeUndefined();resource.dispose();
 });
 test('same-identity history supersedes a pending page; late replies cannot relabel retained rows',async()=>{
  const {resource,requests}=harness(envelope({blockingTasks:2}));resource.setPages({...resource.current.desiredPages,blockingTasks:3});resource.setPages({...resource.current.desiredPages,blockingTasks:1});expect(requests[0]!.signal.aborted).toBe(true);
  requests[1]!.resolve(response(relation('blockingTasks',1)));await pause();requests[0]!.resolve(response(relation('blockingTasks',3)));await pause();expect(windowAt(resource).page).toBe(1);expect(resource.current.desiredPages.blockingTasks).toBe(1);
  resource.setPages({...resource.current.desiredPages,blockingTasks:1});expect(requests).toHaveLength(2);resource.dispose();
 });
 test('clamp is accepted once and canonizes only its collection, never old URL parameters',async()=>{
  const {resource,requests,canonized}=harness();resource.setPages({...resource.current.desiredPages,blockingTasks:999});requests[0]!.resolve(response(relation('blockingTasks',999)));await pause();
  expect(windowAt(resource).page).toBe(5);expect(resource.current.desiredPages.blockingTasks).toBe(5);expect(canonized).toEqual([{blockingTasks:5}]);resource.setPages(resource.current.desiredPages);expect(requests).toHaveLength(1);resource.dispose();
 });
 test('independent out-of-order collections merge within one revision; changed revision retains rows/totals and requests explicit full refresh',async()=>{
  const {resource,requests}=harness();resource.setPages({...resource.current.desiredPages,blockingTasks:2,unmetDependencyIds:2});
  const blocking=requests.find(request=>request.url.searchParams.get('relation')==='blockingTasks')!,unmet=requests.find(request=>request.url.searchParams.get('relation')==='unmetDependencyIds')!;
  unmet.resolve(response(relation('unmetDependencyIds',2)));await pause();blocking.resolve(response(relation('blockingTasks',2)));await pause();expect(windowAt(resource).page).toBe(2);expect(windowAt(resource,'unmetDependencyIds').page).toBe(2);
  const snapshot=resource.current.snapshot;resource.setPages({...resource.current.desiredPages,blockingTasks:3});requests.at(-1)!.resolve(response(relation('blockingTasks',3,'B')));await pause();expect(resource.current.snapshot).toBe(snapshot);expect(resource.current.refreshRequired).toBe(true);expect(resource.current.desiredPages.blockingTasks).toBe(3);expect(resource.current.relations.blockingTasks?.error).toBe('revision');resource.dispose();
 });
 test('full refresh invalidates relation epoch immediately, sends whole page vector and accepts metadata/windows atomically',async()=>{
  const {resource,requests}=harness(envelope({blockingTasks:2,unmetDependencyIds:2}));resource.setPages({...resource.current.desiredPages,blockingTasks:3});const old=resource.current.snapshot,refresh=resource.refresh();expect(requests[0]!.signal.aborted).toBe(true);expect(resource.current.snapshot).toBe(old);expect(resource.current.pending).toBe(true);
  const request=requests.at(-1)!;expect(request.url.pathname).toBe('/workspace-detail');expect(request.url.searchParams.get('rel.blockingTasks')).toBe('3');expect(request.url.searchParams.get('rel.unmetDependencyIds')).toBe('2');
  requests[0]!.resolve(response(relation('blockingTasks',3)));await pause();expect(resource.current.snapshot).toBe(old);
  const fresh=envelope({blockingTasks:3,unmetDependencyIds:2},'B');if(!fresh.detail.found)throw Error('fixture');fresh.detail.currentState={...fresh.detail.currentState,focus:'Fresh coherent snapshot'};
  request.resolve(response(fresh));await refresh;expect(resource.current.snapshot).toEqual(fresh);expect(resource.current.snapshot?.revision).toBe('B');expect(resource.current.pending).toBe(false);expect(windowAt(resource).page).toBe(3);expect(windowAt(resource,'unmetDependencyIds').page).toBe(2);resource.dispose();
 });
 test('external intent during full refresh restarts latest whole-vector request; failure retains entire old snapshot and Retry uses latest intent',async()=>{
  const {resource,requests}=harness(envelope({blockingTasks:2,unmetDependencyIds:2}));const old=resource.current.snapshot,first=resource.refresh();resource.setPages({...resource.current.desiredPages,blockingTasks:4});expect(requests[0]!.signal.aborted).toBe(true);expect(requests[1]!.url.searchParams.get('rel.unmetDependencyIds')).toBe('2');expect(requests[1]!.url.searchParams.get('rel.blockingTasks')).toBe('4');
  requests[0]!.resolve(response(envelope({blockingTasks:2,unmetDependencyIds:2},'B')));await first;requests[1]!.reject(new Error('offline'));await pause();expect(resource.current.snapshot).toBe(old);expect(resource.current.error).toBe('network');expect(resource.current.desiredPages.blockingTasks).toBe(4);
  const retry=resource.refresh();requests[2]!.resolve(response(envelope({blockingTasks:4,unmetDependencyIds:2},'C')));await retry;expect(windowAt(resource).page).toBe(4);expect(resource.current.snapshot?.revision).toBe('C');resource.dispose();
 });
 test('old-revision, malformed-intent and unknown-version replies never alter valid state; new entity clears all work',async()=>{
  const {resource,requests}=harness();const old=resource.current.snapshot;
  for(const patch of [{schemaVersion:1},{requestedPage:1},{window:{...relation('blockingTasks',2).window,page:1}}]){resource.setPages({...resource.current.desiredPages,blockingTasks:2});const pending=resource.loadRelation('blockingTasks');requests.at(-1)!.resolve(response({...relation('blockingTasks',2),...patch}));await pending;expect(resource.current.snapshot).toBe(old);expect(resource.current.relations.blockingTasks?.error).toBe('response');}
  const refresh=resource.refresh();requests.at(-1)!.resolve(response(envelope({},'B')));await refresh; // wrong intent cannot be accepted
  expect(resource.current.snapshot).toBe(old);expect(resource.current.error).toBe('response');
  resource.select({kind:'task',id:'TASK-1'});expect(resource.current.snapshot).toBeUndefined();expect(resource.current.relations).toEqual({});requests.at(-1)!.resolve(response({...envelope(),id:'TASK-1'}));await pause();resource.dispose();
 });
 test('SSR requested clamp is canonized without duplicate initial fetch; full refresh still carries independent pages',async()=>{
  const seed=envelope({blockingTasks:999,unmetDependencyIds:2}),{resource,requests,canonized}=harness(seed);expect(requests).toHaveLength(0);expect(windowAt(resource).page).toBe(5);expect(resource.current.desiredPages.blockingTasks).toBe(5);
  resource.setPages({...resource.current.desiredPages,blockingTasks:5});expect(requests).toHaveLength(0);const refresh=resource.refresh();expect(requests[0]!.url.searchParams.get('rel.blockingTasks')).toBe('5');expect(requests[0]!.url.searchParams.get('rel.unmetDependencyIds')).toBe('2');requests[0]!.resolve(response(envelope({blockingTasks:5,unmetDependencyIds:2})));await refresh;expect(canonized.at(-1)).toMatchObject({blockingTasks:5,unmetDependencyIds:2});resource.dispose();
 });
});

describe('canonical answer read guard',()=>{
 test('draft blocks focus/manual refresh and same-identity seed while preserving entire accepted snapshot',async()=>{
  let draft=' ',calls=0;const seed=envelope(),resource=new InspectorDetailResource('http://local',{onChange:()=>{},allowFullRefresh:()=>draft.length===0,fetcher:async()=>{calls++;return response(envelope({},'B'));}});
  resource.select(identity,seed);await resource.refresh();expect(calls).toBe(0);expect(resource.current.snapshot).toBe(seed);expect(resource.current.blockedRefresh).toBe(true);expect(resource.current.pending).toBe(false);
  resource.select(identity,envelope({},'B'));expect(resource.current.snapshot).toBe(seed);expect(resource.current.snapshot?.revision).toBe('A');
  draft='';await resource.refresh();expect(calls).toBe(1);expect(resource.current.snapshot?.revision).toBe('B');expect(resource.current.blockedRefresh).toBe(false);resource.dispose();
 });
 test('typing while full refresh is pending blocks acceptance; relation paging on accepted revision stays permitted',async()=>{
  let draft='',pending=deferred(),calls=0;const seed=envelope(),resource=new InspectorDetailResource('http://local',{onChange:()=>{},allowFullRefresh:()=>draft.length===0,fetcher:async url=>{calls++;return new URL(String(url)).pathname==='/workspace-detail'?pending.promise:response(relation('blockingTasks',2));}});
  resource.select(identity,seed);const refresh=resource.refresh();draft='Typed after request started';pending.resolve(response(envelope({},'B')));await refresh;expect(resource.current.snapshot).toBe(seed);expect(resource.current.blockedRefresh).toBe(true);expect(resource.current.pending).toBe(false);
  resource.setPages({...resource.current.desiredPages,blockingTasks:2});await pause();expect(windowAt(resource).page).toBe(2);expect(resource.current.snapshot?.revision).toBe('A');expect(calls).toBe(2);
  draft='';pending=deferred();const retry=resource.refresh();pending.resolve(response(envelope({blockingTasks:2},'C')));await retry;expect(resource.current.snapshot?.revision).toBe('C');expect(resource.current.blockedRefresh).toBe(false);resource.dispose();
 });
});

test('blocked same-entity seed invalidates changed pending intent but preserves independent same-revision requests',async()=>{
 for(const desired of [1,3]){
  const requests:Array<{url:URL;signal:AbortSignal;resolve:(response:Response)=>void}>=[];
  const seed=envelope(),resource=new InspectorDetailResource('http://local',{onChange:()=>{},allowFullRefresh:()=>false,fetcher:async(url,init)=>{const pending=deferred();requests.push({url:new URL(String(url)),signal:init!.signal as AbortSignal,resolve:pending.resolve});return pending.promise;}});
  resource.select(identity,seed);resource.setPages({...resource.current.desiredPages,blockingTasks:2,unmetDependencyIds:2});
  const old=requests.find(request=>request.url.searchParams.get('relation')==='blockingTasks')!,independent=requests.find(request=>request.url.searchParams.get('relation')==='unmetDependencyIds')!;
  resource.select(identity,envelope({blockingTasks:desired,unmetDependencyIds:2},'B'));
  expect(old.signal.aborted).toBe(true);expect(independent.signal.aborted).toBe(false);expect(resource.current.blockedRefresh).toBe(true);expect(resource.current.snapshot?.revision).toBe('A');expect(resource.current.desiredPages.blockingTasks).toBe(desired);
  old.resolve(response(relation('blockingTasks',2)));independent.resolve(response(relation('unmetDependencyIds',2)));await pause();
  if(desired===3){const latest=requests.find(request=>request.url.searchParams.get('relation')==='blockingTasks'&&request.url.searchParams.get('page')==='3')!;expect(latest).toBeDefined();latest.resolve(response(relation('blockingTasks',3)));await pause();}
  expect(windowAt(resource).page).toBe(desired);expect(windowAt(resource,'unmetDependencyIds').page).toBe(2);expect(resource.current.relations.blockingTasks?.pending).toBe(false);expect(resource.current.relations.blockingTasks?.error).toBeUndefined();expect(resource.current.snapshot?.revision).toBe('A');resource.dispose();
 }
});
