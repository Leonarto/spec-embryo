#!/usr/bin/env bun
// Finite TASK131 lifecycle only. No HTTP controller or product instrumentation.
import {mkdtemp,mkdir,readFile,writeFile,open,cp,symlink,lstat,realpath,rm,readdir,chmod} from 'node:fs/promises';
import {join,resolve,dirname,relative,sep} from 'node:path';import {tmpdir} from 'node:os';import {randomUUID,createHash} from 'node:crypto';
import {spawn,execFile} from 'node:child_process';import {promisify} from 'node:util';import {createServer,connect} from 'node:net';import {once} from 'node:events';
import {copyDependencySeed,linkDependencyRuntime,cacheInventory,auditDependencies} from './acceptance-files.ts';
const exec=promisify(execFile),pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
export interface Owner {version:1;nonce:string;commit:string;source:string;seed:string}
export interface Stamp {pid:number;group:number;started:string;command:string}
export interface LauncherCommands {env:string;bun:string[]}
export interface Runtime {id:string;nonce:string;sourceCommit?:string;app:string;bin?:string;fixture:string;profile:string;log:string;cache:object;binPreparation?:object;pid?:number;stamp?:Stamp;launcherCommands?:LauncherCommands;groupChecks?:object[];listener?:Stamp;url?:string;startupMs?:number;requestedPort?:number;closed?:boolean;error?:string}
async function json(path:string){return JSON.parse(await readFile(path,'utf8'));}
async function save(path:string,value:unknown){await writeFile(path,JSON.stringify(value,null,2)+'\n');}
export async function ownedRoot(root:string,nonce:string):Promise<Owner>{const owner=await json(join(root,'owner.json'));if(owner.version!==1||owner.nonce!==nonce||!root.includes('spm-acceptance-'))throw Error('Invalid harness owner');return owner;}
export function parseStamp(pid:number,text:string):Stamp|undefined{
 const match=/^(\d+)\s+(\S+\s+\S+\s+\d+\s+\S+\s+\d{4})\s+(.+)$/.exec(text.trim());
 return match?{pid,group:Number(match[1]),started:match[2]!.replace(/\s+/g,' '),command:match[3]!}:undefined;
}
const stableStamp=(a:Stamp,b:Stamp)=>a.pid===b.pid&&a.group===b.group&&a.started===b.started;
/** Only the expected env -> Bun exec can advance command identity; never Bun -> env. */
export function advanceLauncherStamp(expected:Stamp,observed:Stamp,commands:LauncherCommands):Stamp|undefined{
 if(!stableStamp(expected,observed))return undefined;
 if(expected.command!==commands.env&&!commands.bun.includes(expected.command))return undefined;
 return observed.command===expected.command||(expected.command===commands.env&&commands.bun.includes(observed.command))?observed:undefined;
}
async function stamp(pid:number):Promise<Stamp|undefined>{try{const {stdout}=await exec('ps',['-p',String(pid),'-o','pgid=','-o','lstart=','-o','command='],{env:{...process.env,LC_ALL:'C'}});return parseStamp(pid,stdout);}catch{return undefined;}}
async function sameProcess(expected:Stamp|undefined){if(!expected)return false;const observed=await stamp(expected.pid);return !!observed&&stableStamp(expected,observed)&&expected.command===observed.command;}
async function sameLauncher(runtime:Runtime,path:string){
 if(!runtime.stamp||!runtime.launcherCommands)return false;const observed=await stamp(runtime.stamp.pid);if(!observed)return false;
 const accepted=advanceLauncherStamp(runtime.stamp,observed,runtime.launcherCommands);if(!accepted)return false;
 if(accepted.command!==runtime.stamp.command){runtime.stamp=accepted;await save(join(path,'runtime.json'),runtime);}return true;
}
export async function probeGroup(group:number,probes={signal:()=>process.kill(-group,0),inventory:async()=>(await exec('ps',['-A','-o','pid=','-o','pgid='],{env:{...process.env,LC_ALL:'C'},timeout:5000})).stdout}){
 try{probes.signal();return {alive:true,method:'signal-zero'};}catch(error){
  const code=(error as NodeJS.ErrnoException).code;if(code==='ESRCH')return {alive:false,method:'signal-zero-esrch'};if(code!=='EPERM')throw error;
  try{const stdout=await probes.inventory(),lines=stdout.split('\n').filter(line=>line.trim());if(!lines.length)throw Error('Empty process inventory');const members:number[]=[];
   for(const line of lines){const match=/^\s*(\d+)\s+(\d+)\s*$/.exec(line);if(!match)throw Error('Malformed process inventory');const pid=Number(match[1]),pgid=Number(match[2]);if(!Number.isSafeInteger(pid)||!Number.isSafeInteger(pgid)||pid<=0||pgid<=0)throw Error('Invalid process identifiers');if(pgid===group)members.push(pid);}
   return {alive:members.length>0,method:'process-inventory',group,members,processCount:lines.length,inventorySHA256:createHash('sha256').update(stdout).digest('hex'),signalError:String(error)};
  }catch(cause){throw Error('Group closure unverified after '+String(error)+': '+String(cause));}
 }
}
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
 const owner=await ownedRoot(root,nonce),path=runPath(root,id);await mkdir(path);const app=join(path,'app');await cp(owner.source,app,{recursive:true});
 const metadata=await json(join(app,'package.json')),binDir=join(app,'bin'),appRoot=await realpath(app),prepared=new Map(),binPreparation:Record<string,object>={};await mkdir(binDir);
 // git archive preserves 0644; normalize only copied declared bins, before dependency links exist.
 for(const bin of ['spm','spec-embryo']){const entry=metadata.bin?.[bin];if(typeof entry!=='string')throw Error('Missing declared source bin '+bin);
  const target=resolve(app,entry),actual=await realpath(target),stat=await lstat(target);
  if(!actual.startsWith(appRoot+sep)||actual.startsWith(join(appRoot,'node_modules')+sep)||!stat.isFile())throw Error('Source bin is not an in-app copied file');
  let evidence=prepared.get(actual);if(!evidence){const before=await readFile(actual),hash=createHash('sha256').update(before).digest('hex');await chmod(actual,0o755);const after=await readFile(actual);if(!before.equals(after))throw Error('Bin bytes changed during mode normalization');
   evidence={originalMode:stat.mode&0o777,preparedMode:(await lstat(actual)).mode&0o777,sha256:hash,bytesPreserved:true};prepared.set(actual,evidence);}
  binPreparation[bin]={entry,...evidence};await symlink(relative(binDir,target),join(binDir,bin));
 }
 const cache=await linkDependencyRuntime(owner.seed,join(app,'node_modules'));
 const initialCaches=await cacheInventory(app);if(initialCaches.some(c=>c.exists&&c.entries))throw Error('Prepared cache is not empty');
 const runtime:Runtime={id,nonce:randomUUID(),sourceCommit:owner.commit,app,fixture:await realpath(fixture),profile:join(path,'profile'),log:join(path,'server.log'),binPreparation,cache:{...cache,initialCaches}};await save(join(path,'runtime.json'),runtime);return runtime;
}
async function clearActive(root:string,runtime:Runtime){try{const active=await json(join(root,'active.json'));if(active.id===runtime.id&&active.nonce===runtime.nonce)await rm(join(root,'active.json'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}
async function freePort(){const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const port=(server.address() as {port:number}).port;await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));return port;}
async function tcp(port:number){return await new Promise<boolean>(resolve=>{const socket=connect({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));socket.setTimeout(500,()=>{socket.destroy();resolve(false);});});}
export async function stopRuntime(root:string,nonce:string,id:string){
 const owner=await ownedRoot(root,nonce),path=runPath(root,id),runtime:Runtime=await json(join(path,'runtime.json'));
 const alive=async()=>{const result=await probeGroup(runtime.pid!);if(result.method==='process-inventory'){(runtime.groupChecks??=[]).push(result);await save(join(path,'runtime.json'),runtime);}return result.alive;};
 if(runtime.pid&&await alive()){
  if(!await sameLauncher(runtime,path)&&!await sameProcess(runtime.listener))return {closed:false,error:'Owned process identity no longer verified; artifacts retained'};
  process.kill(-runtime.pid,'SIGTERM');const deadline=Date.now()+5000;while(await alive()&&Date.now()<deadline)await pause(50);
  if(await alive()){if(!await sameLauncher(runtime,path)&&!await sameProcess(runtime.listener))return {closed:false,error:'Process identity changed before escalation'};process.kill(-runtime.pid,'SIGKILL');}
  const grace=Date.now()+2000;while(await alive()&&Date.now()<grace)await pause(50);
 }
 runtime.closed=!runtime.pid||!await alive();
 // Audit only after stopping; mutation must never prevent cleanup of our process.
 const integrity=runtime.app?await auditDependencies(owner.seed,join(runtime.app,'node_modules')):undefined;
 let cacheError:string|undefined;if(runtime.app)try{runtime.cache={...runtime.cache,after:await cacheInventory(runtime.app),integrity};}catch(error){cacheError=String(error);}
 await save(join(path,'runtime.json'),runtime);if(runtime.closed)await clearActive(root,runtime);
 return {closed:runtime.closed,...(integrity?{integrity}:{}),...(runtime.groupChecks?{groupChecks:runtime.groupChecks}:{}),...(cacheError?{error:cacheError}:{})};
}
export async function startRuntime(root:string,nonce:string,id:string){
 const owner=await ownedRoot(root,nonce);if(process.platform==='win32')throw Error('Registered POSIX process-group runtime required');
 const path=runPath(root,id),runtime:Runtime=await json(join(path,'runtime.json'));if(runtime.sourceCommit!==owner.commit)throw Error('Runtime source pin is stale');if(runtime.pid)throw Error('Runtime id already started; prepare a new sample');const integrity=await auditDependencies(owner.seed,join(runtime.app,'node_modules'));if(!integrity.pass)throw Error('Dependency integrity failed before start: '+JSON.stringify(integrity));runtime.cache={...runtime.cache,beforeStart:integrity};const active=await open(join(root,'active.json'),'wx');await active.writeFile(JSON.stringify({id,nonce:runtime.nonce}));await active.close();
 let started=0;let log:Awaited<ReturnType<typeof open>>|undefined;
 try{
  const port=await freePort();log=await open(runtime.log,'wx');
  runtime.requestedPort=port;started=performance.now();
  const bin=runtime.bin??join(runtime.app,'bin','spm'),args=['ui','--host','127.0.0.1','--port',String(port)],suffix=[bin,...args].join(' ');runtime.launcherCommands={env:'/usr/bin/env bun '+suffix,bun:['bun '+suffix,process.execPath+' '+suffix]};
  const child=spawn(bin,args,{cwd:runtime.fixture,detached:true,stdio:['ignore',log.fd,log.fd],env:{...process.env,SPM_PROJECT_ROOT:runtime.fixture,PATH:dirname(process.execPath)+':'+process.env.PATH}});await once(child,'spawn');runtime.pid=child.pid;child.unref();runtime.stamp=await stamp(child.pid!);await save(join(path,'runtime.json'),runtime);await log.close();if(!runtime.stamp||!advanceLauncherStamp(runtime.stamp,runtime.stamp,runtime.launcherCommands))throw Error('Initial launcher identity is not an expected phase');
  const deadline=Date.now()+60000;while(Date.now()<deadline){const text=(await readFile(runtime.log,'utf8')).replace(/\u001b\[[0-9;]*m/g,''),match=/Local:\s+(http:\/\/127\.0\.0\.1:(\d+)\/)/.exec(text);
   if(match&&await tcp(Number(match[2]))){if(!await sameLauncher(runtime,path))throw Error('Owned launcher identity changed before readiness');const {stdout}=await exec('lsof',['-nP',`-iTCP:${match[2]}`,'-sTCP:LISTEN','-t']);const pids=stdout.trim().split(/\s+/).map(Number);for(const pid of pids){const observed=await stamp(pid);if(observed?.group===runtime.pid)runtime.listener=observed;}if(!runtime.listener)throw Error('Listening server is not in the owned runtime group');runtime.url=match[1];runtime.startupMs=performance.now()-started;await save(join(path,'runtime.json'),runtime);return runtime;}
   if(!await sameLauncher(runtime,path))throw Error('Runtime exited before Vite readiness');await pause(100);
  }throw Error('Vite readiness deadline exceeded');
 }catch(error){runtime.error=String(error);await save(join(path,'runtime.json'),runtime);await log?.close().catch(()=>{});let cleanup;try{cleanup=await stopRuntime(root,nonce,id);}catch(cleanupError){cleanup={closed:false,error:String(cleanupError)};}throw Error(`${runtime.error}; cleanup=${JSON.stringify(cleanup)}`);}
}
if(import.meta.main){const [command,...args]=process.argv.slice(2),values=Object.fromEntries(args.map((v,i)=>v.startsWith('--')?[v.slice(2),args[i+1]]:[]).filter(v=>v.length===2));try{let result;if(command==='init')result=await initializeHarness(values.source!,values.commit!,values.dependencies!);else if(command==='pin')result=await pinSource(values.root!,values.nonce!,values.source!,values.commit!);else if(command==='prepare')result=await prepareRuntime(values.root!,values.nonce!,values.id!,values.fixture!);else if(command==='start')result=await startRuntime(values.root!,values.nonce!,values.id!);else if(command==='stop')result=await stopRuntime(values.root!,values.nonce!,values.id!);else throw Error('Use init, pin, prepare, start or stop');console.log(JSON.stringify(result));}catch(error){console.error(String(error));process.exitCode=1;}}
