import {expect,test} from 'bun:test';
import {readFile} from 'node:fs/promises';
import {graphContext,graphTask} from './fixtures/graph-inputs.ts';
import {createWorkspaceSource} from '../src/services/workspace.ts';
import {buildWorkspaceDetailEnvelope} from '../src/services/workspace-detail.ts';
import {normalizeViewQuery} from '../src/services/workspace-query.ts';
import {parseRelationPages,setRelationPage} from '../src/services/detail-relations.ts';
import {InspectorDetailResource} from '../web/src/lib/inspector/detail-resource.ts';
// Execute the real controller seam with injected routing/module/focus adapters.
// This catches stale URL reuse in the glue, rather than copying its implementation.
test('new same-entity clamped SSR seed reconciles current URL, ready or awaiting router completion',async()=>{
 const source=createWorkspaceSource(graphContext(Array.from({length:151},(_,n)=>graphTask(`TASK-${n}`,{dependsOn:n?['TASK-0']:[]}))),0),identity={kind:'task' as const,id:'TASK-0'},initial=buildWorkspaceDetailEnvelope(source,identity),seed=buildWorkspaceDetailEnvelope(source,identity,{blockingTasks:999});
 const code=await readFile(new URL('../web/src/lib/inspector/controller.svelte.ts',import.meta.url),'utf8'),fragment=code.slice(code.indexOf('  function acceptURL('),code.indexOf('  beforeNavigate(')).replace('url:URL,currentSeed:InspectorSeed','url,currentSeed');
 for(const ready of [true,false]){
  let liveURL=new URL('http://local/tasks?inspect=task:TASK-0'),queued:Record<string,number>={};const requests:string[]=[];
  const resource=new InspectorDetailResource('http://local',{onChange:()=>{},onCanonize:pages=>{if(ready){for(const [key,value]of Object.entries(pages))setRelationPage(liveURL.searchParams,key as never,value!);}else queued={...queued,...pages};},fetcher:async url=>{requests.push(String(url));return new Response('{}');}});
  resource.select(identity,initial);liveURL=new URL('http://local/tasks?inspect=task:TASK-0&rel.blockingTasks=999');
  const run=new Function('input',`let {resource,normalizeViewQuery,parseRelationPages,currentSeed,url,detail,lastSeed,workspaceURL,canonizer}=input;let section,lastURL,reader,opener,component,moduleGeneration=0,modulePending,moduleError,breadcrumb;const mounted=true,heading=undefined,list=undefined,observedSeeds=new WeakSet([lastSeed]);const keyOf=x=>x?x.kind+':'+x.id:'';const identityAt=url=>{const view=normalizeViewQuery('tasks',url.searchParams);return {identity:view.inspect,section:view.section??'overview'}};const allowTransition=()=>true,marker=()=>undefined,ledger={verified:()=>undefined},loadComponent=()=>{},tick=()=>Promise.resolve();${fragment};acceptURL(url,currentSeed);return lastURL;`);
  const lastURL=run({resource,normalizeViewQuery,parseRelationPages,currentSeed:{envelope:seed},url:new URL(liveURL),detail:resource.current,lastSeed:initial,workspaceURL:()=>new URL(liveURL),canonizer:{enhanced:ready}});
  expect(resource.current.desiredPages.blockingTasks).toBe(2);expect((resource.current.snapshot!.detail as any).blockingTasks.page).toBe(2);expect(requests).toEqual([]);expect(lastURL).toBe(liveURL.href);
  if(!ready){for(const [key,value]of Object.entries(queued))setRelationPage(liveURL.searchParams,key as never,value);resource.setPages(parseRelationPages('task',liveURL.searchParams));expect(requests).toEqual([]);}
  expect(liveURL.searchParams.get('rel.blockingTasks')).toBe('2');resource.dispose();
 }
});
