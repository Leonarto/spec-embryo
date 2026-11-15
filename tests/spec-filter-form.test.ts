import { afterAll,beforeAll,describe,expect,test } from 'bun:test';
import { mkdtemp,rm,writeFile } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { createServer,type ViteDevServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import type { Component } from 'svelte';
import type { render as Render } from 'svelte/server';
import type { WorkspaceFilterData } from '../src/services/workspace.ts';

/** SSR markup plus native successful-control serialization; no browser/JS behavior claim. */
describe('Specs filter ownership of taskScope',()=>{
  let cache:string,server:ViteDevServer,render:typeof Render,Wrapper:Component<{filters:WorkspaceFilterData;controlled:boolean;chosen:string}>;
  const url='http://localhost/specs?taskScope=all&page=5&pageSize=50&status=archived&spec=SPEC-001&q=Intent&sort=status.desc&sort=id.asc&window=7d&option_q=Catalog&option_page=2';
  const filters:WorkspaceFilterData={selectedSpecIds:['SPEC-001'],hasActiveFilters:true,includesArchived:true,legacyArchive:false,scope:'all',unavailableSpecIds:[],timeWindow:'7d',
    options:{options:[{id:'SPEC-001',title:'Intent',status:'archived'}],selected:[{id:'SPEC-001',title:'Intent',status:'archived'}],totalMatching:1,page:1,pageSize:50,q:'',revision:'fixture'}};
  beforeAll(async()=>{
    cache=await mkdtemp('/private/tmp/spm-spec-filter-ssr-');
    await writeFile(join(cache,'state.ts'),`export const page={url:new URL(${JSON.stringify(url)})};`);
    const component=resolve('web/src/lib/components/AnalysisFilters.svelte'),selector=resolve('web/src/lib/components/SelectDropdown.svelte'),multiSelector=resolve('web/src/lib/components/MultiSelectDropdown.svelte');
    await writeFile(join(cache,'Wrapper.svelte'),`<script lang="ts">import AnalysisFilters from ${JSON.stringify(component)};import SelectDropdown from ${JSON.stringify(selector)};import MultiSelectDropdown from ${JSON.stringify(multiSelector)};let {filters,controlled,chosen}=$props();</script>
<AnalysisFilters {filters} route="specs" resultCount={12} controlledNames={controlled?['taskScope']:[]}>
{#snippet extraField(formId,resetKey)}<MultiSelectDropdown name="status" form={formId} {resetKey} selectedValues={['archived']} options={[{value:'archived',label:'Archived spec'}]} />{#if controlled}<SelectDropdown name="taskScope" form={formId} {resetKey} selectedValue={chosen} options={[{value:'all',label:'All linked tasks'},{value:'unarchived',label:'Not archived'},{value:'archived',label:'Archived'}]} buttonLabel="Progress scope" />{/if}{/snippet}
</AnalysisFilters>`);
    server=await createServer({configFile:false,root:resolve('web'),cacheDir:join(cache,'vite'),plugins:[svelte({configFile:false})],resolve:{alias:{'$app/state':join(cache,'state.ts')}},
      server:{middlewareMode:true,hmr:false,ws:false},ssr:{noExternal:['svelte','@lucide/svelte']},optimizeDeps:{noDiscovery:true},logLevel:'error'});
    const [wrapper,runtime]=await Promise.all([server.ssrLoadModule(join(cache,'Wrapper.svelte')),server.ssrLoadModule('svelte/server')]);Wrapper=wrapper.default;render=runtime.render;
  },30000);
  afterAll(async()=>{await server?.close();if(cache)await rm(cache,{recursive:true,force:true});});
  async function fields(html:string){
    const data=new FormData(),hiddenScope:string[]=[],forms:Array<{id:string|null;method:string|null;action:string|null}>=[];
    await new HTMLRewriter().on('form',{element(element){forms.push({id:element.getAttribute('id'),method:element.getAttribute('method'),action:element.getAttribute('action')});}})
      .on('input[form="workspace-filters"]',{element(element){const name=element.getAttribute('name');if(!name||element.hasAttribute('disabled'))return;const type=element.getAttribute('type');if((type==='radio'||type==='checkbox')&&!element.hasAttribute('checked'))return;data.append(name,element.getAttribute('value')??'');if(name==='taskScope'&&type==='hidden')hiddenScope.push(element.getAttribute('value')??'');}})
      .on('form#workspace-filters input',{element(element){const name=element.getAttribute('name');if(name)data.append(name,element.getAttribute('value')??'');if(name==='taskScope')hiddenScope.push(element.getAttribute('value')??'');}})
      .transform(new Response(html)).text();
    return {data,hiddenScope,forms};
  }
  test('an externally controlled selector submits exactly its one chosen value, resets page and keeps other facets',async()=>{
    for(const chosen of ['all','unarchived','archived']){
      const html=render(Wrapper,{props:{filters,controlled:true,chosen}}).body;
      const {data,hiddenScope,forms}=await fields(html);
      expect(data.getAll('taskScope')).toEqual([chosen]);expect(hiddenScope).toEqual([]);
      expect(forms.find(form=>form.id==='workspace-filters')).toEqual({id:'workspace-filters',method:'GET',action:'/specs'});
      expect(data.get('page')).toBe('1');expect(data.get('pageSize')).toBe('50');expect(data.get('q')).toBe('Intent');expect(data.getAll('spec')).toEqual(['SPEC-001']);
      expect(data.getAll('sort')).toEqual(['status.desc','id.asc']);expect(data.get('option_q')).toBe('Catalog');expect(data.get('option_page')).toBe('2');
      expect(data.getAll('status')).toEqual(['archived']);expect(data.get('window')).toBe('7d');
    }
  });
  test('the existing uncontrolled Specs consumer keeps one hidden taskScope',async()=>{
    const {data,hiddenScope}=await fields(render(Wrapper,{props:{filters,controlled:false,chosen:'archived'}}).body);
    expect(data.getAll('taskScope')).toEqual(['all']);expect(hiddenScope).toEqual(['all']);
  });
});
