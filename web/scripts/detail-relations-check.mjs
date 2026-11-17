// TASK-138 consumer evidence. Synthetic fixture only; no private docs or model calls.
export async function verifyDetailRelations(page,{baseURL='http://127.0.0.1:5295',phase='reader',evidenceDir}={}){
 const report={phase,capturedAt:new Date().toISOString(),browser:page.context().browser().version(),checks:[]};
 const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail:structuredClone(detail)});if(!pass)throw Error(name);};
 const pause=()=>page.waitForTimeout(30),range=(p,name)=>p.locator(`[data-relation-window=${name}] .window-controls p`);
 const waitRange=(p,name,value)=>p.waitForFunction(({name,value})=>document.querySelector(`[data-relation-window=${name}] .window-controls p`)?.textContent.includes(value),{name,value});
 const hydrated=async(p,url)=>{await p.goto(url);await p.waitForSelector('.inspector-host.enhanced');};
 try{
  await page.setViewportSize({width:1440,height:900});
  if(phase==='reader'){
   const requests=[];const collect=request=>{if(/\/workspace-(detail|relations|data)/.test(request.url()))requests.push(request.url());};page.on('request',collect);
   try{
    await hydrated(page,`${baseURL}/tasks?inspect=task:TASK-00001&section=relations&rel.blockingTasks=999&rel.relatedHandoffs=999&q=Relation`);
    await page.waitForFunction(()=>new URL(location.href).searchParams.get('rel.blockingTasks')==='100'&&new URL(location.href).searchParams.get('rel.relatedHandoffs')==='3');
    check('SSR clamp canonizes two collections after router completion',new URL(page.url()).searchParams.get('q')==='Relation'&&(await range(page,'blockingTasks').innerText()).includes('9901–9999 of 9999')&&(await range(page,'relatedHandoffs').innerText()).includes('201–201 of 201'));
    check('Clamped initial seed makes no duplicate detail/relation fetch',requests.length===0,requests);
    check('Each mounted relation remains at most100 rows',[...await page.locator('[data-relation-window]').evaluateAll(nodes=>nodes.map(node=>node.querySelectorAll('[data-relation-item]').length))].every(count=>count<=100));
    await page.getByRole('button',{name:'Close inspector',exact:true}).click();await page.waitForFunction(()=>!new URL(location.href).searchParams.has('inspect'));
    check('Close removes every relation key and preserves list query',!Array.from(new URL(page.url()).searchParams.keys()).some(key=>key.startsWith('rel.'))&&new URL(page.url()).searchParams.get('q')==='Relation');
    await hydrated(page,`${baseURL}/tasks?inspect=task:TASK-00001&section=relations&rel.blockingTasks=2`);requests.length=0;
    await page.locator('[data-detail-section=document]').evaluate(node=>node.dataset.identityMarker='document-stable');
    const fail=route=>route.abort('failed');await page.route('**/workspace-relations*relation=blockingTasks&page=3',fail);
    await page.getByRole('link',{name:'Next Downstream tasks',exact:true}).click();await page.locator('[data-relation-window=blockingTasks] [role=alert]').waitFor();
    check('Failed page3 retains page2 range and desired URL',new URL(page.url()).searchParams.get('rel.blockingTasks')==='3'&&(await range(page,'blockingTasks').innerText()).includes('101–200 of 9999'));
    check('Failure message and Retry identify requested page3',(await page.locator('[data-relation-window=blockingTasks]').innerText()).includes('Could not load page 3; showing page 2')&&await page.getByRole('button',{name:'Retry page 3',exact:true}).count()===1);
    await page.unroute('**/workspace-relations*relation=blockingTasks&page=3',fail);await page.getByRole('button',{name:'Retry page 3',exact:true}).click();await waitRange(page,'blockingTasks','201–300');
    check('Retry changes only relation transport and retains document DOM',await page.locator('[data-detail-section=document]').getAttribute('data-identity-marker')==='document-stable'&&requests.every(url=>url.includes('/workspace-relations?')),requests);
    await page.getByRole('link',{name:'Next Downstream tasks',exact:true}).focus();await page.keyboard.press('Enter');await waitRange(page,'blockingTasks','301–400');
    check('Keyboard pagination preserves focus on activated control',await page.getByRole('link',{name:'Next Downstream tasks',exact:true}).evaluate(node=>node===document.activeElement));
    await page.getByRole('link',{name:'Last Downstream tasks page',exact:true}).click();await waitRange(page,'blockingTasks','9901–9999');
    check('Final downstream occurrence is reachable',await page.locator('[data-relation-window=blockingTasks] a[href="/tasks/TASK-10000"]').count()===1);
    await page.setViewportSize({width:390,height:844});check('Breakpoint retains accepted page and document subtree',(await range(page,'blockingTasks').innerText()).includes('9901–9999')&&await page.locator('[data-detail-section=document]').getAttribute('data-identity-marker')==='document-stable');
    await page.setViewportSize({width:1440,height:900});
    await hydrated(page,`${baseURL}/specs?inspect=spec:SPEC-00001&section=relations`);
    await page.getByRole('link',{name:'Last Linked tasks page',exact:true}).click();await waitRange(page,'linkedTasks','9901–10000');
    check('Spec10k final task reachable with100 total mounted across groups',await page.locator('[data-relation-window=linkedTasks] [data-relation-item]').count()===100&&await page.locator('[data-relation-window=linkedTasks] a[href="/tasks/TASK-10000"]').count()===1);
    check('Full spec questions/source remain present',await page.locator('[data-detail-section=questions]').innerText().then(text=>text.includes('Does the canonical answer remain durable?'))&&await page.locator('[data-detail-section=document]').innerText().then(text=>text.includes('Reader section 12')));
    if(evidenceDir)await page.screenshot({path:`${evidenceDir}/task138-spec-last.png`});
   }finally{page.off('request',collect);}
  }
  if(phase==='canonical'){
   await page.goto(`${baseURL}/specs/SPEC-00001?rel.linkedTasks=999&rel.relatedHandoffs=999&keep=x#reader`);await page.waitForFunction(()=>new URL(location.href).searchParams.get('rel.linkedTasks')==='100'&&new URL(location.href).searchParams.get('rel.relatedHandoffs')==='3');
   check('Canonical SSR clamp retains unrelated parameters/hash',new URL(page.url()).searchParams.get('keep')==='x'&&new URL(page.url()).hash==='#reader');
   check('Canonical relation cardinality bounded',(await page.locator('[data-relation-window=linkedTasks] [data-relation-item]').count())===100);
   await page.locator('textarea[name=answer]').fill('Unsubmitted answer survives pagination.');await page.locator('[data-detail-section=document]').evaluate(node=>node.dataset.identityMarker='canonical-document');
   await page.getByRole('link',{name:'Previous Linked tasks',exact:true}).click();await waitRange(page,'linkedTasks','9801–9900');
   check('Canonical page keeps question draft and document DOM during relation request',await page.locator('textarea[name=answer]').inputValue()==='Unsubmitted answer survives pagination.'&&await page.locator('[data-detail-section=document]').getAttribute('data-identity-marker')==='canonical-document');
   const revision=async route=>{const response=await route.fetch(),value=await response.json();value.revision='DIFFERENT-SYNTHETIC-REVISION';await route.fulfill({response,json:value});};
   await page.route('**/workspace-relations*',revision);await page.getByRole('link',{name:'Previous Linked tasks',exact:true}).click();await page.locator('.reader-error').waitFor();
   check('Revision conflict retains previous range and answer draft',(await range(page,'linkedTasks').innerText()).includes('9801–9900')&&await page.locator('textarea[name=answer]').inputValue()==='Unsubmitted answer survives pagination.');await page.unroute('**/workspace-relations*',revision);
   await page.getByRole('button',{name:'Retry detail refresh',exact:true}).click();await waitRange(page,'linkedTasks','9701–9800');
   check('Explicit whole refresh accepts all requested windows and preserves draft',await page.locator('textarea[name=answer]').inputValue()==='Unsubmitted answer survives pagination.'&&new URL(page.url()).searchParams.get('rel.relatedHandoffs')==='3');
   await page.goto(`${baseURL}/specs/SPEC-00002`);await page.waitForSelector('textarea[name=answer]');await page.getByRole('button',{name:'Save answered questions',exact:true}).click();await page.locator('.feedback-error').waitFor();check('JS-enabled ordinary POST error renders through v2 loader',await page.locator('.feedback-error').innerText().then(text=>text.includes('Add at least one answer')));
   await page.locator('textarea[name=answer]').first().fill('JS ordinary POST keeps the canonical action.');await page.getByRole('button',{name:'Save answered questions',exact:true}).click();await page.locator('.feedback-success').waitFor();check('JS-enabled canonical POST saves and retains continuation evaluation',await page.locator('.feedback-success').innerText().then(text=>text.includes('1 answer recorded'))&&await page.getByText('Continuation guidance',{exact:true}).count()===1);
  }
  if(phase==='native'){
   const context=await page.context().browser().newContext({javaScriptEnabled:false});
   try{const native=await context.newPage();for(const [path,query,name,last,total]of [['/tasks/TASK-00001','','blockingTasks','TASK-10000','9999'],['/tasks','?inspect=task:TASK-00001&keep=x','blockingTasks','TASK-10000','9999'],['/specs/SPEC-00001','','linkedTasks','TASK-10000','10000'],['/specs','?inspect=spec:SPEC-00001&keep=x','linkedTasks','TASK-10000','10000']]){
    const response=await native.goto(baseURL+path+query);check(`NoJS ${path}${query}: SSR readable and bounded`,response.status()===200&&await native.locator(`[data-relation-window=${name}] [data-relation-item]`).count()===100);
    await native.getByRole('link',{name:name==='blockingTasks'?'Last Downstream tasks page':'Last Linked tasks page',exact:true}).click();
    check(`NoJS ${path}: real Last link reaches final occurrence`,await native.locator(`[data-relation-window=${name}] a[href="/tasks/${last}"]`).count()===1&&(await range(native,name).innerText()).includes(`of ${total}`));
    if(query)check(`NoJS ${path}: unrelated URL preserved`,new URL(native.url()).searchParams.get('keep')==='x');
   }
   for(const [path,id]of [['tasks','TASK-MISSING'],['specs','SPEC-MISSING']]){const response=await native.goto(`${baseURL}/${path}/${id}`);check(`NoJS ${path} canonical404 retains shell`,response.status()===404&&await native.locator('.sidebar').count()===1);}
   await native.goto(`${baseURL}/specs/SPEC-00002`);await native.locator('textarea[name=answer]').fill('NoJS canonical POST remains durable.');await native.getByRole('button',{name:'Save answered questions',exact:true}).click();check('NoJS canonical POST saves through bounded loader',await native.locator('.feedback-success').innerText().then(text=>text.includes('1 answer recorded'))&&await native.getByText('Continuation guidance',{exact:true}).count()===1);
   }finally{await context.close();}
  }
  report.pass=true;
 }catch(error){report.pass=false;report.error=String(error);throw Object.assign(error,{report});}

 return report;
}
