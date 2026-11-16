import {expect,test} from 'bun:test';import {readFile} from 'node:fs/promises';
import {InspectorHistoryLedger} from '../web/src/lib/inspector/history.ts';
const code=await readFile(new URL('../web/src/lib/inspector/controller.svelte.ts',import.meta.url),'utf8');
const policy=code.slice(code.indexOf('  let confirmation='),code.indexOf('  async function transition'));
const accept=code.slice(code.indexOf('  function acceptURL('),code.indexOf('  beforeNavigate('));
const compiled=new Bun.Transpiler({loader:'ts'}).transformSync(policy+'\n'+accept);
const A='http://local/specs?inspect=spec:SPEC-1',C='http://local/specs?qa=C',D='http://local/specs?qa=D';
function harness(){
 let url=new URL(A),dirty=true,saves=0;const goes:number[]=[],repairs:Array<{url:string;state:object}>=[];
 const page={state:{qa:'accepted',spmInspector:{entryId:'A'}} as Record<string,unknown>},ledger=new InspectorHistoryLedger();ledger.record({id:'C',url:C});ledger.record({id:'A',url:A,predecessor:{id:'C',url:C}});
 const state=Object.assign((v:unknown)=>v,{raw:(v:unknown)=>v});
 const run=new Function('input',`let {page,ledger,$state,untrack,workspaceURL,replaceState,history,questionEditor}=input;let lastURL=input.accepted,lastSeed,section,reader,opener,moduleGeneration=0,modulePending,moduleError,breadcrumb,component;const detail={identity:{kind:'spec',id:'SPEC-1'}},resource=undefined,mounted=true,heading=undefined,list=undefined;const keyOf=x=>x?x.kind+':'+x.id:'';const identityAt=u=>{const value=u.searchParams.get('inspect');return {identity:value?{kind:value.split(':')[0],id:value.split(':')[1]}:undefined,section:'overview'}};const marker=()=>page.state.spmInspector?.entryId;const seeds={observe:()=>({fresh:false})};const parseRelationPages=()=>({}),canonizer={enhanced:true},tick=()=>Promise.resolve(),loadComponent=()=>{};${compiled};acceptedMarker='A';return {accept:(url)=>acceptURL(url,{envelope:undefined}),resolve:resolveQuestionTransition,get status(){return {confirmation,pending:pendingTransition?.history,restoring,acceptedPageState}},};`);
 const h=run({page,ledger,$state:state,untrack:(fn:()=>unknown)=>fn(),workspaceURL:()=>url,replaceState:(next:URL,nextState:object)=>{url=new URL(next);page.state=nextState as never;repairs.push({url:url.href,state:structuredClone(nextState)});},history:{go:(delta:number)=>goes.push(delta)},questionEditor:{protected:()=>dirty,saving:()=>false,save:async()=>{saves++;dirty=false;return true;},discard:()=>{dirty=false;}},accepted:A});
 return {h,page,ledger,goes,repairs,get url(){return url.href;},get saves(){return saves;},observe(target:string,entry?:string){url=new URL(target);page.state={qa:new URL(target).searchParams.get('qa')??'accepted',...(entry?{spmInspector:{entryId:entry}}:{})};h.accept(url);}};
}
test('ordinary owned traversal still restores then replays its verified delta after explicit discard',async()=>{
 const s=harness();s.observe(C,'C');s.observe(C,'C');expect(s.repairs).toEqual([]);expect(s.goes).toEqual([1]);expect(s.h.status.restoring.url).toBe(A);s.observe(A,'A');expect(s.h.status.restoring).toBeUndefined();await s.h.resolve('discard');expect(s.goes).toEqual([1,-1]);expect(s.repairs).toEqual([]);
});
test('observable different target during restoring abandons relative proof and coalesces late traversal before Keep',async()=>{
 const s=harness();s.observe(C,'C');s.observe(D);expect(s.url).toBe(new URL(A).href);expect(s.h.status.restoring).toBeUndefined();expect(s.h.status.pending.target).toBe(D);expect(s.goes).toEqual([1]);expect(s.ledger.verified('A',A)).toBeUndefined();expect(s.ledger.verified('C',C)).toBeUndefined();expect(s.page.state.qa).toBe('accepted');
 s.observe(C,'C');expect(s.url).toBe(new URL(A).href);expect(s.h.status.pending.target).toBe(C);expect(s.h.status.confirmation).toBe(true);await s.h.resolve('keep');expect(s.url).toBe(new URL(A).href);expect(s.h.status.confirmation).toBe(false);expect(s.h.status.pending).toBeUndefined();expect(s.goes).toEqual([1]);
});
test('Keep before restoration completes repairs immediately and does not rely on a delayed go',async()=>{
 const s=harness();s.observe(C,'C');await s.h.resolve('keep');expect(s.h.status.restoring).toBeUndefined();expect(s.url).toBe(new URL(A).href);expect(s.goes).toEqual([1]);s.observe(C,'C');expect(s.url).toBe(new URL(A).href);expect(s.h.status.confirmation).toBe(true);await s.h.resolve('keep');expect(s.url).toBe(new URL(A).href);
});
for(const choice of ['save','discard'] as const)test(`${choice} replays only the latest observable destination once after interference`,async()=>{
 const s=harness();s.observe(C,'C');s.observe(D);s.observe(C,'C');await s.h.resolve(choice);expect(s.url).toBe(C);expect(s.goes).toEqual([1]);expect(s.saves).toBe(choice==='save'?1:0);expect(s.h.status.confirmation).toBe(false);expect(s.repairs.filter(r=>r.url===C)).toHaveLength(1);expect(s.page.state.qa).toBe('C');
});
