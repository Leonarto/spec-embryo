// Focused P2 route/transport checks. A Playwright page is supplied by the runner.
export async function verifyWorkspaceRefresh(page,{baseURL='http://127.0.0.1:5184',evidenceDir}={}){
  const report={capturedAt:new Date().toISOString(),browser:page.context().browser().version(),checks:[]};
  const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});if(!pass)throw new Error(`${name}: ${JSON.stringify(detail)}`);};
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  await page.setViewportSize({width:1440,height:900});
  for(const route of ['overview','tasks','specs','timeline']){
    const path=route==='overview'?'/':`/${route}`;await page.goto(baseURL+path);await page.getByRole('button',{name:'Refresh workspace',exact:true}).waitFor();
    const initial=await page.evaluate(async route=>{const r=await fetch(`/workspace-data?route=${route}`);return {status:r.status,cache:r.headers.get('cache-control'),data:await r.json()};},route);
    check(`${route}: controlled endpoint contract`,initial.status===200&&initial.cache==='no-store'&&initial.data.route===route);
    await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.getByRole('status').filter({hasText:'Actualizado'}).waitFor();
    check(`${route}: refresh success without error`,await page.getByRole('alert').count()===0);
    if(route==='tasks'||route==='specs')check(`${route}: DOM bounded by page`,await page.locator('[data-entity-id]').count()<=200);
  }
  const tasksURL=baseURL+'/tasks?pageSize=100';
  await page.goto(tasksURL);await page.getByRole('button',{name:'Refresh workspace',exact:true}).waitFor();
  const baseline=await page.evaluate(async()=>await(await fetch('/workspace-data?route=tasks&pageSize=100')).json());
  const replacement=title=>{const next=structuredClone(baseline);next.revision=title;next.data.result.rows[0].title=title;next.shell.git.dirty=!baseline.shell.git.dirty;return next;};
  let dataRequests=0,fullNavigations=0;
  const navigation=frame=>{if(frame===page.mainFrame())fullNavigations++;};page.on('framenavigated',navigation);
  const blockedData=route=>{dataRequests++;return route.abort('failed');};await page.route('**/__data.json*',blockedData);
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/workspace-data*',async route=>{await gate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(replacement('P2 observed update'))});});
  await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('button[aria-label="Refresh workspace"]')?.getAttribute('aria-busy')==='true');
  check('Refresh control remains focusable while busy',await page.getByRole('button',{name:'Refresh workspace',exact:true}).isEnabled());
  const focused=page.locator(`[data-entity-id="${baseline.data.result.rows[0].id}"] a`).first();await focused.focus();
  await page.locator('.view-frame').evaluate(el=>el.scrollTop=Math.min(200,el.scrollHeight-el.clientHeight));
  const before=await page.evaluate(()=>({scroll:document.querySelector('.view-frame').scrollTop,focus:document.activeElement?.textContent,url:location.href}));
  release();await page.getByRole('heading',{name:'P2 observed update',exact:true}).waitFor();
  const success=await page.evaluate(()=>({scroll:document.querySelector('.view-frame').scrollTop,focus:document.activeElement?.textContent,url:location.href}));
  check('Success preserves focused entity, scroll and URL',JSON.stringify(before)===JSON.stringify(success),{before,success});
  check('Success commits shell with the accepted data',await page.locator('.git-status').innerText()===(baseline.shell.git.dirty?'✓ Clean':'● Local changes'));
  await page.unroute('**/workspace-data*');
  for(const failure of ['abort','http','json','identity']){
    const handler=route=>failure==='abort'?route.abort('failed'):route.fulfill({status:failure==='http'?503:200,contentType:'application/json',body:failure==='json'?'{bad':failure==='identity'?JSON.stringify({...replacement('wrong'),requestKey:'wrong-route-query'}):JSON.stringify({error:'unavailable'})});
    await page.route('**/workspace-data*',handler);
    await page.getByRole('button',{name:'Refresh workspace',exact:true}).focus();
    const old=await page.evaluate(()=>({html:document.querySelector('.board').innerHTML,scroll:document.querySelector('.view-frame').scrollTop,url:location.href,focus:document.activeElement?.getAttribute('aria-label')}));
    await page.keyboard.press('Enter');await page.getByRole('alert').filter({hasText:'Datos anteriores'}).waitFor();
    const after=await page.evaluate(()=>({html:document.querySelector('.board').innerHTML,scroll:document.querySelector('.view-frame').scrollTop,url:location.href,focus:document.activeElement?.getAttribute('aria-label')}));
    check(`${failure}: exact data, focus, scroll and URL survive`,JSON.stringify(old)===JSON.stringify(after));
    check(`${failure}: pending exits`,await page.getByRole('button',{name:'Refresh workspace',exact:true}).getAttribute('aria-busy')==='false');
    if(evidenceDir&&failure==='abort')await page.screenshot({path:`${evidenceDir}/p2-refresh-network-error.png`});
    await page.unroute('**/workspace-data*',handler);
    await page.route('**/workspace-data*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(replacement('P2 observed update'))}));
    await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByRole('status').filter({hasText:'Actualizado'}).waitFor();
    check(`${failure}: Retry recovers`,await page.getByRole('alert').count()===0);await page.unroute('**/workspace-data*');
  }
  check('Controlled refresh never requests SvelteKit navigation data',dataRequests===0,dataRequests);
  check('Controlled refresh never navigates the document',fullNavigations===0,fullNavigations);
  await page.unroute('**/__data.json*',blockedData);page.off('framenavigated',navigation);

  // Two manual requests: A remains gated while B commits, then A is released late.
  let releaseA;const aGate=new Promise(resolve=>releaseA=resolve);let requests=0;
  await page.route('**/workspace-data*',async route=>{requests++;if(requests===1){await aGate;try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(replacement('late A'))});}catch{}}else await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(replacement('new B'))});});
  await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.waitForFunction(()=>document.querySelector('button[aria-label="Refresh workspace"]')?.getAttribute('aria-busy')==='true');
  await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.getByRole('heading',{name:'new B',exact:true}).waitFor();releaseA();await pause(30);
  check('Late A cannot replace newer B',await page.getByRole('heading',{name:'new B',exact:true}).count()===1);await page.unroute('**/workspace-data*');

  let focusCalls=0;await page.route('**/workspace-data*',route=>{focusCalls++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(replacement('focus result'))});});
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await pause(200);check('Focus within five seconds does not refetch',focusCalls===0,focusCalls);
  await pause(5100);await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('focus'));});await page.getByRole('heading',{name:'focus result',exact:true}).waitFor();
  check('Debounced focus refresh runs once after five seconds',focusCalls===1,focusCalls);await page.unroute('**/workspace-data*');

  let releaseTimeout;const timeoutGate=new Promise(resolve=>releaseTimeout=resolve);
  await page.route('**/workspace-data*',async route=>{await timeoutGate;try{await route.abort('failed');}catch{}});await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'excedió el tiempo'}).waitFor({timeout:17_000});
  check('Real fifteen-second deadline preserves previous content',await page.getByRole('heading',{name:'focus result',exact:true}).count()===1&&await page.getByRole('button',{name:'Refresh workspace',exact:true}).getAttribute('aria-busy')==='false');
  releaseTimeout();await page.unroute('**/workspace-data*');

  // Navigate away and back with the same query while the previous request is delayed.
  let releaseVisit;const visitGate=new Promise(resolve=>releaseVisit=resolve);
  await page.route('**/workspace-data*',async route=>{await visitGate;try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(replacement('stale prior visit'))});}catch{}});
  await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.getByRole('link',{name:'Specs',exact:true}).click();await page.waitForURL('**/specs?**');await page.getByRole('heading',{name:'Specs',exact:true}).waitFor();
  await page.goto(tasksURL);await page.getByRole('button',{name:'Refresh workspace',exact:true}).waitFor();releaseVisit();await pause(30);await page.unroute('**/workspace-data*');
  check('Prior visit cannot commit after navigation back to the same query',await page.getByRole('heading',{name:'stale prior visit',exact:true}).count()===0);
  await page.locator('.task-id').first().click();await page.waitForURL(/\/tasks\/TASK-/);await page.waitForFunction(()=>!document.querySelector('button[aria-label="Refresh workspace"]'));
  check('Detail unregisters refresh',await page.getByRole('button',{name:'Refresh workspace',exact:true}).count()===0);
  await page.goto(baseURL+'/specs/SPEC-057');await page.getByRole('button',{name:'Workspace preferences',exact:true}).waitFor();check('Spec detail has no background refresh surface',await page.getByRole('button',{name:'Refresh workspace',exact:true}).count()===0);

  await page.goto(baseURL+'/tasks?pageSize=50');await page.getByRole('button',{name:'Refresh workspace',exact:true}).waitFor();const ids=await page.locator('[data-entity-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.entityId));
  await page.getByRole('navigation',{name:'List pagination',exact:true}).getByRole('link',{name:'Next',exact:true}).click();await page.waitForURL('**/tasks?**page=2**');
  const nextIds=await page.locator('[data-entity-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.entityId));check('Server paging changes the globally sorted page',nextIds.length===50&&!nextIds.some(id=>ids.includes(id)),{first:ids.length,next:nextIds.length});
  if(evidenceDir)await page.screenshot({path:`${evidenceDir}/p2-tasks-page2.png`});
  return report;
}

export async function verifyOtherRouteFailures(page,{baseURL='http://127.0.0.1:5184',evidenceDir}={}){
  const checks=[];const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw new Error(name);};
  for(const route of ['overview','specs','timeline']){
    await page.goto(baseURL+(route==='overview'?'/':`/${route}`));await page.getByRole('button',{name:'Refresh workspace',exact:true}).waitFor();
    const seed=await page.evaluate(async route=>await(await fetch(`/workspace-data?route=${route}`)).json(),route);
    const old=await page.locator('.view-frame').innerHTML();let navigations=0,dataRequests=0;
    const nav=frame=>{if(frame===page.mainFrame())navigations++;};page.on('framenavigated',nav);
    await page.route('**/__data.json*',route=>{dataRequests++;return route.abort('failed');});
    const bad=structuredClone(seed);if(route==='timeline')bad.data.timeline.selection={};
    await page.route('**/workspace-data*',request=>route==='overview'?request.abort('failed'):request.fulfill({status:200,contentType:'application/json',body:route==='specs'?'{invalid':JSON.stringify(bad)}));
    await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.getByRole('alert').filter({hasText:'Datos anteriores'}).waitFor();
    check(`${route}: exact previous pane remains after failure`,await page.locator('.view-frame').innerHTML()===old);
    check(`${route}: no router request or document navigation`,dataRequests===0&&navigations===0,{dataRequests,navigations});
    await page.unroute('**/workspace-data*');await page.route('**/workspace-data*',request=>request.fulfill({status:200,contentType:'application/json',body:JSON.stringify(seed)}));
    await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByRole('status').filter({hasText:'Actualizado'}).waitFor();
    check(`${route}: Retry recovers valid projection`,await page.getByRole('alert').count()===0);
    await page.unroute('**/workspace-data*');await page.unroute('**/__data.json*');page.off('framenavigated',nav);
    if(evidenceDir)await page.screenshot({path:`${evidenceDir}/p2-${route}-projection.png`});
  }
  return {capturedAt:new Date().toISOString(),checks};
}

