import {describe,expect,test} from 'bun:test';
import {RelationURLCanonizer} from '../web/src/lib/inspector/relation-url.ts';
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(done=>resolve=done);return {promise,resolve};}
function harness(){let current={identity:{kind:'task' as const,id:'TASK-1'},urlIdentity:{kind:'task' as const,id:'TASK-1'},revision:'A',epoch:1,pending:false,url:new URL('http://local/tasks?q=hello&inspect=task:TASK-1&section=document&rel.blockingTasks=999&rel.relatedHandoffs=999#reader')};const writes:URL[]=[];const canonizer=new RelationURLCanonizer(()=>current,url=>{writes.push(url);current={...current,url};});return {canonizer,writes,get current(){return current;},patch(patch:Partial<typeof current>){current={...current,...patch};}};}
describe('router-ready relation URL canonization',()=>{
 test('awaits navigation.complete, combines independent keys and preserves current unrelated URL edits',async()=>{
  const h=harness(),navigation=deferred();h.canonizer.mount();const ready=h.canonizer.afterNavigation(navigation.promise);h.canonizer.enqueue({blockingTasks:100});h.canonizer.enqueue({relatedHandoffs:3});expect(h.writes).toHaveLength(0);expect(h.canonizer.enhanced).toBe(false);
  const url=new URL(h.current.url);url.searchParams.set('q','latest filter');h.patch({url});navigation.resolve();await ready;expect(h.writes).toHaveLength(1);expect(h.current.url.searchParams.get('rel.blockingTasks')).toBe('100');expect(h.current.url.searchParams.get('rel.relatedHandoffs')).toBe('3');expect(h.current.url.searchParams.get('q')).toBe('latest filter');expect(h.current.url.hash).toBe('#reader');expect(h.current.url.searchParams.get('section')).toBe('document');
  h.canonizer.enqueue({blockingTasks:100});expect(h.writes).toHaveLength(1);h.canonizer.dispose();
 });
 test('new intention, Close, identity ABA or new full epoch discard stale patches',async()=>{
  for(const kind of ['intent','close','entity','epoch','revision','pending']){const h=harness(),navigation=deferred();h.canonizer.mount();const ready=h.canonizer.afterNavigation(navigation.promise);h.canonizer.enqueue({blockingTasks:100});
   if(kind==='intent'){const url=new URL(h.current.url);url.searchParams.set('rel.blockingTasks','2');h.patch({url});}
   if(kind==='close')h.patch({urlIdentity:undefined as never});if(kind==='entity')h.patch({identity:{kind:'task',id:'TASK-2'}});if(kind==='epoch')h.patch({epoch:3});if(kind==='revision')h.patch({revision:'B'});if(kind==='pending')h.patch({pending:true});navigation.resolve();await ready;expect(h.writes).toHaveLength(0);h.canonizer.dispose();}
 });
 test('full seed queue replaces prior epoch; ready shallow changes do not await another navigation',async()=>{
  const h=harness(),nav=deferred();h.canonizer.mount();const ready=h.canonizer.afterNavigation(nav.promise);h.canonizer.enqueue({blockingTasks:100});h.patch({epoch:2,revision:'B'});h.canonizer.enqueue({relatedHandoffs:2});nav.resolve();await ready;expect(h.current.url.searchParams.get('rel.blockingTasks')).toBe('999');expect(h.current.url.searchParams.get('rel.relatedHandoffs')).toBe('2');h.canonizer.enqueue({blockingTasks:50});expect(h.current.url.searchParams.get('rel.blockingTasks')).toBe('50');h.canonizer.dispose();
 });
 test('superseded/rejected lifecycle callbacks and disposal cannot flush late',async()=>{
  const h=harness(),a=deferred(),b=deferred();h.canonizer.mount();const first=h.canonizer.afterNavigation(a.promise),second=h.canonizer.afterNavigation(b.promise);h.canonizer.enqueue({blockingTasks:100});a.resolve();await first;expect(h.writes).toHaveLength(0);h.canonizer.dispose();b.resolve();await second;expect(h.writes).toHaveLength(0);expect(h.canonizer.enhanced).toBe(false);
  const other=harness();other.canonizer.mount();other.canonizer.enqueue({blockingTasks:100});await other.canonizer.afterNavigation(Promise.reject(new Error('cancelled')));expect(other.writes).toHaveLength(0);other.canonizer.dispose();await pause();
 });
});
