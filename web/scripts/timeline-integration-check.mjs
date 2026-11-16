// Final consumer regressions; only disposable integration fixtures are used.
export async function verifyTimelineIntegration(page,{baseURL='http://127.0.0.1:5312',evidenceDir,onlyMissing=false,modal=false}={}){
 const report={phase:'group-focus',capturedAt:new Date().toISOString(),checks:[]};const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name);};
 const context=await page.context().browser().newContext({viewport:{width:1440,height:900}}),p=await context.newPage();
 const close=async()=>{await p.getByRole('button',{name:'Close inspector',exact:true}).click();await p.waitForFunction(()=>!new URL(location.href).searchParams.has('inspect'));};
 const first=()=>p.locator('[data-group-id="SPEC-00001"] a');
 try{
  await p.goto(baseURL+'/timeline?timeline_mode=all&selected_task=TASK-00001');await p.waitForSelector('.timeline-body.virtual');
  if(!onlyMissing){
  await first().focus();await first().evaluate(node=>window.__groupOpener=node);await first().click();await p.waitForSelector('.inspector-reader .detail-shell');await close();
  check('Connected group opener restores its exact canonical anchor and trace',await p.evaluate(()=>document.activeElement===window.__groupOpener&&window.__groupOpener.isConnected&&new URL(location.href).searchParams.get('selected_task')==='TASK-00001'));
  await first().click();await p.waitForSelector('.inspector-reader .detail-shell');await p.locator('.timeline-grid').evaluate(node=>node.scrollTop=30000);await p.waitForFunction(()=>!document.querySelector('[data-group-id="SPEC-00001"]'));await close();
  check('Virtualized group opener materializes and focuses its own header',await p.evaluate(()=>document.activeElement?.getAttribute('href')==='/specs/SPEC-00001'&&document.activeElement.closest('[data-group-id]')?.dataset.groupId==='SPEC-00001'));
  await p.locator('[data-group-toggle="SPEC-00001"]').click();await first().click();await p.waitForSelector('.inspector-reader .detail-shell');await close();
  check('Collapsed group remains collapsed and restores its anchor',await p.locator('[data-group-toggle="SPEC-00001"]').getAttribute('aria-expanded')==='false'&&await p.evaluate(()=>document.activeElement?.getAttribute('href')==='/specs/SPEC-00001'));
  await p.locator('[data-group-toggle="SPEC-00001"]').click();
  }
  await p.evaluate(async()=>{const data=await(await fetch('/workspace-data?route=timeline&timeline_mode=all')).json();let top=0;for(const g of data.data.timeline.groups){if(g.specId==='SPEC-00008')break;top+=40+g.rows.length*32;}document.querySelector('.timeline-grid').scrollTop=top;});await p.locator('[data-group-id="SPEC-00008"] a').waitFor();await p.locator('[data-group-id="SPEC-00008"] a').click();await p.waitForSelector('.inspector-reader .detail-shell');
  await p.locator('.timeline-toolbar summary').filter({hasText:/^Filters/}).click();await p.locator('.filters-shell .dropdown-shell > summary').first().click();await p.locator('.filters-shell label').filter({has:p.locator('input[name=spec][value="SPEC-00001"]')}).click();await p.getByRole('button',{name:'Apply filters',exact:true}).click();await p.waitForURL(url=>url.searchParams.getAll('spec').includes('SPEC-00001'));await p.waitForSelector('.timeline-body:not(.virtual)');if(modal){await p.setViewportSize({width:390,height:844});await p.locator('.inspector-host.fullscreen').waitFor();report.modalStatusBefore=await p.locator('[data-inspector-announcement]').evaluate(n=>({blocked:!!n.closest('[inert]')}));await p.locator('[data-inspector-announcement]').evaluate(n=>{window.__announcementPublications=[];new MutationObserver(()=>{if(n.textContent.trim())window.__announcementPublications.push({text:n.textContent,blocked:!!n.closest('[hidden],[aria-hidden=\"true\"],[inert]')});}).observe(n,{subtree:true,childList:true,characterData:true});});}await close();
  await p.waitForTimeout(100);report.lastState=await p.evaluate(()=>({active:document.activeElement?.outerHTML,status:[...document.querySelectorAll('[role=status]')].map(n=>({text:n.textContent,blocked:!!n.closest('[hidden],[aria-hidden=\"true\"],[inert]')})),URL:location.href}));
  check('Filtered-out group focuses first available task with a truthful announcement',await p.evaluate(()=>document.activeElement?.classList.contains('task-id'))&&await p.locator('[data-inspector-announcement]').filter({hasText:'The inspected group is no longer visible. Focus moved to the first available timeline task.'}).count()===1);
  check('Announcement status is unique, connected and accessible after close',await p.locator('[data-inspector-announcement]').count()===1&&await p.locator('[data-inspector-announcement]').evaluate(n=>n.isConnected&&!n.closest('[hidden],[aria-hidden=\"true\"],[inert]')&&n.getAttribute('role')==='status'&&n.getAttribute('aria-atomic')==='true'));
  if(modal){report.modalPublications=await p.evaluate(()=>window.__announcementPublications);check('Modal inert cleanup precedes the observed fallback publication',report.modalStatusBefore.blocked&&report.modalPublications.length>0&&report.modalPublications.every(x=>!x.blocked));}
  if(evidenceDir)await p.screenshot({path:`${evidenceDir}/task130-group-focus.png`});
 }catch(error){report.error=error instanceof Error?error.stack:String(error);}
 finally{await context.close();}return report;
}
