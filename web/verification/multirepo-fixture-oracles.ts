import {readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
const base='/private/tmp/spm-multirepo-smoke-YV1P1i';
const manifest=JSON.parse(await readFile(join(base,'manifest.json'),'utf8'));
const byLabel=Object.fromEntries(manifest.projects.map((p:any)=>[p.label,p]));
const file=async(label:string)=>await readFile(byLabel[label].specPath,'utf8');
const registry=manifest.registry;
const assert=(v:unknown,s:string)=>{if(!v)throw Error(s);console.log('PASS',s)};
const cmd=process.argv[2];
if(cmd==='snapshot'){
 const texts=Object.fromEntries(await Promise.all(['Launch','Registered','Browser'].map(async n=>[n,await file(n)])));
 for(const [label,needle] of [['Launch','enhanced launch only'],['Launch','saved on launch before switch'],['Registered','native registered only']]){
  assert(texts[label].includes(needle),`${needle} saved in ${label}`);
  for(const other of ['Launch','Registered','Browser'].filter(n=>n!==label))assert(!texts[other].includes(needle),`${needle} absent from ${other}`);
 }
 for(const n of ['Launch','Registered','Browser'])assert(!texts[n].includes('kept launch draft'),`discarded draft absent from ${n}`);
 await writeFile(join(base,'pre-remap.json'),JSON.stringify(texts));
}else if(cmd==='remap'){
 const data=JSON.parse(await readFile(registry,'utf8'));
 const selected=data.projects.find((p:any)=>p.id==='registered');
 assert(!!selected&&selected.path===byLabel.Registered.root,'registered record points to fixture root before remap');
 data.projects=data.projects.filter((p:any)=>p.id!=='browser');selected.path=byLabel.Browser.root;
 const temp=join(base,'registry-remap-owned.json');await writeFile(temp,JSON.stringify(data,null,2));await rename(temp,registry);
 assert(true,'fixture registry remapped atomically');
}else if(cmd==='verify'){
 const before=JSON.parse(await readFile(join(base,'pre-remap.json'),'utf8'));
 for(const n of ['Launch','Registered','Browser'])assert(await file(n)===before[n],`${n} spec unchanged after remap response`);
}else if(cmd==='security'){
 const before=await readFile(registry,'utf8');
 for(const [url,origin,label] of [['http://127.0.0.1:41817/repositories','http://foreign.invalid','foreign Origin'],['http://127.0.0.1:41818/repositories','http://127.0.0.1:41818','non-loopback listener']]){
  const response=await fetch(url,{method:'POST',headers:{origin,accept:'text/html','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({name:'Denied',path:byLabel.Launch.root,id:'denied'}),redirect:'manual'});
  assert(response.status===403,`${label} registration returns 403`);assert(await readFile(registry,'utf8')===before,`${label} leaves registry unchanged`);
 }
}else throw Error('Use snapshot | remap | verify | security');
