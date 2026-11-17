// Targeted review regressions; actual browser plus explicitly controlled transport/focus fixtures.
export async function verifyDetailFixes(page,{baseURL='http://127.0.0.1:5295',phase='guard'}={}){
 const checks=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail:structuredClone(detail)});if(!pass)throw Object.assign(Error(name),{checks});};
 const ready=()=>page.waitForFunction(()=>document.querySelector('.inspector-layout')?.classList.contains('enhanced'));
 const range=name=>page.locator(`[data-relation-window=${name}] .window-controls p`);
 await page.setViewportSize({width:1440,height:900});
 try{
 if(phase==='guard'){
  await page.goto(`${baseURL}/specs/SPEC-00001?rel.linkedTasks=999`);await page.waitForFunction(()=>new URL(location.href).searchParams.get('rel.linkedTasks')==='100');
  await page.locator('textarea[name=answer]').fill(' ');let calls=0;const count=request=>{if(request.url().includes('/workspace-detail?'))calls++;};page.on('request',count);
  try{await page.waitForTimeout(5200);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('.reader-error').filter({hasText:'Unsaved answers kept'}).waitFor();
   check('Whitespace live form draft prevents auto refresh before transport',calls===0&&await page.locator('textarea[name=answer]').inputValue()===' ');
   await page.getByRole('button',{name:'Retry detail refresh',exact:true}).click();check('Manual Retry rechecks draft and retains accepted window',calls===0&&(await range('linkedTasks').innerText()).includes('9901–10000'));
   let entered,release;const started=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
   const handler=async route=>{const response=await route.fetch(),value=await response.json();value.revision='SYNTHETIC-NEW-SNAPSHOT';value.detail.spec.title='Changed remotely';value.detail.openQuestions=[{id:'Q-new',question:'Changed remote question?'}];entered();await gate;await route.fulfill({response,json:value});};
   await page.route('**/workspace-detail*',handler);
   try{await page.locator('textarea[name=answer]').fill('');await page.getByRole('button',{name:'Retry detail refresh',exact:true}).click();await started;await page.locator('textarea[name=answer]').fill('Typed while the request was pending');release();await page.locator('.reader-error').filter({hasText:'Unsaved answers kept'}).waitFor();
    check('Typing while pending blocks full acceptance without reassociating answers',await page.locator('textarea[name=answer]').inputValue()==='Typed while the request was pending'&&(await page.locator('.question-card strong').first().innerText()).includes('Does the canonical answer remain durable?')&&!(await page.title()).includes('Changed remotely'));
    await page.locator('textarea[name=answer]').fill('');await page.getByRole('button',{name:'Retry detail refresh',exact:true}).click();await page.getByText('Changed remote question?',{exact:true}).waitFor();check('Clearing answers then Retry explicitly accepts complete new snapshot',(await page.title()).includes('Changed remotely')&&await page.locator('.reader-error').count()===0);
   }finally{release();await page.unroute('**/workspace-detail*',handler);}
  }finally{page.off('request',count);}
 }
 if(phase==='empty'){
  for(const [path,query,name,mode]of [['/tasks/TASK-00001','?rel.blockingTasks=2','blockingTasks','item'],['/tasks','?inspect=task:TASK-00001&rel.blockingTasks=2','blockingTasks','pager'],['/specs/SPEC-00001','?rel.linkedTasks=2','linkedTasks','item'],['/specs','?inspect=spec:SPEC-00001&rel.linkedTasks=2','linkedTasks','pager']]){
   await page.goto(baseURL+path+query);await ready();await page.locator('[data-detail-section=document]').evaluate(node=>node.dataset.emptyMarker='stable');
   const target=mode==='item'?page.locator(`[data-relation-window=${name}] [data-relation-item]`).first():page.getByRole('link',{name:name==='blockingTasks'?'Next Downstream tasks':'Next Linked tasks',exact:true});await target.focus();
   const handler=async route=>{const response=await route.fetch(),value=await response.json();value.revision='SYNTHETIC-EMPTY-SNAPSHOT';for(const key of value.kind==='task'?['dependencies','blockingTasks','unmetDependencyIds','linkedSpecs','relatedHandoffs']:['linkedTasks','relatedHandoffs'])value.detail[key]={page:1,pageSize:100,total:0,totalPages:1,items:[]};if(value.kind==='spec'){value.detail.linkedTaskGroups=[];value.detail.progress={todo:0,inProgress:0,blocked:0,review:0,done:0,cancelled:0,completionRatio:0};}await route.fulfill({response,json:value});};
   await page.route('**/workspace-detail*',handler);
   try{await page.waitForTimeout(5200);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(name=>document.querySelector(`[data-relation-window=${name}] .window-controls p`)?.textContent.includes('0–0 of 0'),name);
    check(`${path} ${mode}: empty full snapshot retains range shell/focus`,await range(name).evaluate(node=>node===document.activeElement));check(`${path}: empty full snapshot retains document root`,await page.locator('[data-detail-section=document]').getAttribute('data-empty-marker')==='stable');
   }finally{await page.unroute('**/workspace-detail*',handler);}
  }
 }
 if(phase==='integration'||phase==='filters'){
  if(phase==='integration'){
  const handler=async route=>{const response=await route.fetch(),value=await response.json();if(value.detail.found){const key=value.kind==='task'?'blockingTasks':'linkedTasks';value.detail[key].items=value.detail[key].items.map((row,n)=>({...row,id:'TASK-DUP',title:`Repeated occurrence ${n}`}));}await route.fulfill({response,json:value});};
  await page.route('**/workspace-detail*',handler);
  try{await page.goto(`${baseURL}/tasks?sort=id.asc`);await ready();await page.locator('tr[data-entity-id=TASK-00001] a').first().click();await page.waitForSelector('.inspector-reader [data-relation-window=blockingTasks]');check('Task duplicate IDs have100 separate mounted occurrences',await page.locator('[data-relation-window=blockingTasks] a[href="/tasks/TASK-DUP"]').count()===100);await page.locator('.inspector-reader a[href="/specs/SPEC-00001"]').click();await page.waitForSelector('.inspector-reader [data-relation-window=linkedTasks]');check('Spec duplicate IDs have100 separate grouped mounted occurrences',await page.locator('[data-relation-window=linkedTasks] a[href="/tasks/TASK-DUP"]').count()===100);
  }finally{await page.unroute('**/workspace-detail*',handler);}
  await page.goto(`${baseURL}/tasks?inspect=task:TASK-00001&rel.blockingTasks=2`);await ready();let requests=0;const collect=request=>{if(request.url().includes('/workspace-relations?'))requests++;};page.on('request',collect);
  try{await page.evaluate(()=>{const anchor=document.createElement('a');anchor.href='/tasks?inspect=task:TASK-00001&rel.blockingTasks=999&rel.relatedHandoffs=999';anchor.textContent='Fixture client navigation';anchor.dataset.sveltekitPreloadData='off';document.querySelector('.tasks-toolbar').append(anchor);});await page.getByRole('link',{name:'Fixture client navigation',exact:true}).click();await page.waitForFunction(()=>new URL(location.href).searchParams.get('rel.blockingTasks')==='100'&&new URL(location.href).searchParams.get('rel.relatedHandoffs')==='3');check('Ready client navigation adopts clamped seed without old-intent refetch',requests===0,requests);
  }finally{page.off('request',collect);}
  }
  for(const javaScriptEnabled of [true,false]){
   const context=await page.context().browser().newContext({javaScriptEnabled});try{const filter=await context.newPage();await filter.goto(`${baseURL}/tasks?inspect=task:TASK-00001&rel.blockingTasks=2&rel.relatedHandoffs=2&q=Relation`);if(javaScriptEnabled)await filter.waitForFunction(()=>document.querySelector('.inspector-layout')?.classList.contains('enhanced'));
    const trigger=filter.locator('.tasks-toolbar details>summary').filter({hasText:/^Filters/}).first();await trigger.click();await filter.locator('.filters-shell').getByRole('button',{name:'Apply filters',exact:true}).click();await filter.waitForFunction(()=>document.querySelector('[data-relation-window=blockingTasks] .window-controls p')?.textContent.includes('101–200'));
    check(`GET Apply JS=${javaScriptEnabled}: same inspector and relation pages retained`,new URL(filter.url()).searchParams.get('inspect')==='task:TASK-00001'&&new URL(filter.url()).searchParams.get('rel.blockingTasks')==='2'&&new URL(filter.url()).searchParams.get('rel.relatedHandoffs')==='2');
    if(!await trigger.evaluate(summary=>summary.parentElement.open))await trigger.click();await filter.locator('.filters-shell').getByRole('link',{name:'Clear filters',exact:true}).click();await filter.waitForURL(url=>!url.searchParams.has('q'));
    check(`Clear JS=${javaScriptEnabled}: same inspector/relation intent retained`,new URL(filter.url()).searchParams.get('inspect')==='task:TASK-00001'&&new URL(filter.url()).searchParams.get('rel.blockingTasks')==='2'&&new URL(filter.url()).searchParams.get('rel.relatedHandoffs')==='2');
   }finally{await context.close();}
  }
 }
 if(phase==='listcarry'){
  for(const javaScriptEnabled of [true,false])for(const route of ['tasks','specs']){
   const context=await page.context().browser().newContext({javaScriptEnabled});
   try{const view=await context.newPage(),kind=route==='tasks'?'task':'spec',id=kind==='task'?'TASK-00001':'SPEC-00001',name=kind==='task'?'blockingTasks':'linkedTasks';
    await view.goto(`${baseURL}/${route}?inspect=${kind}:${id}&rel.${name}=2&rel.relatedHandoffs=2`);if(javaScriptEnabled)await view.waitForFunction(()=>document.querySelector('.inspector-layout')?.classList.contains('enhanced'));
    const preserved=()=>{const params=new URL(view.url()).searchParams;return params.get('inspect')===`${kind}:${id}`&&params.get(`rel.${name}`)==='2'&&params.get('rel.relatedHandoffs')==='2';};
    await view.locator('.list-pager .page-links').getByRole('link',{name:'Next',exact:true}).click();await view.waitForURL(url=>url.searchParams.get('page')==='2');check(`${route} JS=${javaScriptEnabled}: list page keeps relation vector`,preserved());
    if(javaScriptEnabled)await view.getByRole('button',{name:/^Sort by ID/}).click();else await view.locator('thead th[data-column-key=id] a').click();
    await view.waitForURL(url=>url.searchParams.has('sort'));check(`${route} JS=${javaScriptEnabled}: sort keeps relation vector`,preserved());
    await view.locator('.list-pager select[name=pageSize]').selectOption('200');await view.locator('.list-pager form').getByRole('button',{name:'Apply',exact:true}).click();await view.waitForURL(url=>url.searchParams.get('pageSize')==='200');check(`${route} JS=${javaScriptEnabled}: page-size form keeps relation vector`,preserved());
    if(javaScriptEnabled&&route==='tasks'){await view.getByRole('link',{name:'Board',exact:true}).click();await view.waitForFunction(()=>new URL(location.href).searchParams.get('view')==='board');check('Task Board tab retains relation vector',preserved());await view.getByRole('link',{name:'Table',exact:true}).click();await view.getByLabel('View preset').selectOption('all');await view.waitForFunction(()=>new URL(location.href).searchParams.get('scope')==='all');check('Task preset retains relation vector',preserved());}
    if(route==='specs'){await view.getByRole('link',{name:'Simple table',exact:true}).click();await view.waitForURL(url=>url.searchParams.get('simple')==='1');check(`Spec simple tab JS=${javaScriptEnabled} retains relation vector`,preserved());}
   }finally{await context.close();}
  }
 }
 return {phase,checks,pass:true};
 }catch(error){return {phase,checks,pass:false,error:String(error)};}
}
