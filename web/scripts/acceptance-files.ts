import {mkdir,readdir,lstat,readFile,readlink,realpath,copyFile,chmod,symlink,link} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute,sep,dirname} from 'node:path';import {createHash} from 'node:crypto';
export const cacheNames=new Set(['.vite','.vite-temp','.cache','.svelte-kit']);
const inside=(root:string,path:string)=>path===root||path.startsWith(root+sep);
export async function dependencyInventory(root:string){
 const files:Array<{path:string;bytes:number;sha256?:string;link?:string;writable?:true}>=[];const resolved=await realpath(root);
 async function walk(dir:string){for(const entry of await readdir(dir,{withFileTypes:true})){if(cacheNames.has(entry.name))continue;const path=join(dir,entry.name),name=relative(root,path),stat=await lstat(path);
  if(stat.isSymbolicLink()){const target=await readlink(path);if(isAbsolute(target)||!inside(resolved,await realpath(path)))throw Error('Dependency link escapes owned tree: '+name);files.push({path:name,bytes:0,link:target});}
  else if(stat.isDirectory())await walk(path);else if(stat.isFile())files.push({path:name,bytes:stat.size,sha256:createHash('sha256').update(await readFile(path)).digest('hex'),...(stat.mode&0o222?{writable:true as const}:{})});else throw Error('Non-regular dependency: '+name);
 }}await walk(root);return files.sort((a,b)=>a.path.localeCompare(b.path));
}
/** Copy once, then never change these bytes; no hardlink is made to development files. */
export async function copyDependencySeed(source:string,target:string){
 await mkdir(target);const sourceRoot=await realpath(source);let copied=0;
 async function walk(from:string,to:string){for(const entry of await readdir(from,{withFileTypes:true})){if(cacheNames.has(entry.name))continue;const a=join(from,entry.name),b=join(to,entry.name),stat=await lstat(a);
  if(stat.isDirectory()){await mkdir(b);await walk(a,b);}
  else if(stat.isSymbolicLink()){const value=await readlink(a);if(isAbsolute(value)||!inside(sourceRoot,await realpath(a)))throw Error('Source dependency link escapes: '+relative(source,a));await symlink(value,b);}
  else if(stat.isFile()){await copyFile(a,b);const copiedStat=await lstat(b);if(stat.dev===copiedStat.dev&&stat.ino===copiedStat.ino)throw Error('Seed must not hardlink development dependency');await chmod(b,(stat.mode&0o111)|0o444);copied++;}
  else throw Error('Unsupported dependency entry');
 }}await walk(source,target);return {copied,inventory:await dependencyInventory(target)};
}
export type DependencyInventory=Awaited<ReturnType<typeof dependencyInventory>>;
const inventoryHash=(inventory:DependencyInventory)=>createHash('sha256').update(JSON.stringify(inventory)).digest('hex');
async function baselineFor(seed:string,baseline?:DependencyInventory):Promise<DependencyInventory>{
 return baseline??JSON.parse(await readFile(join(dirname(seed),'dependencies.json'),'utf8')).inventory;
}
/** Original copy-time baseline, never a newly observed seed, is the authority. Outside timing. */
export async function auditDependencies(seed:string,target?:string,baseline?:DependencyInventory){
 const result:{pass:boolean;baselineSHA256?:string;seedSHA256?:string;runtimeSHA256?:string;seedMatches:boolean;runtimeMatches:boolean|null;error?:string}={pass:false,seedMatches:false,runtimeMatches:target?false:null};
 try{const expected=await baselineFor(seed,baseline);if(!Array.isArray(expected))throw Error('Missing original dependency inventory');const expectedSHA256=inventoryHash(expected);result.baselineSHA256=expectedSHA256;result.seedSHA256=inventoryHash(await dependencyInventory(seed));result.seedMatches=result.seedSHA256===expectedSHA256;
  if(target){result.runtimeSHA256=inventoryHash(await dependencyInventory(target));result.runtimeMatches=result.runtimeSHA256===expectedSHA256;}
  result.pass=result.seedMatches&&result.runtimeMatches!==false;
 }catch(error){result.error=String(error);}return result;
}
/** Own directories, immutable-file hardlinks to the owned seed, relative internal links only. */
export async function linkDependencyRuntime(seed:string,target:string,baseline?:DependencyInventory){
 const expected=await baselineFor(seed,baseline),before=await auditDependencies(seed,undefined,expected);
 if(!before.pass)throw Error('Dependency seed differs from original inventory: '+JSON.stringify(before));
 await mkdir(target);
 async function walk(from:string,to:string){for(const entry of await readdir(from,{withFileTypes:true})){if(cacheNames.has(entry.name))continue;const a=join(from,entry.name),b=join(to,entry.name),stat=await lstat(a);
  if(stat.isDirectory()){await mkdir(b);await walk(a,b);}else if(stat.isSymbolicLink()){const value=await readlink(a);if(isAbsolute(value))throw Error('Absolute dependency link');await symlink(value,b);}else if(stat.isFile()){if(stat.mode&0o222)throw Error('Dependency seed is writable');await link(a,b);}else throw Error('Unsupported dependency entry');
 }}await walk(seed,target);
 const after=await auditDependencies(seed,target,expected);if(!after.pass)throw Error('Dependency runtime differs from original inventory: '+JSON.stringify(after));
 return {nodeModules:resolve(target),viteCache:join(resolve(target),'.vite'),generatedCache:'web/.svelte-kit',integrity:{before,after}};
}
export async function cacheInventory(app:string){
 const roots=['node_modules/.vite','node_modules/.vite-temp','web/node_modules/.vite','web/node_modules/.vite-temp','web/.svelte-kit'],base=await realpath(app),result=[];
 for(const path of roots){const full=join(app,path),stat=await lstat(full).catch(()=>null);if(!stat){result.push({path,exists:false});continue;}const actual=await realpath(full);if(!inside(base,actual))throw Error('Cache escapes runtime: '+path);result.push({path,exists:true,realpath:actual,entries:stat.isDirectory()?(await readdir(full)).length:1});}
 return result;
}