export async function verifyWorkspaceNoScript(page,{baseURL='http://127.0.0.1:5188'}={}){
  const checks=[];const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw new Error(`${name}: ${JSON.stringify(detail)}`);};
  const context=await page.context().browser().newContext({javaScriptEnabled:false,viewport:{width:1440,height:900}});const p=await context.newPage();
  try{
    await p.goto(baseURL+'/tasks?pageSize=50');check('No-JS Tasks renders50cards',await p.locator('[data-entity-id]').count()===50);
    check('No-JS shell has no unusable Refresh button',await p.getByRole('button',{name:'Refresh workspace',exact:true}).count()===0);
    const first=await p.locator('[data-entity-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.entityId));
    await p.getByRole('navigation',{name:'List pagination',exact:true}).getByRole('link',{name:'Next',exact:true}).click();await p.waitForURL('**/tasks?**page=2**');
    const second=await p.locator('[data-entity-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.entityId));check('No-JS page links reach disjoint next50',second.length===50&&!second.some(id=>first.includes(id)));
    await p.goto(baseURL+'/specs?spec=SPEC-00001&option_page=2&pageSize=50');
    await p.locator('.filters-shell details').first().locator('summary').click();
    const selected=await p.evaluate(()=>new FormData(document.getElementById('workspace-filters')).getAll('spec'));
    check('Off-page selected spec survives exactly once in GET form',JSON.stringify(selected)===JSON.stringify(['SPEC-00001']),selected);
    const label=p.locator('.option-list label').filter({has:p.locator('input[value="SPEC-00061"]')});await label.click();
    const state=await label.locator('input').isChecked();check('No-JS option checkbox operates',state);
    const visual=await label.locator('.checkbox-mark').evaluate(el=>getComputedStyle(el).color);check('No-JS native checked state has visible mark',visual!=='rgba(0, 0, 0, 0)'&&visual!=='transparent',visual);
    await p.getByRole('button',{name:'Apply filters',exact:true}).click();await p.waitForURL('**/specs?**');
    const applied=new URL(p.url()).searchParams.getAll('spec').sort();check('No-JS Apply preserves previous and new selected specs',JSON.stringify(applied)===JSON.stringify(['SPEC-00001','SPEC-00061']),applied);
    check('No-JS spec filtering happens before page rendering',await p.locator('[data-entity-id]').count()===2);
    await p.locator('.filters-shell details').first().locator('summary').click();await p.getByRole('searchbox',{name:'Find a spec',exact:true}).fill('SPEC-01999');await p.getByRole('button',{name:'Search',exact:true}).click();
    await p.waitForURL('**/specs?**option_q=SPEC-01999**');
    check('No-JS options search can discover later catalog entries',await p.locator('input[type="checkbox"][value="SPEC-01999"]').count()===1);
    check('Option search retains list filters',JSON.stringify(new URL(p.url()).searchParams.getAll('spec').sort())===JSON.stringify(applied));
    const offpage=await p.evaluate(()=>new FormData(document.getElementById('workspace-filters')).getAll('spec').sort());check('Selected values stay unique after option search',JSON.stringify(offpage)===JSON.stringify(applied),offpage);
    await p.locator('[data-entity-id] a.title-link').first().click();await p.waitForURL(/\/specs\/SPEC-/);check('No-JS canonical detail remains reachable',await p.locator('.view-frame').innerText().then(text=>text.includes('SPEC-00001')||text.includes('SPEC-00061')));
    return {capturedAt:new Date().toISOString(),checks};
  }finally{await context.close();}
}

export async function verifyChangingQueryResults(page,{baseURL='http://127.0.0.1:5184',evidenceDir}={}){
  const checks=[];const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw new Error(`${name}: ${JSON.stringify(detail)}`);};
  const wire=async query=>await page.evaluate(async query=>await(await fetch(`/workspace-data?route=tasks&${query}`)).json(),query);
  await page.goto(baseURL+'/tasks?page=2');await page.getByRole('button',{name:'Refresh workspace',exact:true}).waitFor();
  const page2=await wire('page=2'),page1=await wire('page=1');const removed=page2.data.result.rows[0].id;
  const clamped=structuredClone(page1);clamped.requestKey=page2.requestKey;clamped.revision='test-page-clamp';clamped.data.result.requestedPage=2;clamped.data.result.totalMatching=100;clamped.data.result.totalInScope=100;
  let release;const gate=new Promise(resolve=>release=resolve);await page.route('**/workspace-data*',async route=>{await gate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(clamped)});});
  await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.locator(`[data-entity-id="${removed}"] a`).first().focus();release();
  await page.getByText('La página solicitada ya no existe; mostrando página 1.',{exact:true}).waitFor();
  check('Page clamp accepts refreshed data without rewriting URL',new URL(page.url()).searchParams.get('page')==='2'&&await page.locator('[data-entity-id]').count()===100);
  const focused=await page.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.closest('[data-entity-id]')?.getAttribute('data-entity-id')}));
  check('Removed focused entity restores focus to surviving entity',Boolean(focused.id)&&focused.id!==removed,focused);
  check('Removal is announced',await page.locator('[data-workspace-announcement]').innerText().then(text=>text.includes(removed)));
  if(evidenceDir)await page.screenshot({path:`${evidenceDir}/p2-page-clamp.png`});
  await page.unroute('**/workspace-data*');
  const empty=structuredClone(clamped);empty.revision='test-empty-page';empty.data.result.rows=[];empty.data.result.totalMatching=0;empty.data.result.totalInScope=0;
  await page.route('**/workspace-data*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(empty)}));await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-entity-id]').length===0);
  check('Same page intention also accepts an empty result',new URL(page.url()).searchParams.get('page')==='2'&&await page.getByRole('alert').count()===0);
  await page.unroute('**/workspace-data*');
  await page.route('**/workspace-data*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(page2)}));await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-entity-id]').length>0);
  check('A reappearing requested page is accepted with the same URL',new URL(page.url()).searchParams.get('page')==='2'&&await page.getByText('La página solicitada ya no existe; mostrando página 1.',{exact:true}).count()===0);
  await page.unroute('**/workspace-data*');
  for(const intent of ['spec=SPEC-057&spec=SPEC-058','spec=SPEC-057']){
    await page.goto(baseURL+'/tasks?'+intent);await page.getByRole('button',{name:'Refresh workspace',exact:true}).waitFor();const original=await wire(intent);const fallback=await wire(intent.includes('SPEC-058')?'spec=SPEC-058':'');
    fallback.requestKey=original.requestKey;fallback.revision='test-missing-spec';fallback.data.filters.unavailableSpecIds=['SPEC-057'];
    await page.route('**/workspace-data*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fallback)}));await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.locator('.unavailable').waitFor();
    check(`${intent}: missing spec produces visible warning`,await page.locator('.unavailable').innerText().then(text=>text.includes('SPEC-057')&&(intent.includes('SPEC-058')?text.includes('disponibles'):text.includes('sin filtro de spec'))));
    check(`${intent}: refresh preserves requested filters in URL`,page.url().endsWith(intent));await page.unroute('**/workspace-data*');
    await page.route('**/workspace-data*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(original)}));await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.unavailable'));
    check(`${intent}: reappearing spec reapplies without navigation`,page.url().endsWith(intent)&&await page.getByRole('alert').count()===0);await page.unroute('**/workspace-data*');
  }
  return {capturedAt:new Date().toISOString(),scope:'Browser integration with controlled fixture envelopes; no project files mutated.',checks};
}

