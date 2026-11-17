// Composed Timeline/question consumers. Canonical POSTs only target the disposable fixture.
export async function verifyTimelineEditor(page,{baseURL='http://127.0.0.1:5312',phase='save-history',evidenceDir}={}){
 const report={phase,capturedAt:new Date().toISOString(),checks:[]};const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name);};
 const context=await page.context().browser().newContext({viewport:{width:1440,height:900}}),p=await context.newPage(),requests=[];p.setDefaultTimeout(10000);p.setDefaultNavigationTimeout(20000);let releaseSave;
 p.on('request',r=>{if(new URL(r.url()).origin===baseURL)requests.push({method:r.method(),url:r.url()});});
 const field=()=>p.locator('[data-question-editor] .question-form textarea').first(),dialog=()=>p.locator('[data-question-confirm][open]');
 const close=async()=>{await p.getByRole('button',{name:'Close inspector',exact:true}).click();await p.waitForFunction(()=>!new URL(location.href).searchParams.has('inspect'));};
 try{
  if(phase==='save-history'){
   report.step='initial';await p.goto(baseURL+'/timeline?timeline_mode=all&selected_task=TASK-00001&inspect=spec:SPEC-00001&section=questions&rel.linkedTasks=2');await p.waitForSelector('.timeline-body.virtual');await field().waitFor();
   const before=await p.locator('[data-question-editor] .question-form textarea').count();check('Direct SSR Timeline provides real questions/revision without duplicate initial detail fetch',before===2&&/^[a-f0-9]{64}$/.test(await p.locator('.question-form input[name=specRevision]').inputValue())&&requests.filter(r=>r.url.includes('/workspace-detail?')).length===0);
   report.step='trace';await field().fill('Timeline durable answer.');await field().evaluate(n=>{window.__timelineInput=n;window.__timelineOwner=n.closest('[data-question-editor]');});
   const trace=p.locator('.timeline-grid .bar-hit').nth(1),expected=new URL(await trace.getAttribute('href'),baseURL).searchParams.get('selected_task');await trace.click();await p.waitForFunction(id=>new URL(location.href).searchParams.get('selected_task')===id,expected);
   check('Trace navigation keeps Spec identity, rel page and exact dirty editor DOM',new URL(p.url()).searchParams.get('inspect')==='spec:SPEC-00001'&&new URL(p.url()).searchParams.get('rel.linkedTasks')==='2'&&await p.evaluate(()=>window.__timelineInput===document.querySelector('[data-question-editor] textarea')&&window.__timelineInput.value==='Timeline durable answer.'&&window.__timelineOwner.isConnected)&&await dialog().count()===0);
   await p.locator('.timeline-grid .task-id').first().click();await dialog().waitFor();await p.getByRole('button',{name:'Keep editing',exact:true}).click();
   check('Task activation Keep editing retains Spec draft and selected trace',new URL(p.url()).searchParams.get('inspect')==='spec:SPEC-00001'&&new URL(p.url()).searchParams.get('selected_task')===expected&&await field().inputValue()==='Timeline durable answer.');
   report.step='save';let release,started;const gate=new Promise(resolve=>{release=resolve;releaseSave=resolve;}),seen=new Promise(resolve=>started=resolve);let posts=0;
   await p.route(/\/specs\/SPEC-00001\?\/answerOpenQuestions$/,async route=>{if(route.request().method()!=='POST')return route.continue();posts++;started();await gate;return route.continue();});
   await p.locator('.timeline-grid .task-id').first().click();await dialog().waitFor();await p.getByRole('button',{name:'Save and continue',exact:true}).click();await Promise.race([seen,new Promise((_,reject)=>setTimeout(()=>reject(Error('Expected canonical POST was not observed within5s')),5000))]);
   check('In-flight canonical save disables duplicate leave actions without unmounting editor',await p.getByRole('button',{name:'Save and continue',exact:true}).isDisabled()&&await p.getByRole('button',{name:'Discard and continue',exact:true}).isDisabled()&&await p.evaluate(()=>window.__timelineOwner.isConnected));
   release();await p.waitForFunction(()=>new URL(location.href).searchParams.get('inspect')?.startsWith('task:'));await p.waitForSelector('.inspector-reader .detail-shell');await p.unroute(/\/specs\/SPEC-00001\?\/answerOpenQuestions$/);
   check('One confirmed canonical POST resumes task while keeping trace and clearing prior rel vector',posts===1&&new URL(p.url()).searchParams.get('selected_task')===expected&&!new URL(p.url()).searchParams.has('rel.linkedTasks'));
   await close();await p.locator('[data-group-id="SPEC-00001"] a').click();await p.waitForSelector('[data-question-editor]');await p.locator('.section-links').getByRole('link',{name:'Questions',exact:true}).click();await field().waitFor();
   check('Same-document reopening observes saved decision and only the remaining question',await p.locator('[data-question-editor] .question-form textarea').count()===before-1&&(await p.locator('.inspector-reader').innerText()).includes('Timeline durable answer.'));
   report.step='history';await field().fill('History-only unsaved draft.');await p.evaluate(()=>history.back());await dialog().waitFor();await p.getByRole('button',{name:'Keep editing',exact:true}).click();
   check('Real shallow Back Keep editing restores current Timeline URL and exact draft',new URL(p.url()).searchParams.get('inspect')==='spec:SPEC-00001'&&await field().inputValue()==='History-only unsaved draft.');
   await p.evaluate(()=>history.back());await dialog().waitFor();await p.getByRole('button',{name:'Discard and continue',exact:true}).click();await p.waitForFunction(()=>!new URL(location.href).searchParams.has('inspect'));
   check('Back Discard returns to recorded Timeline entry and group opener',await p.evaluate(()=>document.activeElement?.getAttribute('href')==='/specs/SPEC-00001')&&new URL(p.url()).searchParams.get('selected_task')===expected);
   await p.evaluate(()=>history.forward());await p.waitForFunction(()=>new URL(location.href).searchParams.get('inspect')==='spec:SPEC-00001');await field().waitFor();
   check('Forward reopens saved current spec without resurrecting the discarded draft',await field().inputValue()==='');
  }
  if(evidenceDir)await p.screenshot({path:`${evidenceDir}/task130-editor-${phase}.png`});
 }catch(error){report.error=error instanceof Error?error.stack:String(error);report.state=await p.evaluate(()=>({url:location.href,dialogs:[...document.querySelectorAll('[data-question-confirm][open]')].map(n=>n.textContent),alerts:[...document.querySelectorAll('[role=alert]')].map(n=>n.textContent),fields:[...document.querySelectorAll('[data-question-editor] textarea')].map(n=>({value:n.value,disabled:n.disabled})),submit:[...document.querySelectorAll('.question-form button[type=submit]')].map(n=>({text:n.textContent,disabled:n.disabled})),review:[...document.querySelectorAll('[aria-label=\"Current version review\"]')].map(n=>n.textContent)})).catch(e=>String(e));}
 finally{releaseSave?.();report.requests=requests;await context.close();}return report;
}

