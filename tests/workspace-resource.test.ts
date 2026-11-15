import { afterAll,beforeAll,describe,expect,test } from 'bun:test';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeProject,loadProjectContext } from '../src/repository.ts';
import { buildWorkspaceEnvelope,createWorkspaceSource,type WorkspaceEnvelope } from '../src/services/workspace.ts';
import { WorkspaceResource,validateWorkspaceEnvelope,type WorkspaceResourceState } from '../web/src/lib/workspace/resource.ts';
let root:string,initial:WorkspaceEnvelope<'tasks'>;
beforeAll(async()=>{root=await mkdtemp(join(tmpdir(),'spm-resource-tests-'));await initializeProject(root);initial=await buildWorkspaceEnvelope(createWorkspaceSource(await loadProjectContext(root),Date.parse('2026-11-15T12:00:00Z')),'tasks',new URLSearchParams());});
afterAll(async()=>{await rm(root,{recursive:true,force:true});});
const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
function changed(title:string){const value=structuredClone(initial);value.revision=title;value.data.result.rows[0]!.title=title;value.shell.git.dirty=!initial.shell.git.dirty;return value;}
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};}
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

describe('controlled workspace resource',()=>{
  test('uses only controlled endpoint and commits shell/data atomically without router invalidation',async()=>{
    const states:WorkspaceResourceState[]=[];let requested='';let now=Date.parse(initial.generatedAt)+1000;
    const resource=new WorkspaceResource(initial,'http://local/tasks?scope=unarchived&page=1',{now:()=>now,onChange:state=>states.push(state),fetcher:async(url,init)=>{requested=url;expect(init.cache).toBe('no-store');expect(init.signal).toBeInstanceOf(AbortSignal);return response(changed('external change'));}});
    await resource.refresh();expect(new URL(requested).pathname).toBe('/workspace-data');expect(new URL(requested).searchParams.get('route')).toBe('tasks');expect(requested).not.toContain('__data');
    expect(resource.current.snapshot.data.result.rows[0]!.title).toBe('external change');expect(resource.current.snapshot.shell.git.dirty).not.toBe(initial.shell.git.dirty);expect(resource.current.pending).toBe(false);expect(resource.current.lastSuccessAt).toBe(now);
    for(const state of states)expect(state.snapshot===initial||state.snapshot.data.result.rows[0]!.title==='external change'&&state.snapshot.shell.git.dirty!==initial.shell.git.dirty).toBe(true);
    resource.dispose();
  });
  test('network/HTTP/JSON/shape/identity failures retain the exact snapshot and prior success time; Retry recovers',async()=>{
    const failures=[async()=>{throw new DOMException('Network aborted','AbortError');},async()=>response({error:'unavailable'},503),async()=>new Response('{broken'),async()=>response({...initial,data:{}}),async()=>response({...initial,route:'specs'}),async()=>response({...initial,requestKey:'different'})];
    for(const fail of failures){let failing=true;const resource=new WorkspaceResource(initial,'http://local/tasks',{onChange:()=>{},fetcher:()=>failing?fail():Promise.resolve(response(changed('recovered')))});const success=resource.current.lastSuccessAt;await resource.refresh();expect(resource.current.snapshot).toBe(initial);expect(resource.current.lastSuccessAt).toBe(success);expect(resource.current.error).toBeDefined();expect(resource.current.pending).toBe(false);failing=false;await resource.refresh();expect(resource.current.snapshot.data.result.rows[0]!.title).toBe('recovered');expect(resource.current.error).toBeUndefined();resource.dispose();}
  });
  test('superseded late success or error cannot replace or clear a newer request',async()=>{
    for(const lateError of [false,true]){const a=deferred<Response>(),b=deferred<Response>();let calls=0;const signals:AbortSignal[]=[];const resource=new WorkspaceResource(initial,'http://local/tasks',{onChange:()=>{},fetcher:(_url,init)=>{signals.push(init.signal as AbortSignal);return ++calls===1?a.promise:b.promise;}});const first=resource.refresh(),second=resource.refresh();expect(signals[0]!.aborted).toBe(true);b.resolve(response(changed('B')));await second;if(lateError)a.reject(new Error('late network error'));else a.resolve(response(changed('A')));await first;expect(resource.current.snapshot.data.result.rows[0]!.title).toBe('B');expect(resource.current.error).toBeUndefined();expect(resource.current.pending).toBe(false);resource.dispose();}
  });
  test('new SSR generation and disposal invalidate old requests even with the same route/key',async()=>{
    const pending=deferred<Response>();let signal:AbortSignal|undefined;const resource=new WorkspaceResource(initial,'http://local/tasks',{onChange:()=>{},fetcher:(_url,init)=>{signal=init.signal as AbortSignal;return pending.promise;}});const old=resource.refresh();const seed=changed('new SSR');resource.seed(seed,'http://local/tasks');expect(signal!.aborted).toBe(true);pending.resolve(response(changed('late prior visit')));await old;expect(resource.current.snapshot).toBe(seed);expect(resource.current.pending).toBe(false);
    const other=deferred<Response>();const disposed=new WorkspaceResource(initial,'http://local/tasks',{onChange:()=>{},fetcher:()=>other.promise});const oldDisposed=disposed.refresh();disposed.dispose();other.resolve(response(changed('late disposed')));await oldDisposed;expect(disposed.current.snapshot).toBe(initial);resource.dispose();
  });
  test('deadline exits busy, aborts transport, preserves prior data, and ignores late completion',async()=>{
    const pending=deferred<Response>();let signal:AbortSignal|undefined;const resource=new WorkspaceResource(initial,'http://local/tasks',{deadlineMs:15,onChange:()=>{},fetcher:(_url,init)=>{signal=init.signal as AbortSignal;return pending.promise;}});const last=resource.current.lastSuccessAt;await resource.refresh();expect(signal!.aborted).toBe(true);expect(resource.current).toMatchObject({pending:false,error:'timeout',lastSuccessAt:last});expect(resource.current.snapshot).toBe(initial);pending.resolve(response(changed('after deadline')));await delay(0);expect(resource.current.snapshot).toBe(initial);resource.dispose();
  });
  test('focus is debounced, visible-only, after five seconds, and coalesces with an existing request',async()=>{
    let now=Date.parse(initial.generatedAt),visible=true,calls=0;const waiting=deferred<Response>();const resource=new WorkspaceResource(initial,'http://local/tasks',{now:()=>now,isVisible:()=>visible,focusDebounceMs:5,onChange:()=>{},fetcher:()=>{calls++;return waiting.promise;}});resource.focus();await delay(10);expect(calls).toBe(0);now+=6000;visible=false;resource.focus();await delay(10);expect(calls).toBe(0);visible=true;resource.focus();resource.focus();await delay(10);expect(calls).toBe(1);now+=6000;resource.focus();await delay(10);expect(calls).toBe(1);waiting.resolve(response(changed('focus update')));await delay(0);expect(resource.current.snapshot.data.result.rows[0]!.title).toBe('focus update');resource.dispose();
  });
  test('validates schema and required displayed fields before accepting an envelope',()=>{
    expect(validateWorkspaceEnvelope(initial,initial)).toBe(true);
    for(const invalid of [null,{}, {...initial,shell:{...initial.shell,project:{...initial.shell.project,key:"not-a-root-key"}}},{...initial,data:{...initial.data,view:"unknown"}}, {...initial,schemaVersion:2},{...initial,generatedAt:'bad'},{...initial,shell:{}},{...initial,data:{...initial.data,result:{...initial.data.result,rows:[{id:'TASK-1'}]}}}])expect(validateWorkspaceEnvelope(invalid,initial)).toBe(false);
  });
});
