import {performance} from 'node:perf_hooks';
import {writeFile} from 'node:fs/promises';
import {loadProjectContext} from '../../src/repository.ts';
import {createWorkspaceSource} from '../../src/services/workspace.ts';
import {buildWorkspaceTimelineProjection} from '../../src/services/workspace-timeline.ts';
import {parseWorkspaceTimelineQuery} from '../../src/services/workspace-query.ts';

const [root,origin,output]=process.argv.slice(2);
if(!root||!origin||!output)throw Error('Usage: timeline-timing root origin output');
const warmups=5,samples=20;
const summarize=(values:number[])=>{const ordered=[...values].sort((a,b)=>a-b);return {median:ordered[Math.floor(ordered.length/2)]!,p95:ordered[Math.ceil(ordered.length*.95)-1]!,samples:values};};
async function sample<T>(run:()=>Promise<T>|T){const values:number[]=[];let last!:T;for(let i=0;i<warmups+samples;i++){const start=performance.now();last=await run();if(i>=warmups)values.push(performance.now()-start);}return {timing:summarize(values),last};}
const initialStart=performance.now(),context=await loadProjectContext(root),initialContextMs=performance.now()-initialStart;
const io=await sample(()=>loadProjectContext(root));
const index=await sample(()=>createWorkspaceSource(context));
const source=index.last,cards=[...source.taskRows().values()],specs=context.specs.map(spec=>({id:spec.id,title:spec.title,status:spec.status})),ids=new Set(source.analysis.byId.keys());
const projection=await sample(()=>buildWorkspaceTimelineProjection(cards,specs,parseWorkspaceTimelineQuery(new URLSearchParams('timeline_mode=all')),ids));
const selected=await sample(()=>buildWorkspaceTimelineProjection(cards,specs,parseWorkspaceTimelineQuery(new URLSearchParams(`timeline_mode=all&selected_task=${cards[0]!.id}`)),ids));
const serialization=await sample(()=>JSON.stringify(projection.last));
const requests:Array<{total:number;headers:number;downloadAndParse:number;bytes:number}>=[];
for(let i=0;i<warmups+samples;i++){
  const start=performance.now(),response=await fetch(`${origin}/workspace-data?route=timeline&timeline_mode=all`,{cache:'no-store'}),headers=performance.now()-start;
  if(!response.ok)throw Error(`HTTP${response.status}`);
  const text=await response.text();JSON.parse(text);const total=performance.now()-start;
  if(i>=warmups)requests.push({total,headers,downloadAndParse:total-headers,bytes:Buffer.byteLength(text)});
}
const report={capturedAt:new Date().toISOString(),runtime:process.version,platform:process.platform,arch:process.arch,protocol:{warmups,samples,serial:true,cold:'not measured; first context read is an observation, not OS-cold p95'},dataset:{tasks:context.tasks.length,specs:context.specs.length,edges:cards.reduce((n,c)=>n+c.dependsOn.length,0)},initialContextMs,filesystemContext:io.timing,sourceIndexRevision:index.timing,projectionOnly:projection.timing,selectedTraceProjection:selected.timing,serializationOnly:{...serialization.timing,bytes:Buffer.byteLength(serialization.last)},httpTotal:summarize(requests.map(r=>r.total)),httpHeaders:summarize(requests.map(r=>r.headers)),httpDownloadAndParse:summarize(requests.map(r=>r.downloadAndParse)),httpSamples:requests,scope:'Filesystem loads context; source builds revision/index from reused context; projections reuse immutable in-memory cards; serialization is projection DTO only; HTTP is complete Node production endpoint including fresh context/serialization/download/parse. These are distinct measurements, not additive percentiles. No detail, OS-cold, browser-render or final combined gate claim.'};
await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,filesystemP95:report.filesystemContext.p95,projectionP95:report.projectionOnly.p95,selectedP95:report.selectedTraceProjection.p95,httpP95:report.httpTotal.p95,bytes:report.httpSamples[0]!.bytes}));
