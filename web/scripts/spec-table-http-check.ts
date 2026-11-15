// Read-only HTTP/production import audit for the isolated TASK-137 consumer.
import { createHash } from 'node:crypto';
import { readFile,readdir,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const [origin,sourceRoot,fixtureRoot,output]=process.argv.slice(2);
if(!origin||!sourceRoot||!fixtureRoot||!output)throw new Error('Usage: <loopback origin> <built source snapshot> <disposable fixture> <report.json>');
if(!['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname))throw new Error('Use a loopback verification server.');
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
async function documentHashes(){const result:Record<string,string>={};for(const folder of ['specs','tasks'])for(const name of (await readdir(join(fixtureRoot,'docs/spm',folder))).sort())result[`${folder}/${name}`]=hash(await readFile(join(fixtureRoot,'docs/spm',folder,name)));return result;}
const before=await documentHashes(),checks:Array<{name:string;pass:boolean;detail?:unknown}>=[],requests:Array<Record<string,unknown>>=[];
const check=(name:string,pass:boolean,detail?:unknown)=>checks.push({name,pass,...(detail===undefined?{}:{detail})});
for(const [query,count] of [['q=NO-MATCH-137',0],['q=SPEC-00001',1],['pageSize=200&sort=id.asc',200]]){
  const path=`/workspace-data?route=specs&taskScope=all&${query}`,response=await fetch(origin+path),text=await response.text(),data=JSON.parse(text).data;
  check(`${count}-row JSON result and no-store`,response.status===200&&data.result.rows.length===count&&response.headers.get('cache-control')==='no-store');
  check(`${count}-row JSON omits bodies/foreign views`,!text.includes('SPEC137_PRIVATE_BODY')&&!text.includes('TASK137_PRIVATE_BODY')&&!('kanban'in data)&&!('timeline'in data)&&!('criticalPath'in data));
  const htmlResponse=await fetch(origin+`/specs?taskScope=all&${query}`),html=await htmlResponse.text();let rows=0,grid=false;
  await new HTMLRewriter().on('table tbody tr',{element(){rows++;}}).on('table[role=grid]',{element(){grid=true;}}).transform(new Response(html)).text();
  check(`${count}-row SSR native table matches JSON`,htmlResponse.status===200&&rows===count&&!grid&&!html.includes('SPEC137_PRIVATE_BODY'));
  requests.push({path,status:response.status,jsonRows:data.result.rows.length,jsonBytes:Buffer.byteLength(text),htmlBytes:Buffer.byteLength(html)});
}
const response=await fetch(origin+'/workspace-data?route=specs&pageSize=100&taskScope=all'),text=await response.text();check('100-row JSON <=250KiB',response.status===200&&JSON.parse(text).data.result.rows.length===100&&Buffer.byteLength(text)<=250*1024,{bytes:Buffer.byteLength(text),budgetBytes:250*1024});
const manifest=JSON.parse(await readFile(join(sourceRoot,'web/.svelte-kit/output/client/.vite/manifest.json'),'utf8')),keys=Object.keys(manifest),seen=new Set<string>();
function visit(key:string){if(seen.has(key))return;seen.add(key);for(const dep of manifest[key].imports??[])visit(dep);}
for(const root of keys.filter(key=>['entry/app','entry/start','nodes/0','nodes/1','nodes/3'].includes(manifest[key].name)))visit(root);
const forbidden=[...seen].filter(key=>['DocumentBody','nodes/4','nodes/6'].includes(manifest[key].name)||key.toLowerCase().includes('mermaid'));check('Initial Specs static imports exclude details/Mermaid',!forbidden.length,{modules:seen.size,forbidden});
const after=await documentHashes();check('HTTP list reads leave all fixture documents byte-identical',JSON.stringify(before)===JSON.stringify(after),{documents:Object.keys(before).length});
const sourcePaths=['web/src/routes/specs/+page.svelte','web/src/lib/components/data-table/spec-columns.ts','web/src/lib/components/data-table/DataTable.svelte','web/src/lib/components/SelectDropdown.svelte','web/src/lib/components/MultiSelectDropdown.svelte','web/src/lib/components/Popover.svelte'];
const sourceHashes=Object.fromEntries(await Promise.all(sourcePaths.map(async path=>[path,hash(await readFile(join(sourceRoot,path)))])));
const report={baseCommit:'c32be17',snapshot:sourceRoot,fixture:'Disposable200specs/600tasks;0/1 are filtered result states, not separate physical datasets.',method:'HTTP SSR/JSON/bytes and transitive production static imports, excluding dynamic route references. No browser, runtime JavaScript or latency claim.',sourceHashes,checks,requests,pass:checks.every(check=>check.pass)};
await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:report.pass,checks:checks.length}));if(!report.pass)process.exitCode=1;
