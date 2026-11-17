import { cpus,platform,release } from 'node:os';
const origin=process.argv[2]??'http://127.0.0.1:5187';
const warmups=5,sampleCount=20;
const rows=[];
for(const route of ['tasks','specs']){
  const samples=[];let firstReadMs=0,bytes=0,total=0;
  for(let n=-warmups;n<sampleCount;n++){
    const start=performance.now();const response=await fetch(`${origin}/workspace-data?route=${route}&page=2`,{cache:'no-store'});const headersMs=performance.now()-start;
    const text=await response.text();const totalMs=performance.now()-start;
    if(!response.ok)throw new Error(`HTTP ${response.status}: ${text.slice(0,200)}`);
    const data=JSON.parse(text);if(data.route!==route||data.schemaVersion!==1||data.data.result.rows.length!==100)throw new Error('Unexpected list envelope');
    bytes=Buffer.byteLength(text);total=data.data.result.totalMatching;
    if(n===-warmups)firstReadMs=totalMs;
    if(n>=0)samples.push({headersMs,totalMs});
  }
  const percentile=(key:'headersMs'|'totalMs',p:number)=>samples.map(s=>s[key]).sort((a,b)=>a-b)[Math.ceil(samples.length*p)-1];
  rows.push({route,totalMatching:total,pageRows:100,payloadBytes:bytes,firstReadMs,medianHeadersMs:percentile('headersMs',.5),p95HeadersMs:percentile('headersMs',.95),medianTotalMs:percentile('totalMs',.5),p95TotalMs:percentile('totalMs',.95),samples});
}
console.log(JSON.stringify({origin,clientRuntime:`Bun ${Bun.version}`,server:'Vite development server, Node runtime; source handlers shared with SSR',os:`${platform()} ${release()}`,cpu:cpus()[0]?.model,warmups,sampleCount,scope:'Sequential HTTP headers/body timings; first read is not verified OS-cold disk. No browser render timing included.',rows},null,2));