export async function timelineRefreshStep(page,{step,baseURL='http://127.0.0.1:5312'}={}){
 const report={step,checks:[]},check=(name,pass)=>{report.checks.push({name,pass:!!pass});if(!pass)throw Error(name);};page.setDefaultTimeout(10000);
 try{
  if(step==='prepare'){
   await page.goto(baseURL+'/timeline?timeline_mode=all&selected_task=TASK-00001&inspect=spec:SPEC-00001&section=questions&rel.linkedTasks=2');await page.waitForSelector('.timeline-body.virtual');const field=page.locator('[data-question-editor] .question-form textarea').first();await field.fill('Draft retained during Timeline refresh.');await field.evaluate(n=>{window.__refreshInput=n;window.__refreshRevision=document.querySelector('.question-form input[name=specRevision]').value;});
   check('Dirty Timeline question owner ready for external task metadata change',await field.inputValue()==='Draft retained during Timeline refresh.');
  }else{
   await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();
   if(step==='missing')await page.getByText('Trace unavailable in current results',{exact:false}).waitFor();
   else await page.waitForFunction(()=>!document.querySelector('.placement-warning')?.textContent.includes('Trace unavailable'));
   await page.waitForFunction(()=>document.querySelector('.inspector-reader')?.getAttribute('aria-busy')==='false');
   check(step==='missing'?'Refresh announces missing trace without erasing its URL intent':'Same URL intent restores trace when source reappears',new URL(page.url()).searchParams.get('selected_task')==='TASK-00001'&&new URL(page.url()).searchParams.get('inspect')==='spec:SPEC-00001'&&new URL(page.url()).searchParams.get('rel.linkedTasks')==='2'&&(step==='missing'||await page.locator('.trace-summary').count()===1));
   check('Refresh preserves exact dirty input node, spec base token and neutral conflict state',await page.evaluate(()=>document.querySelector('[data-question-editor] textarea')===window.__refreshInput&&window.__refreshInput.value==='Draft retained during Timeline refresh.'&&document.querySelector('.question-form input[name=specRevision]').value===window.__refreshRevision)&&await page.locator('[aria-label="Current version review"]').count()===0&&await page.locator('[data-question-confirm][open]').count()===0);
   if(step==='restored'){await page.getByRole('button',{name:'Close inspector',exact:true}).click();await page.locator('[data-question-confirm][open]').waitFor();await page.getByRole('button',{name:'Discard and continue',exact:true}).click();await page.waitForFunction(()=>!new URL(location.href).searchParams.has('inspect'));check('Controlled metadata refresh never bypasses the dirty leave guard',await page.locator('[data-question-editor]').count()===0);}
  }
 }catch(error){report.error=error instanceof Error?error.stack:String(error);}return report;
}
