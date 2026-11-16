import {beforeAll,afterAll,expect,test} from 'bun:test';
import {readFile,mkdtemp,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {initializeProject,loadProjectContext} from '../src/repository.ts';
import {createWorkspaceSource} from '../src/services/workspace.ts';
import {buildWorkspaceDetailEnvelope,type WorkspaceDetailEnvelope} from '../src/services/workspace-detail.ts';
import {parseRelationPages} from '../src/services/detail-relations.ts';
import {InspectorDetailResource} from '../web/src/lib/inspector/detail-resource.ts';
import {SpecOutcomeFence} from '../web/src/lib/inspector/spec-outcome-fence.ts';
import {SpecSeedAdapter} from '../web/src/lib/inspector/spec-seed-adapter.ts';
let root:string,base:WorkspaceDetailEnvelope,fragment:string;beforeAll(async()=>{const code=await readFile(new URL('../web/src/lib/inspector/controller.svelte.ts',import.meta.url),'utf8');fragment=code.slice(code.indexOf('  function acceptURL('),code.indexOf('  beforeNavigate(')).replace('url:URL,currentSeed:InspectorSeed','url,currentSeed');root=await mkdtemp(join(tmpdir(),'spm-outcome-seed-'));await initializeProject(root);base=buildWorkspaceDetailEnvelope(createWorkspaceSource(await loadProjectContext(root)),{kind:'spec',id:'SPEC-001'});});afterAll(async()=>{await rm(root,{recursive:true,force:true});});
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status});
const next=(revision:string)=>({...base,revision,detail:base.detail.found?{...base.detail,spec:{...base.detail.spec,title:revision}}:base.detail}) as WorkspaceDetailEnvelope;
function deferred(){let resolve!:(value:Response)=>void;const promise=new Promise<Response>(r=>resolve=r);return {promise,resolve};}
const settle=()=>new Promise(r=>setTimeout(r,0));
test('real seed gate + resource glue rejects loader A before/after outcome B, coalesces same intent, retains B on failure',async()=>{
 const fence=new SpecOutcomeFence(),adapter=new SpecSeedAdapter(()=> 'project',fence),calls:ReturnType<typeof deferred>[]=[],signals:AbortSignal[]=[];
 const resource=new InspectorDetailResource('http://local',{onChange:()=>{},fetcher:((_url,options)=>{const work=deferred();calls.push(work);signals.push(options!.signal!);return work.promise;}) as typeof fetch});
 const initial=adapter.observe(base);resource.select(base,initial.seed,base.pages);
 const run=new Function('input',`let {resource,seeds,currentSeed,url,parseRelationPages}=input;let detail=resource.current,lastSeed=input.initial,lastURL=url.href,section,reader,opener,moduleGeneration=0,modulePending=false,moduleError,breadcrumb,restoring,acceptedMarker,acceptedPageState;const page={state:{}};const component=input.component,mounted=true,heading=undefined,list=undefined;const keyOf=x=>x?x.kind+':'+x.id:'';const identityAt=()=>({identity:{kind:url.searchParams.get('inspect').split(':')[0],id:url.searchParams.get('inspect').split(':')[1]},section:'overview'});const allowTransition=()=>true,marker=()=>undefined,ledger={verified:()=>undefined},loadComponent=()=>{throw Error('same-identity editor module must not be cleared')},tick=()=>Promise.resolve(),workspaceURL=()=>url,canonizer={enhanced:true};${fragment};acceptURL(url,currentSeed);`);
 const adopt=(seed:WorkspaceDetailEnvelope)=>run({resource,seeds:adapter,currentSeed:{envelope:seed},initial:base,url:new URL('http://local/specs?inspect=spec:'+seed.id),parseRelationPages,component:()=>{}});
 adopt(base);expect(calls).toHaveLength(0);const pre=resource.refresh();expect(calls).toHaveLength(1);
 fence.mark('project',base.id);resource.invalidateBeforeOutcome();expect(signals[0]!.aborted).toBe(true);
 const post=resource.refresh();adopt(next('lateA'));expect(calls).toHaveLength(2);expect(resource.current.snapshot).toBe(base);
 calls[0]!.resolve(reply(next('older')));calls[1]!.resolve(reply(next('B')));await Promise.all([pre,post]);expect(resource.current.snapshot?.revision).toBe('B');
 adopt(next('laterA'));expect(calls).toHaveLength(3);expect(resource.current.snapshot?.revision).toBe('B');calls[2]!.resolve(reply({},500));await settle();expect(resource.current.snapshot?.revision).toBe('B');expect(resource.current.error).toBeDefined();resource.dispose();
});
test('fenced initial/remount seeds never become snapshots; A→B→A and presentation adapters share only identity metadata',async()=>{
 const fence=new SpecOutcomeFence();fence.mark('project',base.id);
 for(const _presentation of ['canonical','inspector','canonical']){const gate=new SpecSeedAdapter(()=> 'project',fence);const observation=gate.observe(next('stale title'));expect(observation.seed).toBeUndefined();expect(observation.fenced).toBe(true);expect(gate.observe(base).seed).toBeUndefined();}
 expect(new SpecSeedAdapter(()=> 'other',fence).observe(base).seed).toBe(base);expect(new SpecSeedAdapter(()=> 'project',new SpecOutcomeFence()).observe(base).seed).toBe(base);
});
test('outcome invalidation aborts full and relation epochs without clearing accepted snapshot or desired URL pages',async()=>{
 const work=deferred();let signal:AbortSignal|undefined;const resource=new InspectorDetailResource('http://local',{onChange:()=>{},fetcher:((_u,o)=>{signal=o!.signal!;return work.promise;}) as typeof fetch});resource.select(base,base);const load=resource.refresh();resource.invalidateBeforeOutcome();expect(signal!.aborted).toBe(true);expect(resource.current.pending).toBe(false);expect(resource.current.snapshot).toBe(base);expect(resource.current.desiredPages).toEqual(base.pages);work.resolve(reply(next('late')));await load;expect(resource.current.snapshot).toBe(base);resource.dispose();
});
