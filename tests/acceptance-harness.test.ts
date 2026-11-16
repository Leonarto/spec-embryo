import {expect,test} from 'bun:test';
import {navigationSchedule,navigationSummary,coldNavigationSeries,measureListNavigation,coldBrowserSample,warmBrowserSeries,listReady} from '../web/scripts/acceptance-navigation.mjs';
test('cold schedule alternates independent routes; warm keeps5+20 per route',()=>{
 const cold=navigationSchedule('cold');expect(cold).toHaveLength(40);expect(cold.slice(0,4).map(s=>[s.route,s.index])).toEqual([['tasks',1],['specs',1],['tasks',2],['specs',2]]);
 const warm=navigationSchedule('warm');for(const route of ['tasks','specs']){expect(warm.filter(s=>s.route===route&&s.warmup)).toHaveLength(5);expect(warm.filter(s=>s.route===route&&!s.warmup)).toHaveLength(20);}expect(()=>navigationSchedule('invalid')).toThrow();
});
test('nearest-rank p95 preserves outliers and never turns missing/error samples into a pass',()=>{
 const samples=Array.from({length:20},(_,i)=>({ready:true,elapsedMs:i===19?9000:i+1}));expect(navigationSummary(samples,20,800)).toMatchObject({medianMs:10.5,p95Ms:19,pass:true});
 expect(navigationSummary(samples.slice(1),20,800)).toMatchObject({p95Ms:null,pass:false});expect(navigationSummary([...samples.slice(1),{ready:false,error:'timeout'}],20,800)).toMatchObject({failures:1,p95Ms:null,pass:false});
});
test('cold tool adapter always stops its own runtime and retains browser/cleanup errors',async()=>{
 const stopped:string[]=[],recorded:unknown[]=[];
 const result=await coldNavigationSeries({start:async(id:string)=>({id,url:'http://local/',profile:'/owned/'+id}),browser:async()=>{throw Object.assign(Error('controlled browser failure'),{browserClosed:true});},stop:async(runtime:{id:string})=>{stopped.push(runtime.id);return {closed:true};},record:async(value:unknown)=>{recorded.push(value);}},{smoke:true,expectedVersion:'157',routes:{tasks:{path:'/tasks'},specs:{path:'/specs'}}});
 expect(result.credit).toBe(false);expect(stopped).toEqual(['tasks-01','specs-01']);expect(recorded).toHaveLength(2);expect(result.samples.every((s:any)=>s.error.includes('controlled browser failure'))).toBe(true);expect(result.summary.tasks.pass).toBe(false);
});

