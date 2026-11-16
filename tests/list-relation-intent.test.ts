import {beforeAll,afterAll,test,expect} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createServer,type ViteDevServer} from 'vite';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import type {render as Render} from 'svelte/server';
import type {Component} from 'svelte';
import {retainListRelationIntent} from '../web/src/lib/inspector/list-relations.ts';
import {normalizeViewQuery,serializeViewQuery,workspaceRequestKey,parseWorkspaceListQuery} from '../src/services/workspace-query.ts';
let cache:string,server:ViteDevServer,render:typeof Render,Pager:Component<any>,setURL:(value:string)=>void;
beforeAll(async()=>{
 cache=await mkdtemp('/private/tmp/spm-list-rel-intent-');const state=join(cache,'state.ts');await writeFile(state,`export const page={url:new URL('http://fixture/tasks'),state:{}};export function setURL(value){page.url=new URL(value);}`);
 server=await createServer({configFile:false,root:resolve('web'),cacheDir:join(cache,'vite'),plugins:[svelte({configFile:false})],resolve:{alias:{'$app/state':state}},server:{middlewareMode:true,hmr:false,ws:false},ssr:{noExternal:['svelte','@lucide/svelte']},optimizeDeps:{noDiscovery:true},logLevel:'error'});
 const [component,runtime,stateModule]=await Promise.all([server.ssrLoadModule('/src/lib/components/ListPager.svelte'),server.ssrLoadModule('svelte/server'),server.ssrLoadModule(state)]);Pager=component.default;render=runtime.render;setURL=stateModule.setURL;
},30000);
afterAll(async()=>{await server?.close();if(cache)await rm(cache,{recursive:true,force:true});});
test('sort, list page/size, tabs and presets retain only same-entity desired relation pages without changing list identity',()=>{
 for(const route of ['tasks','specs'] as const)for(const kind of ['task','spec'] as const){
  const id=kind==='task'?'TASK-1':'SPEC-1',current=new URLSearchParams(`inspect=${kind}:${id}&section=document&rel.blockingTasks=999&rel.linkedTasks=5&rel.relatedHandoffs=3&rel.unknown=8&q=hello`);
  for(const patch of ['sort=id.desc','page=2','pageSize=200','view=board','scope=all','simple=1']){
   const value=normalizeViewQuery(route,current),next=serializeViewQuery(value);for(const [key,text]of new URLSearchParams(patch))next.set(key,text);
   const originalKey=workspaceRequestKey(route,next);retainListRelationIntent(current,next);
   expect(next.get('inspect')).toBe(`${kind}:${id}`);expect(next.get('rel.relatedHandoffs')).toBe('3');expect(next.get(kind==='task'?'rel.blockingTasks':'rel.linkedTasks')).toBe(kind==='task'?'999':'5');expect(next.has(kind==='task'?'rel.linkedTasks':'rel.blockingTasks')).toBe(false);expect(next.has('rel.unknown')).toBe(false);expect(workspaceRequestKey(route,next)).toBe(originalKey);
  }
  for(const nextIdentity of ['',`${kind}:${id}-OTHER`,'bad:THING','task:../bad']){const next=new URLSearchParams(current);if(nextIdentity)next.set('inspect',nextIdentity);else next.delete('inspect');retainListRelationIntent(current,next);expect([...next.keys()].some(key=>key.startsWith('rel.'))).toBe(false);}
 }
});
test('actual SSR ListPager links and page-size form preserve relation vectors and ordinary list fields',async()=>{
 for(const route of ['tasks','specs'] as const){
  setURL(`http://fixture/${route}?inspect=task:TASK-1&section=relations&rel.blockingTasks=2&rel.relatedHandoffs=3&q=hello&page=2`);
  const normalizedQuery=parseWorkspaceListQuery(route==='tasks'?'task':'spec',new URLSearchParams('q=hello&page=2&pageSize=100'));
  const html=render(Pager,{props:{route,result:{totalMatching:350,page:2,requestedPage:2,pageSize:100,normalizedQuery}}}).body,links:string[]=[],form=new URLSearchParams();
  await new HTMLRewriter().on('.page-links a',{element(node){links.push(node.getAttribute('href')!);}}).on('form input[type=hidden]',{element(node){form.append(node.getAttribute('name')!,node.getAttribute('value')??'');}}).transform(new Response(html)).text();
  for(const params of [...links.map(href=>new URL(href.replaceAll('&amp;','&'),'http://fixture').searchParams),form]){expect(params.get('inspect')).toBe('task:TASK-1');expect(params.get('section')).toBe('relations');expect(params.getAll('rel.blockingTasks')).toEqual(['2']);expect(params.getAll('rel.relatedHandoffs')).toEqual(['3']);expect(params.get('q')).toBe('hello');}
 }
});
