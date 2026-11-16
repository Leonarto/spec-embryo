// Node-only final attribution; coordinate a quiet window before running.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {cpus,platform,release} from 'node:os';
import {loadProjectContext} from '../../src/repository.ts';
import {createWorkspaceSource} from '../../src/services/workspace.ts';
import {buildWorkspaceDetailEnvelope} from '../../src/services/workspace-detail.ts';
const [fixture,origin='http://127.0.0.1:5295',output='web/verification/task138-profile.json']=process.argv.slice(2);
if(!fixture)throw Error('Usage: node web/scripts/detail-relations-profile.ts <fixture-root> [origin] [output]');
const warmups=5,sampleCount=20,results=[];const startedAt=new Date().toISOString();
const summary=(rows:Array<Record<string,number>>,fields:string[])=>Object.fromEntries(fields.map(field=>{const values=rows.map(row=>row[field]!).sort((a,b)=>a-b);return [field,{median:(values[9]!+values[10]!)/2,p95:values[18]!}];}));
for(const identity of [{kind:'task' as const,id:'TASK-00001'},{kind:'spec' as const,id:'SPEC-00001'}]){
 const rows=[];let first;
 for(let n=-warmups;n<sampleCount;n++){
  const start=performance.now(),context=await loadProjectContext(fixture),loaded=performance.now(),source=createWorkspaceSource(context,0),indexed=performance.now(),detail=buildWorkspaceDetailEnvelope(source,identity),projected=performance.now(),text=JSON.stringify(detail),serialized=performance.now();
  if(!detail.detail.found)throw Error('Missing fixture identity');
  const row={contextMs:loaded-start,indexMs:indexed-loaded,projectionMs:projected-indexed,stringifyMs:serialized-projected,bytes:Buffer.byteLength(text),tasks:context.tasks.length,specs:context.specs.length,handoffs:context.handoffs.length};
  if(n===-warmups)first=row;if(n>=0)rows.push(row);
 }
 const http=[];let firstHTTP;
 for(let n=-warmups;n<sampleCount;n++){
  const start=performance.now(),response=await fetch(`${origin}/workspace-detail?kind=${identity.kind}&id=${identity.id}`,{cache:'no-store'}),headers=performance.now(),text=await response.text(),received=performance.now(),value=JSON.parse(text),parsed=performance.now();
  if(response.status!==200||value.schemaVersion!==2||!value.detail.found)throw Error('Invalid HTTP detail');
  const row={headersMs:headers-start,downloadMs:received-headers,jsonMs:parsed-received,totalMs:parsed-start,bytes:Buffer.byteLength(text)};
  if(n===-warmups)firstHTTP=row;if(n>=0)http.push(row);
 }
 results.push({identity,firstObservation:first,summary:summary(rows,['contextMs','indexMs','projectionMs','stringifyMs']),samples:rows,http:{firstObservation:firstHTTP,summary:summary(http,['headersMs','downloadMs','jsonMs','totalMs']),samples:http}});
}
const hashes=Object.fromEntries(await Promise.all(['src/repository.ts','src/document-reader.ts','src/services/details.ts','src/services/detail-relations.ts','src/services/workspace-detail.ts','web/scripts/detail-relations-profile.ts'].map(async path=>[path,createHash('sha256').update(await readFile(new URL('../../'+path,import.meta.url))).digest('hex')])));
await writeFile(output,JSON.stringify({startedAt,finishedAt:new Date().toISOString(),runtime:process.version,machine:{cpu:cpus()[0]?.model,platform:platform(),release:release(),arch:process.arch},fixture,origin,base:'140f902',warmups,sampleCount,hashes,scope:'Fresh Node production IO/index/projection/JSON and separate Node HTTP+download+JSON. Same12k fixture+201handoffs. Five warmups/twenty serial samples, median mean10th/11th, p95nearest-rank19th. First observation is not OS-cold. No browser/300ms acceptance claim from this report alone.',results},null,2)+'\n');
console.log(JSON.stringify(results.map(result=>({identity:result.identity,summary:result.summary,http:result.http.summary}))));
