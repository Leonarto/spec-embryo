import {beforeAll,afterAll,test,expect} from 'bun:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer,type ViteDevServer} from 'vite';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import type {Component} from 'svelte';
import type {render as Render} from 'svelte/server';
import {buildWorkspaceTimelineProjection} from '../src/services/workspace-timeline.ts';
import {parseWorkspaceTimelineQuery} from '../src/services/workspace-query.ts';
import type {DashboardTaskCard} from '../src/services/dashboard.ts';
let server:ViteDevServer,cache:string,render:typeof Render,Table:Component<any>,Trace:Component<any>,Diagnostics:Component<any>;
beforeAll(async()=>{
  cache=await mkdtemp(join(tmpdir(),'spm-timeline-ssr-'));
  server=await createServer({configFile:false,root:resolve('web'),cacheDir:cache,plugins:[svelte({configFile:false})],server:{middlewareMode:true,hmr:false,ws:false},ssr:{noExternal:['svelte']},optimizeDeps:{noDiscovery:true},logLevel:'error'});
  const [table,trace,diagnostics,runtime]=await Promise.all(['TimelineTable','TimelineTrace','TimelineDiagnostics'].map(name=>server.ssrLoadModule(`/src/lib/components/timeline/${name}.svelte`)).concat([server.ssrLoadModule('svelte/server')]));Table=table!.default;Trace=trace!.default;Diagnostics=diagnostics!.default;render=runtime!.render;
});
afterAll(async()=>{await server?.close();if(cache)await rm(cache,{recursive:true,force:true});});
const card=(id:string,effort=2,dependsOn:string[]=[]):DashboardTaskCard=>({id,title:`Title ${id}`,summary:'',rawStatus:'todo',effectiveStatus:'todo',priority:1,specIds:[`SPEC-${id.slice(5)}`],dependsOn,unmetDependencies:[],downstreamCount:0,effort});
test('SSR unavailable placements preserve rows/finite cells with no nonfinite CSS or fabricated units',()=>{
  const cards=[card('TASK-1',Infinity,['TASK-MISSING']),card('TASK-2',2,['TASK-1'])],projection=buildWorkspaceTimelineProjection(cards,[],parseWorkspaceTimelineQuery(new URLSearchParams('timeline_mode=all')),new Set(cards.map(t=>t.id)));
  const html=render(Table,{props:{result:projection.fallbackPage,traceHref:(id:string)=>`/timeline?selected_task=${id}`,pageHref:()=>'/timeline?simple=1',sizeHref:()=>'/timeline?simple=1',onInspect:()=>{},onNavigate:()=>{}}}).body;
  expect(html.match(/data-task-id=/g)).toHaveLength(2);expect(html).toContain('Unavailable');expect(html).not.toMatch(/NaN|Infinity/);expect(html).toContain('href="/tasks/TASK-1"');expect(html).toMatch(/<td[^>]*>0<\/td>/);expect(html).not.toContain('role="grid"');expect(html).not.toContain('class="bar');
  const diagnostic=render(Diagnostics,{props:{diagnostics:projection.timeline.diagnostics}}).body;expect(diagnostic).toContain('TASK-MISSING');expect(diagnostic).not.toContain('href="/tasks/TASK-MISSING"');expect(diagnostic).toContain('relative placement unavailable');
});
test('SSR related-spec disclosure exposes bounded ordered final-page canonical links and exact full counts',()=>{
  const cards=Array.from({length:2001},(_,i)=>card(`TASK-${i}`,2,i?[]:Array.from({length:2000},(_,j)=>`TASK-${j+1}`))),projection=buildWorkspaceTimelineProjection(cards,[],parseWorkspaceTimelineQuery(new URLSearchParams('timeline_mode=all&selected_task=TASK-0&trace_direct_page=40')),new Set(cards.map(t=>t.id)));
  const html=render(Trace,{props:{selection:projection.timeline.selection!,pages:projection.relatedSpecPages!,clearHref:'/timeline',pageHref:(kind:string,page:number)=>`/timeline?selected_task=TASK-0&trace_${kind}_page=${page}`,onNavigate:()=>{}}}).body;
  expect(html).toContain('2000 direct, 0 transitive');expect(html.match(/<li>/g)).toHaveLength(50);expect(html).toContain('href="/specs/SPEC-2000"');expect(html).not.toContain('href="/specs/SPEC-1"');expect(html).toContain('1951');expect(html).toContain('data-direction="previous"');expect(html).not.toContain('data-direction="next"');expect(html).toMatch(/<details[^>]*open/);
});
