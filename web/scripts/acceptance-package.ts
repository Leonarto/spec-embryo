#!/usr/bin/env bun
import {mkdir,readFile,writeFile,realpath,lstat,symlink,readdir} from 'node:fs/promises';import {join,resolve,relative,sep} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {ownedRoot,type Runtime} from './acceptance-runtime.ts';import {linkDependencyRuntime,dependencyInventory,cacheInventory} from './acceptance-files.ts';
import {readArtifactIdentity} from './acceptance-artifacts.ts';
const exec=promisify(execFile);
/** Extract an exact local archive into a task-owned global-style prefix, never the real global install. */
export async function preparePackage(root:string,nonce:string,archive:string){
 const owner=await ownedRoot(root,nonce),prefix=join(root,'package-prefix'),pkg=join(prefix,'lib/node_modules/@leonarto/spec-embryo'),bins=join(prefix,'bin'),external=join(root,'external-project');
 const {stdout:list}=await exec('tar',['-tzf',archive]),entries=list.trim().split('\n');if(entries.some(name=>!name.startsWith('package/')||name.split('/').includes('..')))throw Error('Archive path escapes package root');
 const {stdout:verbose}=await exec('tar',['-tvzf',archive]);if(verbose.split('\n').some(line=>line&&!['-','d'].includes(line[0]!)))throw Error('Archive links/special files are not permitted');
 await mkdir(pkg,{recursive:true});await exec('tar',['-xzf',resolve(archive),'-C',pkg,'--strip-components=1']);
 const metadata=JSON.parse(await readFile(join(pkg,'package.json'),'utf8'));if(metadata.name!=='@leonarto/spec-embryo')throw Error('Unexpected package');
 const artifact=await readArtifactIdentity(pkg);if(!owner.artifact||JSON.stringify(artifact)!==JSON.stringify(owner.artifact))throw Error('Packaged artifact differs from staged build');
 const cache=await linkDependencyRuntime(owner.seed,join(pkg,'node_modules'));await mkdir(bins);await mkdir(external);
 const binRealpaths:Record<string,string>={};
 for(const name of ['spm','spec-embryo']){const entry=metadata.bin?.[name];if(typeof entry!=='string')throw Error('Missing declared bin '+name);const target=resolve(pkg,entry);if(!target.startsWith(pkg+sep))throw Error('Bin escapes package');const stat=await lstat(target);if(!stat.isFile()||!(stat.mode&0o111))throw Error('Packaged bin is not executable');await symlink(relative(bins,target),join(bins,name));binRealpaths[name]=await realpath(join(bins,name));}
 const path=join(root,'runs/package-smoke');await mkdir(path);const runtime:Runtime={id:'package-smoke',nonce:randomUUID(),sourceCommit:owner.commit,mode:'precompiled',artifact,app:pkg,bin:join(bins,'spm'),fixture:external,profile:join(path,'profile'),log:join(path,'server.log'),cache:{...cache,initialCaches:await cacheInventory(pkg)}};await writeFile(join(path,'runtime.json'),JSON.stringify(runtime,null,2)+'\n');
 const inventory={preparationOnly:true,sourceCommit:owner.commit,archive:resolve(archive),archiveSHA256:createHash('sha256').update(await readFile(archive)).digest('hex'),entries,prefix,binRealpaths,external,method:'Exact tgz + independent owned dependency bytes + declared prefix/bin links; not registry installation or lifecycle-script verification',dependencyFiles:(await dependencyInventory(join(pkg,'node_modules'))).length};
 await writeFile(join(root,'package.json'),JSON.stringify(inventory,null,2)+'\n');return {...inventory,runtime};
}
if(import.meta.main){const [root,nonce,archive]=process.argv.slice(2);try{console.log(JSON.stringify(await preparePackage(root!,nonce!,archive!)));}catch(error){console.error(String(error));process.exitCode=1;}}
