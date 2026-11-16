import {readFile,readdir,writeFile} from 'node:fs/promises';import {join,resolve} from 'node:path';
const [sourceRoot=process.cwd(),output='web/verification/task129-production-closure.json',base='unknown']=process.argv.slice(2);
const root=resolve(sourceRoot),client=join(root,'web/.svelte-kit/output/client'),manifest=JSON.parse(await readFile(join(client,'.vite/manifest.json'),'utf8')),keys=Object.keys(manifest),nodes=join(root,'web/.svelte-kit/generated/client/nodes');
const forbiddenNames=['TaskDetail','SpecDetail','SpecQuestions','DocumentBody','action-response','question-editor'];
const results=[];
for(const route of ['tasks','specs']){
 let nodeName:string|undefined;for(const file of await readdir(nodes))if((await readFile(join(nodes,file),'utf8')).includes(`/routes/${route}/+page.svelte`))nodeName=`nodes/${file.replace(/\.js$/,'')}`;
 if(!nodeName)throw Error('Missing route node '+route);const seen=new Set<string>();
 const visit=(key:string)=>{if(seen.has(key))return;seen.add(key);for(const dependency of manifest[key].imports??[])visit(dependency);};
 for(const key of keys.filter(key=>['entry/app','entry/start','nodes/0','nodes/1',nodeName].includes(manifest[key].name)))visit(key);
 const forbidden=[...seen].filter(key=>forbiddenNames.includes(manifest[key].name)||key.toLowerCase().includes('mermaid')),markers=[];
 for(const key of seen){const code=await readFile(join(client,manifest[key].file),'utf8');for(const marker of ['Save answered questions','Current open questions','Recovered answer ·','Source narrative','Resolved decisions'])if(code.includes(marker))markers.push({module:manifest[key].name,marker});}
 results.push({route,node:nodeName,modules:[...seen].map(key=>manifest[key].name).sort(),forbidden,markers,pass:!forbidden.length&&!markers.length});
}
const report={base,sourceRoot:root,scope:'Production static import closure from app/start/layout/error/list entries. Dynamic imports excluded. QuestionLeaveDialog and identity-only seed metadata are intentionally shared; no detail/editor/Mermaid import or latency claim.',results,pass:results.every(r=>r.pass)};
await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