import {mkdtemp,mkdir,writeFile,readFile,lstat,readlink,realpath,symlink,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {copyDependencySeed,linkDependencyRuntime,auditDependencies} from '../web/scripts/acceptance-files.ts';
test('owned dependency seed copies bytes, runtime hardlinks owned files, and caches stay private',async()=>{
 const root=await mkdtemp(join(tmpdir(),'spm-acceptance-files-'));
 try{const dev=join(root,'dev'),seed=join(root,'seed'),runtime=join(root,'runtime');await mkdir(dev);await mkdir(join(dev,'pkg'));await writeFile(join(dev,'pkg/index.js'),'module bytes');await mkdir(join(dev,'.bin'));await symlink('../pkg/index.js',join(dev,'.bin/tool'));await mkdir(join(dev,'.vite'));await writeFile(join(dev,'.vite/stale'),'must not copy');
  const baseline=await copyDependencySeed(dev,seed);await linkDependencyRuntime(seed,runtime,baseline.inventory);const a=await lstat(join(dev,'pkg/index.js')),b=await lstat(join(seed,'pkg/index.js')),c=await lstat(join(runtime,'pkg/index.js'));expect(a.ino).not.toBe(b.ino);expect(b.ino).toBe(c.ino);expect(b.mode&0o222).toBe(0);expect(await readlink(join(runtime,'.bin/tool'))).toBe('../pkg/index.js');expect(await realpath(join(runtime,'.bin/tool'))).toBe(await realpath(join(runtime,'pkg/index.js')));
  expect(await lstat(join(runtime,'.vite')).catch(()=>null)).toBeNull();await mkdir(join(runtime,'.vite'));await writeFile(join(runtime,'.vite/own'),'private');expect(await lstat(join(seed,'.vite')).catch(()=>null)).toBeNull();expect(await readFile(join(dev,'.vite/stale'),'utf8')).toBe('must not copy');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('dependency copying rejects a symlink escaping development dependency root',async()=>{
 const root=await mkdtemp(join(tmpdir(),'spm-acceptance-escape-'));try{await mkdir(join(root,'dev'));await writeFile(join(root,'outside'),'outside');await symlink('../outside',join(root,'dev/escape'));await expect(copyDependencySeed(join(root,'dev'),join(root,'seed'))).rejects.toThrow('escapes');expect(await readFile(join(root,'outside'),'utf8')).toBe('outside');}finally{await rm(root,{recursive:true,force:true});}
});

import {chmod} from 'node:fs/promises';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {preparePackage} from '../web/scripts/acceptance-package.ts';import {prepareRuntime,stopRuntime} from '../web/scripts/acceptance-runtime.ts';
const execute=promisify(execFile);
async function tinyOwner(){const root=await mkdtemp(join(tmpdir(),'spm-acceptance-unit-')),dev=join(root,'dev'),seed=join(root,'dependencies'),source=join(root,'source');await mkdir(dev);await writeFile(join(dev,'library.js'),'fixture dependency');await mkdir(source);const baseline=await copyDependencySeed(dev,seed);await writeFile(join(root,'dependencies.json'),JSON.stringify(baseline));const nonce='test-owner';await writeFile(join(root,'owner.json'),JSON.stringify({version:1,nonce,commit:'0'.repeat(40),source,seed}));await mkdir(join(root,'runs'));return {root,nonce};}
test('prepared global-style prefix invokes declared owned bin without a development-source link',async()=>{
 const {root,nonce}=await tinyOwner();try{const staging=join(root,'staging/package');await mkdir(join(staging,'src'),{recursive:true});await writeFile(join(staging,'package.json'),JSON.stringify({name:'@leonarto/spec-embryo',bin:{spm:'src/index.ts','spec-embryo':'src/index.ts'}}));await writeFile(join(staging,'src/index.ts'),'#!/usr/bin/env bun\nconsole.log("owned fixture bin");\n');await chmod(join(staging,'src/index.ts'),0o755);const archive=join(root,'fixture.tgz');await execute('tar',['-czf',archive,'-C',join(root,'staging'),'package']);
  const installed=await preparePackage(root,nonce,archive);expect(installed.preparationOnly).toBe(true);expect(installed.binRealpaths.spm).toStartWith(await realpath(installed.prefix));const run=await execute(installed.runtime.bin!,[],{cwd:installed.external});expect(run.stdout.trim()).toBe('owned fixture bin');expect(await lstat(join(installed.runtime.app,'node_modules/library.js'))).toMatchObject({size:18});
 }finally{await rm(root,{recursive:true,force:true});}
});
test('lifecycle refuses traversal before a runtime write and does not clear another active lease',async()=>{
 const {root,nonce}=await tinyOwner();try{await expect(prepareRuntime(root,nonce,'../escape',root)).rejects.toThrow('Invalid sample id');await expect(prepareRuntime(root,'wrong','safe',root)).rejects.toThrow('Invalid harness owner');await mkdir(join(root,'runs/old'));await writeFile(join(root,'runs/old/runtime.json'),JSON.stringify({id:'old',nonce:'old-nonce'}));await writeFile(join(root,'active.json'),JSON.stringify({id:'new',nonce:'new-nonce'}));expect(await stopRuntime(root,nonce,'old')).toEqual({closed:true});expect(JSON.parse(await readFile(join(root,'active.json'),'utf8')).id).toBe('new');
 }finally{await rm(root,{recursive:true,force:true});}
});

import {initialTasksClosure,compareClosures} from '../web/scripts/acceptance-closure.ts';import {gzipSync} from 'node:zlib';
import {startRuntime} from '../web/scripts/acceptance-runtime.ts';
test('initial Tasks closure counts each emitted static file once and excludes lazy Mermaid',async()=>{
 const root=await mkdtemp(join(tmpdir(),'spm-acceptance-closure-'));try{const client=join(root,'web/.svelte-kit/output/client'),nodes=join(root,'web/.svelte-kit/generated/client/nodes');await mkdir(join(client,'.vite'),{recursive:true});await mkdir(nodes,{recursive:true});await writeFile(join(nodes,'7.js'),'import "/src/routes/tasks/+page.svelte";');
  const manifest:any={};for(const [key,name] of [['app','entry/app'],['start','entry/start'],['layout','nodes/0'],['error','nodes/1'],['tasks','nodes/7'],['shared','shared'],['alias','alias'],['mermaid','mermaid']]){manifest[key!]={name,file:key==='alias'?'shared.js':key+'.js',imports:key==='app'?['shared']:key==='tasks'?['alias']:[],dynamicImports:key==='tasks'?['mermaid']:[]};await writeFile(join(client,manifest[key!].file),'/* '+(key==='alias'?'shared':key)+' */');}
  await writeFile(join(client,'.vite/manifest.json'),JSON.stringify(manifest));const report=await initialTasksClosure(root,'fa025f2'+'0'.repeat(33));expect(report.files).toHaveLength(6);expect(report.mermaid).toEqual([]);expect(report.totalGzipBytes).toBe(['app','start','layout','error','tasks','shared'].reduce((sum,key)=>sum+gzipSync('/* '+key+' */',{level:9}).length,0));
  manifest.app.imports.push('mermaid');await writeFile(join(client,'.vite/manifest.json'),JSON.stringify(manifest));expect((await initialTasksClosure(root,'current')).pass).toBe(false);
  expect(compareClosures({commit:'fa025f2',totalGzipBytes:100,pass:true},{totalGzipBytes:100+60*1024,pass:true}).pass).toBe(true);expect(compareClosures({commit:'fa025f2',totalGzipBytes:100,pass:true},{totalGzipBytes:101+60*1024,pass:true}).pass).toBe(false);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('a prepared runtime from an older source pin cannot start or occupy the active lease',async()=>{
 const {root,nonce}=await tinyOwner();try{await mkdir(join(root,'runs/stale'));await writeFile(join(root,'runs/stale/runtime.json'),JSON.stringify({id:'stale',nonce:'sample',sourceCommit:'old'}));await expect(startRuntime(root,nonce,'stale')).rejects.toThrow('source pin is stale');expect(await lstat(join(root,'active.json')).catch(()=>null)).toBeNull();}finally{await rm(root,{recursive:true,force:true});}
});

// No real browser/process is launched by these protocol regressions.
function fakePage({closeError=false,measurementError=false}={}){return {
 addInitScript:async()=>{},goto:async()=>{if(measurementError)throw Error('MEASUREMENT_PRIMARY');},
 waitForFunction:async(fn:any,expected:any)=>{expect(fn).toBe(listReady);expect(expected.finishWithFrames).toBe(true);return {jsonValue:async()=>123.5,dispose:async()=>{}};},
 evaluate:async()=>({diagnosticAt:9999}),close:async()=>{if(closeError)throw Error('PAGE_CLEANUP');},isClosed:()=>!closeError
};}
function fakeBrowserType({pageCloseError=false,contextCloseError=false,measurementError=false}={}){
 let connected=true;const page=fakePage({closeError:pageCloseError,measurementError}),browser={version:()=> '157',isConnected:()=>connected,newBrowserCDPSession:async()=>({send:async()=>({processInfo:[{type:'browser',id:123}]}),detach:async()=>{}})};
 const context={newPage:async()=>page,browser:()=>browser,close:async()=>{if(contextCloseError)throw Error('CONTEXT_CLEANUP');connected=false;}};
 return {context,type:{launchPersistentContext:async()=>context,executablePath:()=>'/owned/chrome'}};
}
test('readiness endpoint uses fixed browser second-frame timestamp before later diagnostics',async()=>{
 const result=await measureListNavigation({newPage:async()=>fakePage()},{url:'http://fixture/'});
 expect(result).toMatchObject({ready:true,elapsedMs:123.5,diagnosticAt:9999,pageClosed:true});
});
test('page and browser close failures preserve primary errors and partial warm/cold evidence',async()=>{
 const fake=fakeBrowserType({pageCloseError:true,contextCloseError:true,measurementError:true});
 const cold=await coldBrowserSample(fake.type,{profile:'/owned/profile',expectedVersion:'157',expected:{url:'http://fixture/'}});
 expect(cold.error).toContain('MEASUREMENT_PRIMARY');expect(cold.cleanupErrors.map((e:any)=>e.error).join(' ')).toContain('PAGE_CLEANUP');expect(cold.cleanupErrors.map((e:any)=>e.error).join(' ')).toContain('CONTEXT_CLEANUP');expect(cold.browserClosed).toBe(false);
 const warm=await warmBrowserSeries(fake.type,{profile:'/owned/warm',expectedVersion:'157',smoke:true,routes:{tasks:{url:'http://fixture/tasks'},specs:{url:'http://fixture/specs'}}});
 expect(warm.samples).toHaveLength(1);expect(warm.samples[0].error).toContain('MEASUREMENT_PRIMARY');expect(warm.notRun).toHaveLength(1);expect(warm.browserClosed).toBe(false);expect(warm.pass).toBe(false);expect(warm.cleanupErrors[0].error).toContain('CONTEXT_CLEANUP');
});
test('cold stops after unverified cleanup and retains browser primary plus stop secondary',async()=>{
 let starts=0;const records:any[]=[];
 const result=await coldNavigationSeries({start:async()=>{starts++;return {url:'http://fixture/',profile:'/owned/profile'};},browser:async()=>{throw Object.assign(Error('BROWSER_PRIMARY'),{browserClosed:true});},stop:async()=>{throw Error('CLEANUP_SECONDARY');},record:async(v:any)=>records.push(v)},{smoke:true,expectedVersion:'157',routes:{tasks:{path:'/tasks'},specs:{path:'/specs'}}});
 expect(starts).toBe(1);expect(result.samples[0].error).toContain('BROWSER_PRIMARY');expect(result.samples[0].cleanupErrors[0].error).toContain('CLEANUP_SECONDARY');expect(records).toHaveLength(1);expect(result.notRun).toMatchObject([{route:'specs',status:'NOT RUN'}]);expect(result.pass).toBe(false);
});
test('original dependency inventory detects both runtime additions and hardlinked seed mutations',async()=>{
 const {root,nonce}=await tinyOwner();try{
  const runtime=await prepareRuntime(root,nonce,'integrity',root),seed=join(root,'dependencies'),modules=join(runtime.app,'node_modules');
  expect((await auditDependencies(seed,modules)).pass).toBe(true);
  await writeFile(join(modules,'unexpected.js'),'unexpected');const added=await auditDependencies(seed,modules);expect(added).toMatchObject({pass:false,seedMatches:true,runtimeMatches:false});await rm(join(modules,'unexpected.js'));
  await chmod(join(modules,'library.js'),0o644);await writeFile(join(modules,'library.js'),'mutated bytes');const changed=await stopRuntime(root,nonce,'integrity');expect(changed.closed).toBe(true);expect(changed.integrity).toMatchObject({pass:false,seedMatches:false,runtimeMatches:false});
  await expect(startRuntime(root,nonce,'integrity')).rejects.toThrow('Dependency integrity failed');expect(await lstat(join(root,'active.json')).catch(()=>null)).toBeNull();
  await expect(linkDependencyRuntime(seed,join(root,'another-runtime'))).rejects.toThrow('original inventory');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('browser predicate captures endpoint inside the second frame with a fixed clock',async()=>{
 const names=['document','performance','requestAnimationFrame'],saved=names.map(name=>Object.getOwnPropertyDescriptor(globalThis,name)),frames:Array<()=>void>=[];let clock=1;
 const table={getBoundingClientRect:()=>({width:100}),querySelectorAll:()=>[{dataset:{entityId:'TASK-1'}}],querySelector:(selector:string)=>selector.startsWith('button')?{disabled:false}:{},getAttribute:()=> '2'};
 try{Object.defineProperty(globalThis,'document',{configurable:true,value:{querySelector:(selector:string)=>selector.startsWith('[data-table')?table:selector==='h1'?{textContent:'Tasks 100'}:{}}});Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>clock}});Object.defineProperty(globalThis,'requestAnimationFrame',{configurable:true,value:(callback:()=>void)=>frames.push(callback)});
  const endpoint=listReady({ids:['TASK-1'],total:100,finishWithFrames:true});expect(endpoint).toBeInstanceOf(Promise);clock=50;frames.shift()!();expect(frames).toHaveLength(1);clock=123.5;frames.shift()!();clock=9999;expect(await endpoint).toBe(123.5);
 }finally{names.forEach((name,index)=>{const descriptor=saved[index];if(descriptor)Object.defineProperty(globalThis,name,descriptor);else Reflect.deleteProperty(globalThis,name);});}
});
