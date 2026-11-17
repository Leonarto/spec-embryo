import {beforeAll,afterAll,test,expect} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createServer,type ViteDevServer} from 'vite';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import type {render as Render} from 'svelte/server';
import type {Component} from 'svelte';
import type {WorkspaceFilterData} from '../src/services/workspace.ts';
let cache:string,server:ViteDevServer,render:typeof Render,Filters:Component<any>,setURL:(url:string)=>void;
const filters:WorkspaceFilterData={selectedSpecIds:[],hasActiveFilters:false,includesArchived:false,legacyArchive:false,scope:'unarchived',unavailableSpecIds:[],options:{options:[],selected:[],totalMatching:0,page:1,pageSize:50,q:'',revision:'fixture'}};
beforeAll(async()=>{
  cache=await mkdtemp('/private/tmp/spm-filter-rel-intent-');const state=join(cache,'state.ts');await writeFile(state,`export const page={url:new URL('http://fixture/tasks'),state:{}};export function setURL(url){page.url=new URL(url);}`);
  server=await createServer({configFile:false,root:resolve('web'),cacheDir:join(cache,'vite'),plugins:[svelte({configFile:false})],resolve:{alias:{'$app/state':state}},server:{middlewareMode:true,hmr:false,ws:false},ssr:{noExternal:['svelte','@lucide/svelte']},optimizeDeps:{noDiscovery:true},logLevel:'error'});
  const [component,runtime,stateModule]=await Promise.all([server.ssrLoadModule('/src/lib/components/AnalysisFilters.svelte'),server.ssrLoadModule('svelte/server'),server.ssrLoadModule(state)]);Filters=component.default;render=runtime.render;setURL=stateModule.setURL;
},30000);
afterAll(async()=>{await server?.close();if(cache)await rm(cache,{recursive:true,force:true});});
async function fields(html:string){const form=new URLSearchParams();let clear='';await new HTMLRewriter().on('form#workspace-filters input',{element(node){const name=node.getAttribute('name');if(name)form.append(name,node.getAttribute('value')??'');}}).on('.filter-actions a',{element(node){clear=node.getAttribute('href')??'';}}).transform(new Response(html)).text();return {form,clear:new URL(clear.replaceAll('&amp;','&'),'http://fixture').searchParams};}
test('GET and Clear preserve only the current inspected kind relation intent on Tasks/Specs',async()=>{
  for(const route of ['tasks','specs'])for(const kind of ['task','spec']){
    const id=kind==='task'?'TASK-1':'SPEC-1';setURL(`http://fixture/${route}?inspect=${kind}:${id}&section=relations&rel.blockingTasks=2&rel.linkedTasks=4&rel.relatedHandoffs=3&rel.unknown=8&page=2`);
    const result=await fields(render(Filters,{props:{filters,route,resultCount:0}}).body);
    for(const params of [result.form,result.clear]){expect(params.get('inspect')).toBe(`${kind}:${id}`);expect(params.get('section')).toBe('relations');expect(params.get('rel.relatedHandoffs')).toBe('3');expect(params.get(kind==='task'?'rel.blockingTasks':'rel.linkedTasks')).toBe(kind==='task'?'2':'4');expect(params.has(kind==='task'?'rel.linkedTasks':'rel.blockingTasks')).toBe(false);expect(params.has('rel.unknown')).toBe(false);}
  }
});
test('no inspector cannot carry relation pages into a different context',async()=>{
  setURL('http://fixture/tasks?rel.blockingTasks=5&rel.relatedHandoffs=3');const result=await fields(render(Filters,{props:{filters,route:'tasks',resultCount:0}}).body);for(const params of [result.form,result.clear])expect([...params.keys()].some(name=>name.startsWith('rel.'))).toBe(false);
});
