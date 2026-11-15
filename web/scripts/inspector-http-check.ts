/** TASK-128 HTTP/SSR evidence only. Never opens a browser or executes page JavaScript. */
import { createHash } from 'node:crypto';
import { mkdtemp,mkdir,readFile,readdir,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { initializeProject,createSpec,createTask } from '../../src/repository.ts';
const marker='TASK128_HTTP_DISPOSABLE';
if(process.argv[2]==='--prepare'){
  const root=await mkdtemp('/private/tmp/spm-task128-http-fixture-'),badRoot=await mkdtemp('/private/tmp/spm-task128-http-uninitialized-');await initializeProject(root);
  const spec=await createSpec(root,{title:'HTTP inspector spec specimen',summary:'Readable direct SSR spec detail.',status:'active'});
  await writeFile(spec.filePath,`${await readFile(spec.filePath,'utf8')}\n\n## Inspection evidence\n\nHTTP_SPEC_BODY_READABLE\n`);
  const task=await createTask(root,{title:'HTTP inspector task specimen',summary:'Readable direct SSR task detail.',specIds:[spec.id]});
  await writeFile(task.filePath,`${await readFile(task.filePath,'utf8')}\n\n## Inspection evidence\n\nHTTP_TASK_BODY_READABLE\n`);
  await writeFile(join(root,'.task128-http-fixture'),marker);await writeFile(join(badRoot,'.task128-http-fixture'),marker);await mkdir(join(badRoot,'.specpm'));await writeFile(join(badRoot,'.specpm/config.toml'),'[[ invalid TOML');
  const config={root,badRoot,taskId:task.id,specId:spec.id};await writeFile(join(root,'http-fixture.json'),JSON.stringify(config));console.log(JSON.stringify(config));
}else{
  const [origin,badOrigin,fixturePath,sourceRoot,hashesPath,output]=process.argv.slice(2);
  if(!origin||!badOrigin||!fixturePath||!sourceRoot||!hashesPath||!output)throw new Error('Usage: --prepare OR <loopback-origin> <failing-project-origin> <fixture.json> <built-snapshot> <hashes.json> <report.json>');
  for(const value of [origin,badOrigin])if(!['127.0.0.1','localhost','[::1]'].includes(new URL(value).hostname))throw new Error('Use loopback-only verification servers.');
  const fixture=JSON.parse(await readFile(fixturePath,'utf8')),metadata=JSON.parse(await readFile(hashesPath,'utf8'));
  if(await readFile(join(fixture.root,'.task128-http-fixture'),'utf8')!==marker||await readFile(join(fixture.badRoot,'.task128-http-fixture'),'utf8')!==marker)throw new Error('Unowned fixture.');
  const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
  for(const [path,hash] of Object.entries(metadata.sha256))if(digest(await readFile(join(sourceRoot,path)))!==hash)throw new Error(`Source snapshot changed: ${path}`);
  const checks:Array<{name:string;pass:boolean;detail?:unknown}>=[],requests:Array<Record<string,unknown>>=[];
  const check=(name:string,pass:boolean,detail?:unknown)=>checks.push({name,pass,...(detail===undefined?{}:{detail})});
  async function get(path:string,bad=false){const response=await fetch((bad?badOrigin:origin)+path,{signal:AbortSignal.timeout(20000)}),text=await response.text();requests.push({origin:bad?'invalid-config-fixture':'fixture',path,status:response.status,bytes:Buffer.byteLength(text),cacheControl:response.headers.get('cache-control')});return {response,text};}
  async function markup(html:string){const result={shell:false,heading:'',reader:'',missing:'',closeLinks:[] as string[],canonicalLinks:[] as string[],hidden:true};
    await new HTMLRewriter().on('.workspace-shell',{element(){result.shell=true;}}).on('.inspector-host',{element(element){result.hidden=element.hasAttribute('hidden');}})
      .on('.inspector-host h2',{text(chunk){result.heading+=chunk.text;}}).on('.inspector-reader p',{text(chunk){result.reader+=chunk.text;}}).on('.not-found h1',{text(chunk){result.missing+=chunk.text;}})
      .on('.inspector-host a',{element(element){const href=element.getAttribute('href');if(href)result.canonicalLinks.push(href.replaceAll('&amp;','&'));},text(chunk){if(chunk.text.includes('Close inspector'))result.closeLinks.push(chunk.text);}}).transform(new Response(html)).text();return result;}
  const phase:Record<string,unknown>={};
  try{
    for(const kind of ['task','spec'] as const){const id=kind==='task'?fixture.taskId:fixture.specId;
      const ok=await get(`/workspace-detail?kind=${kind}&id=${id}`),value=JSON.parse(ok.text);check(`${kind}: detail endpoint200/no-store with exact identity`,ok.response.status===200&&ok.response.headers.get('cache-control')==='no-store'&&value.schemaVersion===1&&value.kind===kind&&value.id===id&&value.detail.found===true);
      const missingId=kind==='task'?'TASK-99999':'SPEC-99999',missing=await get(`/workspace-detail?kind=${kind}&id=${missingId}`),missingValue=JSON.parse(missing.text);check(`${kind}: missing endpoint404/no-store remains a matching envelope`,missing.response.status===404&&missing.response.headers.get('cache-control')==='no-store'&&missingValue.kind===kind&&missingValue.id===missingId&&missingValue.detail.found===false);
      const route=kind==='task'?'tasks':'specs',page=await get(`/${route}?inspect=${kind}:${id}&section=document`),view=await markup(page.text);const title=kind==='task'?'HTTP inspector task specimen':'HTTP inspector spec specimen',body=kind==='task'?'HTTP_TASK_BODY_READABLE':'HTTP_SPEC_BODY_READABLE';
      check(`${kind}: direct inspect SSR has readable heading/body outside scripts`,page.response.status===200&&view.shell&&!view.hidden&&view.heading.includes(title)&&view.reader.includes(body),view);
      check(`${kind}: SSR inspector exposes genuine close/canonical links`,view.closeLinks.length>0&&view.canonicalLinks.includes(`/${route}/${id}`));
      const canonicalMissing=await get(`/${route}/${missingId}`),errorView=await markup(canonicalMissing.text);check(`${kind}: canonical missing detail returns404 inside shell`,canonicalMissing.response.status===404&&errorView.shell&&errorView.missing.includes(missingId));
      const canonical=await get(`/${route}/${id}`);check(`${kind}: existing canonical detail remains200`,canonical.response.status===200);
    }
    const invalid=['','kind=task','kind=alien&id=TASK-001','kind=task&id=SPEC-001','kind=spec&id=TASK-001','kind=task&id=..%2Fsecret','kind=task&id=TASK-%20bad'];
    for(const query of invalid){const response=await get('/workspace-detail?'+query,true);check(`invalid identity rejected before unavailable project IO: ${query||'(empty)'}`,response.response.status===400&&response.response.headers.get('cache-control')==='no-store'&&JSON.parse(response.text).error==='Invalid inspector identity.');}
    const unavailable=await get(`/workspace-detail?kind=task&id=${fixture.taskId}`,true);check('valid identity attempts unavailable project IO and yields500/no-store',unavailable.response.status===500&&unavailable.response.headers.get('cache-control')==='no-store');
    for(const route of ['tasks','specs','timeline']){const base=`/workspace-data?route=${route}&page=1&pageSize=50&sort=id.asc`;const snapshots=[];
      for(const tail of ['',`&inspect=task:${fixture.taskId}&section=relations`,`&inspect=spec:${fixture.specId}&section=document`]){const response=await get(base+tail);check(`${route}: list query endpoint200/no-store`,response.response.status===200&&response.response.headers.get('cache-control')==='no-store');snapshots.push(JSON.parse(response.text));}
      check(`${route}: requestKey unchanged by inspect/section only`,snapshots.every(value=>value.requestKey===snapshots[0].requestKey));
      if(route!=='timeline')check(`${route}: returned row identities unchanged by inspect/section`,snapshots.every(value=>JSON.stringify(value.data.result.rows.map((row:{id:string})=>row.id))===JSON.stringify(snapshots[0].data.result.rows.map((row:{id:string})=>row.id))));
    }
    const manifest=JSON.parse(await readFile(join(sourceRoot,'web/.svelte-kit/output/client/.vite/manifest.json'),'utf8')),keys=Object.keys(manifest),nodes=join(sourceRoot,'web/.svelte-kit/generated/client/nodes');phase.importClosures=[];
    const detailFiles=keys.filter(key=>['TaskDetail','SpecDetail','DocumentBody'].includes(manifest[key].name)||key.toLowerCase().includes('mermaid'));
    for(const route of ['tasks','specs']){let nodeName:string|undefined;for(const file of await readdir(nodes))if((await readFile(join(nodes,file),'utf8')).includes(`/routes/${route}/+page.svelte`))nodeName=`nodes/${file.replace(/\.js$/,'')}`;
      if(!nodeName)throw new Error('Missing route node '+route);const seen=new Set<string>();const visit=(key:string)=>{if(seen.has(key))return;seen.add(key);for(const dep of manifest[key].imports??[])visit(dep);};for(const key of keys.filter(key=>['entry/app','entry/start','nodes/0','nodes/1',nodeName].includes(manifest[key].name)))visit(key);
      const forbidden=[...seen].filter(key=>detailFiles.includes(key)),staticDetailMarkers=[];for(const key of seen){const code=await readFile(join(sourceRoot,'web/.svelte-kit/output/client',manifest[key].file),'utf8');for(const marker of ['Source narrative','Resolved decisions','No closed-state lifecycle timestamps yet.'])if(code.includes(marker))staticDetailMarkers.push({module:manifest[key].name,marker});}check(`${route}: closed-list production static imports exclude detail/Mermaid`,!forbidden.length&&!staticDetailMarkers.length,{modules:seen.size,forbidden,staticDetailMarkers});(phase.importClosures as unknown[]).push({route,node:nodeName,modules:[...seen].map(key=>manifest[key].name).sort(),forbidden,staticDetailMarkers});
      const closed=await get(`/${route}`),closedView=await markup(closed.text);check(`${route}: closed SSR has no readable inspector body`,closed.response.status===200&&closedView.hidden&&!closedView.heading&&!closedView.reader);
    }
  }catch(error){check('HTTP/SSR verification completed',false,error instanceof Error?error.message:String(error));}
  const report={schemaVersion:1,scope:'HTTP/SSR and production static imports only; no browser, page-JavaScript, keyboard, layout, no-JS-browser or latency claims.',source:metadata,fixture:{taskId:fixture.taskId,specId:fixture.specId,invalidConfigProject:true},checks,requests,...phase,pass:checks.every(check=>check.pass),passed:checks.filter(check=>check.pass).length,failed:checks.filter(check=>!check.pass).length};
  await writeFile(output,JSON.stringify(report,null,2)+'\n');
  await writeFile(output.replace(/\.json$/,'.md'),`# TASK-128 HTTP/SSR verification\n\n${report.scope}\n\nResult: **${report.passed} passed, ${report.failed} failed**. [Raw report](task128-http-report.json) records the exact base commit and ${Object.keys(metadata.sha256).length} source hashes. Source was copied during an explicit stable window and verified before/after/copy; only that isolated checkpoint is certified. Production build passed using existing linked dependencies, without installation.\n\nChecks cover closed Tasks/Specs initial static import closures, direct Task/Spec inspect SSR heading/body in actual markup (excluding serialized script data), genuine SSR close/canonical links, endpoint200/404/no-store, canonical404 with shell, and requestKey independence from inspect/section for Tasks/Specs/Timeline. A deliberately invalid-config project server returns400 for invalid kind/ID and500 for a valid identity, demonstrating validation happens before project IO. These are HTTP observations, not a native no-JS browser claim.\n\n${checks.filter(check=>!check.pass).map(check=>`- FAIL ${check.name}: ${JSON.stringify(check.detail)}`).join('\n')||'No failing checks.'}\n\nReproduce: \`bun web/scripts/inspector-http-check.ts --prepare\`; serve the built snapshot on two loopback ports with SPM_PROJECT_ROOT set to the returned initialized and invalid-config roots respectively; then run \`bun web/scripts/inspector-http-check.ts <origin> <failing-project-origin> <fixture.json> <built-snapshot> <source-hashes.json> web/verification/task128-http-report.json\`. This checker never writes project documents after fixture creation.\n`);console.log(JSON.stringify({pass:report.pass,passed:report.passed,failed:report.failed}));if(!report.pass)process.exitCode=1;
}
