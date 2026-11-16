import {cp,lstat,mkdir,readFile,readdir,realpath} from 'node:fs/promises';
import {join,dirname,sep,isAbsolute} from 'node:path';import {createHash} from 'node:crypto';
const sha=(value:Buffer)=>createHash('sha256').update(value).digest('hex');
export interface ArtifactIdentity {buildId:string;sourceDigest:string;lockDigest:string;packageVersion:string;nodeBuildVersion:string;manifestSHA256:string}
/** Identity capture only. The shipped CLI must still validate every source/output at timed startup. */
export async function readArtifactIdentity(app:string):Promise<ArtifactIdentity>{
 const root=await realpath(app),path=join(app,'web/build/spm-manifest.json'),stat=await lstat(path).catch(()=>null);
 if(!stat?.isFile()||stat.isSymbolicLink()||!(await realpath(path)).startsWith(root+sep))throw Error('Precompiled artifacts must be staged before preparing the runtime');
 const bytes=await readFile(path),m=JSON.parse(bytes.toString('utf8'));
 if(m.schema!==1||m.package?.name!=='@leonarto/spec-embryo'||typeof m.package.version!=='string'||!m.package.version||!['buildId','sourceDigest','lockDigest'].every(key=>typeof m[key]==='string'&&/^[a-f0-9]{64}$/.test(m[key]))||typeof m.node!=='string'||!/^v\d+\.\d+\.\d+$/.test(m.node))throw Error('Invalid staged artifact identity');
 return {buildId:m.buildId,sourceDigest:m.sourceDigest,lockDigest:m.lockDigest,packageVersion:m.package.version,nodeBuildVersion:m.node,manifestSHA256:sha(bytes)};
}
/** Copy a reviewed build outside samples; no build command or project request belongs here. */
export async function stageArtifacts(sourceBuild:string,app:string){
 async function regularTree(path:string){const stat=await lstat(path);if(stat.isSymbolicLink())throw Error('Artifact tree contains a link');if(stat.isDirectory()){for(const file of await readdir(path))await regularTree(join(path,file));}else if(!stat.isFile())throw Error('Artifact tree contains a special file');}
 await regularTree(sourceBuild);const target=join(app,'web/build');if(await lstat(target).catch(()=>null))throw Error('Artifact stage already exists; use a fresh source pin');
 await mkdir(dirname(target),{recursive:true});await cp(sourceBuild,target,{recursive:true,force:false,errorOnExist:true});const identity=await readArtifactIdentity(app);
 const original=await readFile(join(sourceBuild,'spm-manifest.json'));if(sha(original)!==identity.manifestSHA256)throw Error('Artifact manifest changed during staging');return {...identity,sourceBuild:await realpath(sourceBuild),stagedBuild:await realpath(target),buildOccurred:false};
}
/** Only the compiled producer signal qualifies; DEV/progress-only text never does. */
export function compiledReady(text:string,expectedBuildId:string,expectedNodeVersion='v25.6.0'){
 const lines=text.replace(/\u001b\[[0-9;]*m/g,'').split(/\r?\n/);if(lines.some(line=>line.includes('UI in DEV mode')||/^\s*VITE v/.test(line)))throw Error('DEV runtime cannot supply final acceptance');
 const line=lines.find(line=>line.startsWith('Spec Embryo UI ready at '));if(!line)return undefined;
 const ready=/^Spec Embryo UI ready at (http:\/\/127\.0\.0\.1:(\d+)\/) \(build ([a-f0-9]{64})\)$/.exec(line);if(!ready||String(Number(ready[2]))!==ready[2]||!Number.isInteger(Number(ready[2]))||Number(ready[2])<1||Number(ready[2])>65535)throw Error('Invalid compiled readiness signal');
 if(ready[3]!==expectedBuildId)throw Error('Compiled readiness build identity mismatch');
 const progress=lines.map(line=>/^Starting precompiled Spec Embryo UI with (.+) \((v\d+\.\d+\.\d+)\); artifacts verified in (\d+(?:\.\d+)?) ms\.$/.exec(line)).find(Boolean);
 if(!progress||!isAbsolute(progress[1]!)||progress[2]!==expectedNodeVersion||!Number.isFinite(Number(progress[3])))throw Error('Compiled runtime Node/validation evidence missing or unexpected');
 return {url:ready[1]!,port:Number(ready[2]),buildId:ready[3]!,nodeExecutable:progress[1]!,nodeVersion:progress[2]!,reportedArtifactValidationMs:Number(progress[3])};
}
