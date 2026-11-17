// Focused regressions for F126-1 and F126-2. All changed catalog data is intercepted.
export async function verifyFilterReviewFixes(page,{baseURL='http://127.0.0.1:5184'}={}){
  const checks=[];
  const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw new Error(`${name}: ${JSON.stringify(detail)}`);};
  const optionBox=()=>page.locator('.filters-shell details').nth(0);
  const input=()=>page.locator('input[type="search"][name="option_q"]');
  const open=async index=>{const box=page.locator('.filters-shell details').nth(index);if(!await box.evaluate(el=>el.open))await box.locator('summary').click();return box;};
  const choose=async(name,value,index)=>{const box=await open(index);await box.locator('label').filter({has:page.locator(`input[name="${name}"][value="${value}"]`)}).click();};
  const form=()=>page.evaluate(()=>{const data=new FormData(document.getElementById('workspace-filters'));return {status:data.getAll('status'),window:data.getAll('window').filter(Boolean),spec:data.getAll('spec'),q:data.get('q')};});
  const load=async(path='/specs')=>{await page.goto(baseURL+path);await page.getByRole('button',{name:'Refresh workspace',exact:true}).waitFor();return await page.evaluate(async()=>await(await fetch('/workspace-data?route=specs')).json());};
  const refresh=()=>page.getByRole('button',{name:'Refresh workspace',exact:true}).click();
  const seedTitle=(seed,title,removed)=>{
    const fresh=structuredClone(seed);fresh.revision=title;fresh.data.result.revision=title;fresh.data.filters.options.revision=title;
    const option=fresh.data.filters.options.options[0];option.title=title;
    const row=fresh.data.result.rows.find(row=>row.id===option.id);if(row)row.title=title;
    if(removed){fresh.data.result.rows=fresh.data.result.rows.filter(row=>row.id!==removed);fresh.data.result.totalMatching--;fresh.data.result.totalInScope--;fresh.data.filters.options.totalMatching--;fresh.data.filters.options.options=fresh.data.filters.options.options.filter(option=>option.id!==removed);}
    return fresh;
  };
  const dirty=async specId=>{
    await choose('status','active',2);await choose('window','7d',1);await choose('spec',specId,0);
    await page.locator('input[name="q"][form="workspace-filters"]').fill('UNAPPLIED MAIN');await open(0);await input().fill('UNSENT CATALOG TEXT');
  };
  const clearState=async()=>{await page.waitForFunction(()=>{const f=new FormData(document.getElementById('workspace-filters'));return !f.getAll('status').length&&!f.getAll('spec').length&&!f.getAll('window').some(Boolean)&&!f.get('q')&&document.querySelector('input[name="option_q"]')?.value==='';});};
  await page.unroute('**/workspace-data*');await page.unroute('**/workspace-options*');
  await page.setViewportSize({width:1440,height:900});

  // Matching seed query: accept new title/count while preserving every unsaved field.
  let seed=await load();const selectedId=seed.data.filters.options.options[1].id;
  await dirty(selectedId);let optionRequests=0;
  await page.route('**/workspace-options*',route=>{optionRequests++;return route.abort('failed');});
  const fresh=seedTitle(seed,'ASTRA_REFRESH_ACCEPTED',seed.data.result.rows.at(-1).id);
  await page.route('**/workspace-data*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fresh)}));
  await refresh();await page.getByRole('heading',{name:'ASTRA_REFRESH_ACCEPTED',exact:true}).waitFor();await open(0);
  check('F126-1 matching query accepts fresh option title',await optionBox().locator('.option-list label').first().innerText().then(text=>text.includes('ASTRA_REFRESH_ACCEPTED')));
  check('F126-1 matching query accepts fresh option total',await optionBox().locator('.option-pager').innerText().then(text=>text.includes(`${fresh.data.filters.options.totalMatching} specs`)));
  check('F126-1 refresh preserves unsent option-search text',await input().inputValue()==='UNSENT CATALOG TEXT');
  check('F126-1 unsent text is never requested',optionRequests===0,optionRequests);
  check('F126-1 refresh preserves status/window/spec/main-search drafts',JSON.stringify(await form())===JSON.stringify({status:['active'],window:['7d'],spec:[selectedId],q:'UNAPPLIED MAIN'}),await form());
  await page.unroute('**/workspace-data*');await page.unroute('**/workspace-options*');

  // A local submitted query/page differs from seed; refresh that sent query, not typed text.
  seed=await load();await open(0);await input().fill('SPEC-');
  const searched=page.waitForResponse(response=>response.url().includes('/workspace-options?')&&new URL(response.url()).searchParams.get('q')==='SPEC-'&&new URL(response.url()).searchParams.get('page')==='1');
  await page.getByRole('button',{name:'Search',exact:true}).click();await searched;
  await page.waitForFunction(()=>document.querySelector('.option-search button')?.getAttribute('aria-busy')==='false');
  await optionBox().locator('.option-pager').getByRole('link',{name:'Next',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.option-pager')?.textContent.includes('2 /'));
  const oldLocal=await page.evaluate(async()=>await(await fetch('/workspace-options?q=SPEC-&page=2')).json());const localId=oldLocal.options[0].id;
  await choose('spec',localId,0);await input().fill('NEVER SENT');
  const newLocal=structuredClone(oldLocal);newLocal.revision='local-current';newLocal.options[0].title='SENT_QUERY_REFRESH_ACCEPTED';const removed=newLocal.options.pop().id;newLocal.totalMatching--;newLocal.selected=[newLocal.options[0]];
  const requests=[];await page.route('**/workspace-options*',route=>{requests.push(new URL(route.request().url()).searchParams.toString());return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(newLocal)});});
  const localSeed=seedTitle(seed,'LOCAL_SEED_REFRESH',removed);await page.route('**/workspace-data*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(localSeed)}));
  await refresh();await page.getByRole('heading',{name:'LOCAL_SEED_REFRESH',exact:true}).waitFor();await open(0);await page.getByText('SENT_QUERY_REFRESH_ACCEPTED',{exact:true}).waitFor();
  check('F126-1 refetches last submitted query and page',requests.length===1&&new URLSearchParams(requests[0]).get('q')==='SPEC-'&&new URLSearchParams(requests[0]).get('page')==='2',requests);
  check('F126-1 local-query refresh preserves unsent text and selection',await input().inputValue()==='NEVER SENT'&&JSON.stringify((await form()).spec)===JSON.stringify([localId]));
  check('F126-1 local query receives current total and title',await optionBox().locator('.option-pager').innerText().then(text=>text.includes(`${newLocal.totalMatching} specs`)));
  await page.unroute('**/workspace-data*');await page.unroute('**/workspace-options*');

  // Old response is deliberately held across a new accepted seed/refetch generation.
  seed=await load();await choose('spec',selectedId,0);const local=await page.evaluate(async()=>await(await fetch('/workspace-options?q=SPEC-057')).json());
  let releaseOld,markStarted;const oldGate=new Promise(resolve=>releaseOld=resolve);const started=new Promise(resolve=>markStarted=resolve);let count=0;
  const current=structuredClone(local);current.revision='new-query-generation';current.options[0].title='NEW_AFTER_REFRESH';
  await page.route('**/workspace-options*',async route=>{if(++count===1){markStarted();await oldGate;try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(local)});}catch{}}else await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(current)});});
  await input().fill('SPEC-057');await page.getByRole('button',{name:'Search',exact:true}).click();await started;await input().fill('NOT SUBMITTED');
  const pendingSeed=seedTitle(seed,'PENDING_SEED_REFRESH');await page.route('**/workspace-data*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(pendingSeed)}));
  await refresh();await page.getByRole('heading',{name:'PENDING_SEED_REFRESH',exact:true}).waitFor();await open(0);await page.getByText('NEW_AFTER_REFRESH',{exact:true}).waitFor();releaseOld();await page.waitForTimeout(30);
  check('F126-1 old response after refresh cannot replace current options',count===2&&await page.getByText('NEW_AFTER_REFRESH',{exact:true}).count()===1,count);
  check('F126-1 refetch generation retains pending selection and typed text',await input().inputValue()==='NOT SUBMITTED'&&JSON.stringify((await form()).spec)===JSON.stringify([selectedId])&&await page.locator('.option-error').count()===0);
  await page.unroute('**/workspace-data*');await page.unroute('**/workspace-options*');

  // Clear to another URL resets applied-empty facets that have local drafts.
  seed=await load('/specs?page=2&pageSize=50');await dirty(selectedId);const oldURL=page.url();
  const clearURL=new URL(await page.getByRole('link',{name:'Clear filters',exact:true}).getAttribute('href'),baseURL).href;
  await page.getByRole('link',{name:'Clear filters',exact:true}).click();await page.waitForURL(clearURL);await clearState();
  check('F126-2 Clear after URL change resets all drafts',page.url()!==oldURL,await form());

  // Clear to exactly the same URL must advance reset epoch and cancel the old request.
  const canonical=new URL(await page.getByRole('link',{name:'Clear filters',exact:true}).getAttribute('href'),baseURL).href;await page.goto(canonical);await page.getByRole('button',{name:'Refresh workspace',exact:true}).waitFor();await dirty(selectedId);
  let releaseReset,markResetStarted;const resetGate=new Promise(resolve=>releaseReset=resolve);const resetStarted=new Promise(resolve=>markResetStarted=resolve);
  await page.route('**/workspace-options*',async route=>{markResetStarted();await resetGate;try{await route.fulfill({status:503,contentType:'application/json',body:'{"error":"old failed search"}'});}catch{}});
  await input().fill('SPEC-057');await page.getByRole('button',{name:'Search',exact:true}).click();await resetStarted;await input().fill('UNSENT AFTER REQUEST');
  let fullNavigations=0;const onNavigation=frame=>{if(frame===page.mainFrame())fullNavigations++;};page.on('framenavigated',onNavigation);
  await page.getByRole('link',{name:'Clear filters',exact:true}).click();await clearState();releaseReset();await page.waitForTimeout(30);page.off('framenavigated',onNavigation);
  check('F126-2 native same-URL Clear resets all drafts',page.url()===canonical,{url:page.url(),canonical,fullNavigations,form:await form()});
  check('F126-2 old option error after Clear cannot restore stale state',await page.locator('.option-error').count()===0&&await input().inputValue()===''&&(await form()).spec.length===0);
  await page.unroute('**/workspace-options*');

  // Isolate the explicit Clear handler: suppress default navigation once, not the component handler.
  await page.getByRole('button',{name:'Refresh workspace',exact:true}).waitFor();await dirty(selectedId);
  let releaseHandler,markHandlerStarted;const handlerGate=new Promise(resolve=>releaseHandler=resolve),handlerStarted=new Promise(resolve=>markHandlerStarted=resolve);
  await page.route('**/workspace-options*',async route=>{markHandlerStarted();await handlerGate;try{await route.fulfill({status:503,contentType:'application/json',body:'{"error":"old handler request"}'});}catch{}});
  await input().fill('SPEC-057');await page.getByRole('button',{name:'Search',exact:true}).click();await handlerStarted;await input().fill('UNSENT HANDLER DRAFT');
  const clear=page.getByRole('link',{name:'Clear filters',exact:true});await clear.evaluate(el=>el.addEventListener('click',event=>event.preventDefault(),{once:true}));
  let handlerNavigations=0;const handlerNav=frame=>{if(frame===page.mainFrame())handlerNavigations++;};page.on('framenavigated',handlerNav);
  await clear.click();await clearState();releaseHandler();await page.waitForTimeout(30);page.off('framenavigated',handlerNav);
  check('F126-2 isolated same-URL Clear handler resets drafts without relying on navigation',page.url()===canonical&&handlerNavigations===0,{handlerNavigations,form:await form(),defaultNavigationPreventedOnce:true});
  check('F126-2 old request after isolated Clear cannot restore error or options',await page.locator('.option-error').count()===0&&await input().inputValue()===''&&(await form()).status.length===0&&(await form()).spec.length===0);
  await page.unroute('**/workspace-options*');

  const noJS=await page.context().browser().newContext({javaScriptEnabled:false});const native=await noJS.newPage();
  try{await native.goto(baseURL+'/specs?status=active&window=7d');await native.getByRole('link',{name:'Clear filters',exact:true}).click();await native.waitForLoadState('domcontentloaded');const state=await native.evaluate(()=>{const f=new FormData(document.getElementById('workspace-filters'));return {status:f.getAll('status'),window:f.getAll('window').filter(Boolean),spec:f.getAll('spec'),q:f.get('q')};});check('F126-2 native no-JS GET Clear remains functional',!state.status.length&&!state.window.length&&!state.spec.length&&!state.q,state);}finally{await noJS.close();}
  return {capturedAt:new Date().toISOString(),scope:'Focused integration regressions only; controlled envelopes/options, no project-memory writes. Same-URL handler isolation suppresses default navigation once and is not a native-flow no-navigation guarantee.',checks};
}
