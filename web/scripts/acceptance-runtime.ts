#!/usr/bin/env bun
// Finite TASK131 lifecycle only. No HTTP controller or product instrumentation.
import {mkdtemp,mkdir,readFile,writeFile,open,cp,symlink,lstat,realpath,rm,readdir} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';import {tmpdir} from 'node:os';import {randomUUID} from 'node:crypto';
import {spawn,execFile} from 'node:child_process';import {promisify} from 'node:util';import {createServer,connect} from 'node:net';import {once} from 'node:events';
import {copyDependencySeed,linkDependencyRuntime,cacheInventory,auditDependencies} from './acceptance-files.ts';
const exec=promisify(execFile),pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
export interface Owner {version:1;nonce:string;commit:string;source:string;seed:string}
interface Stamp {pid:number;group:number;identity:string}
export interface Runtime {id:string;nonce:string;sourceCommit?:string;app:string;bin?:string;fixture:string;profile:string;log:string;cache:object;pid?:number;stamp?:Stamp;listener?:Stamp;url?:string;startupMs?:number;requestedPort?:number;closed?:boolean;error?:string}
async function json(path:string){return JSON.parse(await readFile(path,'utf8'));}
async function save(path:string,value:unknown){await writeFile(path,JSON.stringify(value,null,2)+'\n');}
export async function ownedRoot(root:string,nonce:string):Promise<Owner>{const owner=await json(join(root,'owner.json'));if(owner.version!==1||owner.nonce!==nonce||!root.includes('spm-acceptance-'))throw Error('Invalid harness owner');return owner;}
async function stamp(pid:number):Promise<Stamp|undefined>{try{const {stdout}=await exec('ps',['-p',String(pid),'-o','pgid=','-o','lstart=','-o','command='],{env:{...process.env,LC_ALL:'C'}});const text=stdout.trim(),match=/^(\d+)\s+(.+)$/.exec(text);return match?{pid,group:Number(match[1]),identity:match[2]!}:undefined;}catch{return undefined;}}
async function sameProcess(expected:Stamp|undefined){if(!expected)return false;const observed=await stamp(expected.pid);return observed?.group===expected.group&&observed.identity===expected.identity;}
async function groupAlive(group:number){try{process.kill(-group,0);return true;}catch(error){if((error as NodeJS.ErrnoException).code==='ESRCH')return false;throw error;}}
async function archive(source:string,commit:string,target:string){await mkdir(target);const child=spawn('git',['-C',source,'archive',commit],{stdio:['ignore','pipe','pipe']}),tar=spawn('tar',['-x','-C',target],{stdio:['pipe','ignore','pipe']});child.stdout.pipe(tar.stdin);const [a,b]=await Promise.all([once(child,'close'),once(tar,'close')]);if(a[0]!==0||b[0]!==0)throw Error('Source archive failed');}
export async function initializeHarness(source:string,commit:string,dependencies:string){
 if(!/^[a-f0-9]{40}$/.test(commit))throw Error('Pin a full commit SHA');
 const root=await mkdtemp(join(tmpdir(),'spm-acceptance-')),owner:Owner={version:1,nonce:randomUUID(),commit,source:join(root,'source'),seed:join(root,'dependencies')};
 await save(join(root,'owner.json'),owner);await archive(resolve(source),commit,owner.source);const deps=await copyDependencySeed(resolve(dependencies),owner.seed);await save(join(root,'dependencies.json'),deps);await mkdir(join(root,'runs'));return {root,nonce:owner.nonce,commit,dependencyFiles:deps.copied};
}
export async function pinSource(root:string,nonce:string,source:string,commit:string){
 const owner=await ownedRoot(root,nonce);if(!/^[a-f0-9]{40}$/.test(commit))throw Error('Pin a full commit SHA');if(await lstat(join(root,'active.json')).catch(()=>null))throw Error('Stop active runtime before pinning source');const target=join(root,'source-'+commit);await archive(resolve(source),commit,target);
 for(const file of ['package.json','web/package.json','bun.lock'])if(!Buffer.from(await readFile(join(owner.source,file))).equals(await readFile(join(target,file))))throw Error('Dependency declaration changed; prepare a new independent seed');
 owner.source=target;owner.commit=commit;await save(join(root,'owner.json'),owner);return {root,commit,source:target,seedReused:true};
}
function runPath(root:string,id:string){if(!/^[a-z][a-z0-9-]{0,80}$/.test(id))throw Error('Invalid sample id');return join(root,'runs',id);}
export async function prepareRuntime(root:string,nonce:string,id:string,fixture:string){
 const owner=await ownedRoot(root,nonce),path=runPath(root,id);await mkdir(path);const app=join(path,'app');await cp(owner.source,app,{recursive:true});const cache=await linkDependencyRuntime(owner.seed,join(app,'node_modules'));await mkdir(join(app,'bin'));
 for(const bin of ['spm','spec-embryo'])await symlink('../src/index.ts',join(app,'bin',bin));
 const initialCaches=await cacheInventory(app);if(initialCaches.some(c=>c.exists&&c.entries))throw Error('Prepared cache is not empty');
 const runtime:Runtime={id,nonce:randomUUID(),sourceCommit:owner.commit,app,fixture:await realpath(fixture),profile:join(path,'profile'),log:join(path,'server.log'),cache:{...cache,initialCaches}};await save(join(path,'runtime.json'),runtime);return runtime;
}
async function clearActive(root:string,runtime:Runtime){try{const active=await json(join(root,'active.json'));if(active.id===runtime.id&&active.nonce===runtime.nonce)await rm(join(root,'active.json'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}
async function freePort(){const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const port=(server.address() as {port:number}).port;await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));return port;}
async function tcp(port:number){return await new Promise<boolean>(resolve=>{const socket=connect({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));socket.setTimeout(500,()=>{socket.destroy();resolve(false);});});}
export async function stopRuntime(root:string,nonce:string,id:string){
 const owner=await ownedRoot(root,nonce),path=runPath(root,id),runtime:Runtime=await json(join(path,'runtime.json'));
 if(runtime.pid&&await groupAlive(runtime.pid)){
  if(!await sameProcess(runtime.stamp)&&!await sameProcess(runtime.listener))return {closed:false,error:'Owned process identity no longer verified; artifacts retained'};
  process.kill(-runtime.pid,'SIGTERM');const deadline=Date.now()+5000;while(await groupAlive(runtime.pid)&&Date.now()<deadline)await pause(50);
  if(await groupAlive(runtime.pid)){if(!await sameProcess(runtime.stamp)&&!await sameProcess(runtime.listener))return {closed:false,error:'Process identity changed before escalation'};process.kill(-runtime.pid,'SIGKILL');}
  const grace=Date.now()+2000;while(await groupAlive(runtime.pid)&&Date.now()<grace)await pause(50);
 }
 runtime.closed=!runtime.pid||!await groupAlive(runtime.pid);
 // Audit only after stopping; mutation must never prevent cleanup of our process.
 const integrity=runtime.app?await auditDependencies(owner.seed,join(runtime.app,'node_modules')):undefined;
 let cacheError:string|undefined;if(runtime.app)try{runtime.cache={...runtime.cache,after:await cacheInventory(runtime.app),integrity};}catch(error){cacheError=String(error);}
 await save(join(path,'runtime.json'),runtime);if(runtime.closed)await clearActive(root,runtime);
 return {closed:runtime.closed,...(integrity?{integrity}:{}),...(cacheError?{error:cacheError}:{})};
}
export async function startRuntime(root:string,nonce:string,id:string){
 const owner=await ownedRoot(root,nonce);if(process.platform==='win32')throw Error('Registered POSIX process-group runtime required');
 const path=runPath(root,id),runtime:Runtime=await json(join(path,'runtime.json'));if(runtime.sourceCommit!==owner.commit)throw Error('Runtime source pin is stale');if(runtime.pid)throw Error('Runtime id already started; prepare a new sample');const integrity=await auditDependencies(owner.seed,join(runtime.app,'node_modules'));if(!integrity.pass)throw Error('Dependency integrity failed before start: '+JSON.stringify(integrity));runtime.cache={...runtime.cache,beforeStart:integrity};const active=await open(join(root,'active.json'),'wx');await active.writeFile(JSON.stringify({id,nonce:runtime.nonce}));await active.close();
 let started=0;let log:Awaited<ReturnType<typeof open>>|undefined;
 try{
  const port=await freePort();log=await open(runtime.log,'wx');
  runtime.requestedPort=port;started=performance.now();
  const child=spawn(runtime.bin??join(runtime.app,'bin','spm'),['ui','--host','127.0.0.1','--port',String(port)],{cwd:runtime.fixture,detached:true,stdio:['ignore',log.fd,log.fd],env:{...process.env,SPM_PROJECT_ROOT:runtime.fixture,PATH:dirname(process.execPath)+':'+process.env.PATH}});await once(child,'spawn');runtime.pid=child.pid;child.unref();runtime.stamp=await stamp(child.pid!);await save(join(path,'runtime.json'),runtime);await log.close();
  const deadline=Date.now()+60000;while(Date.now()<deadline){const text=(await readFile(runtime.log,'utf8')).replace(/\u001b\[[0-9;]*m/g,''),match=/Local:\s+(http:\/\/127\.0\.0\.1:(\d+)\/)/.exec(text);
   if(match&&await tcp(Number(match[2]))){if(!await sameProcess(runtime.stamp))throw Error('Owned launcher identity changed before readiness');const {stdout}=await exec('lsof',['-nP',`-iTCP:${match[2]}`,'-sTCP:LISTEN','-t']);const pids=stdout.trim().split(/\s+/).map(Number);for(const pid of pids){const observed=await stamp(pid);if(observed?.group===runtime.pid)runtime.listener=observed;}if(!runtime.listener)throw Error('Listening server is not in the owned runtime group');runtime.url=match[1];runtime.startupMs=performance.now()-started;await save(join(path,'runtime.json'),runtime);return runtime;}
   if(!await sameProcess(runtime.stamp))throw Error('Runtime exited before Vite readiness');await pause(100);
  }throw Error('Vite readiness deadline exceeded');
 }catch(error){runtime.error=String(error);await save(join(path,'runtime.json'),runtime);await log?.close().catch(()=>{});let cleanup;try{cleanup=await stopRuntime(root,nonce,id);}catch(cleanupError){cleanup={closed:false,error:String(cleanupError)};}throw Error(`${runtime.error}; cleanup=${JSON.stringify(cleanup)}`);}
}
if(import.meta.main){const [command,...args]=process.argv.slice(2),values=Object.fromEntries(args.map((v,i)=>v.startsWith('--')?[v.slice(2),args[i+1]]:[]).filter(v=>v.length===2));try{let result;if(command==='init')result=await initializeHarness(values.source!,values.commit!,values.dependencies!);else if(command==='pin')result=await pinSource(values.root!,values.nonce!,values.source!,values.commit!);else if(command==='prepare')result=await prepareRuntime(values.root!,values.nonce!,values.id!,values.fixture!);else if(command==='start')result=await startRuntime(values.root!,values.nonce!,values.id!);else if(command==='stop')result=await stopRuntime(values.root!,values.nonce!,values.id!);else throw Error('Use init, pin, prepare, start or stop');console.log(JSON.stringify(result));}catch(error){console.error(String(error));process.exitCode=1;}}
