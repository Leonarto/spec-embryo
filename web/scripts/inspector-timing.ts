// Read-only serial diagnostic: HTTP transport and pure projection are separate.
import {writeFile} from 'node:fs/promises';
const origin=process.argv[2]??'http://127.0.0.1:5188';
const output=process.argv[3]??'web/verification/task128-detail-http-timing.json';
const warmups=5,samples=20;
const results=[];
for(const id of ['TASK-00001','TASK-09999']){
  const rows=[];let first;
  for(let n=-warmups;n<samples;n++){
    const start=performance.now(),response=await fetch(`${origin}/workspace-detail?kind=task&id=${id}`,{cache:'no-store'}),headers=performance.now(),text=await response.text(),received=performance.now(),value=JSON.parse(text),parsed=performance.now();
    if(!response.ok)throw new Error(`${id}: HTTP ${response.status}`);
    const sample={headersMs:headers-start,downloadMs:received-headers,jsonParseMs:parsed-received,totalMs:parsed-start,bytes:Buffer.byteLength(text),relations:value.detail.blockingTasks.length};
    if(n===-warmups)first=sample;if(n>=0)rows.push(sample);
  }
  const sorted=rows.map(row=>row.totalMs).sort((a,b)=>a-b);results.push({id,firstObservation:first,medianMs:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.ceil(sorted.length*.95)-1],samples:rows});
}
const report={capturedAt:new Date().toISOString(),runtime:Bun.version,origin,warmups,sampleCount:samples,scope:'Serial HTTP+download+JSON parse only. First observation is not OS-cold p95; no browser render claim.',results};await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(results.map(({id,medianMs,p95Ms,samples})=>({id,medianMs,p95Ms,bytes:samples[0].bytes,relations:samples[0].relations}))));