export async function verifyOptionRequestOwnership(page,{baseURL='http://127.0.0.1:5184'}={}){
  const checks=[];const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw new Error(name);};
  await page.goto(baseURL+'/specs');await page.getByRole('button',{name:'Refresh workspace',exact:true}).waitFor();
  const seed=await page.evaluate(async()=>({a:await(await fetch('/workspace-options?q=SPEC-057')).json(),b:await(await fetch('/workspace-options?q=SPEC-058')).json()}));
  const originalURL=page.url(),originalCards=await page.locator('[data-entity-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.entityId));
  await page.locator('.filters-shell details').first().locator('summary').click();
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/workspace-options*',async route=>{const q=new URL(route.request().url()).searchParams.get('q');if(q==='SPEC-057'){await gate;try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(seed.a)});}catch{}}else await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(seed.b)});});
  const input=page.getByRole('searchbox',{name:'Find a spec',exact:true});await input.fill('SPEC-057');await page.getByRole('button',{name:'Search',exact:true}).click();await input.fill('SPEC-058');await page.getByRole('button',{name:'Search',exact:true}).click();
  const chosen=page.locator('.option-list label').filter({has:page.locator('input[value="SPEC-058"]')});await chosen.waitFor();await chosen.click();release();await page.waitForTimeout(30);
  check('Late option A cannot replace newer B',await page.locator('input[type="checkbox"][value="SPEC-058"]').count()===1&&await page.locator('input[type="checkbox"][value="SPEC-057"]').count()===0);
  const selected=await page.evaluate(()=>new FormData(document.getElementById('workspace-filters')).getAll('spec'));check('Option response does not overwrite current selection',JSON.stringify(selected)===JSON.stringify(['SPEC-058']),selected);
  await page.unroute('**/workspace-options*');await page.route('**/workspace-options*',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"unavailable"}'}));
  await input.fill('SPEC-057');await page.getByRole('button',{name:'Search',exact:true}).click();await page.locator('.option-error').waitFor();check('Option error retains prior options and selection',await chosen.locator('input').isChecked());
  await page.unroute('**/workspace-options*');await page.route('**/workspace-options*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(seed.a)}));await page.locator('.option-error').getByRole('button',{name:'Retry',exact:true}).click();await page.locator('input[type="checkbox"][value="SPEC-057"]').waitFor({state:'attached'});
  const retained=await page.evaluate(()=>new FormData(document.getElementById('workspace-filters')).getAll('spec'));check('Option Retry preserves off-page selected ID exactly once',JSON.stringify(retained)===JSON.stringify(['SPEC-058']),retained);
  check('Options request never changes list URL or data',page.url()===originalURL&&JSON.stringify(await page.locator('[data-entity-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.entityId)))===JSON.stringify(originalCards));
  await page.unroute('**/workspace-options*');return {capturedAt:new Date().toISOString(),checks};
}
