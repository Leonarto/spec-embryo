// Real Kit loader props + action + reader glue. Synthetic question fixture only.
export async function verifyQuestionSeeds(page,{baseURL='http://127.0.0.1:5303',id='SPEC-00010'}={}){
 const checks=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name);};
 let releaseSeed,releaseRead,seedRoute,readRoute,activeSeedMatch,activeReadMatch,requestListener;
 try{
  page.setDefaultTimeout(12000);await page.goto(`${baseURL}/specs/${id}`);await page.locator('.inspector-layout.enhanced').waitFor();
  const fields=()=>page.locator('[data-question-editor] textarea'),oldRevision=await page.locator('[name=specRevision]').inputValue();
  check('Unfenced SSR baseline is editable',await fields().count()===2);
  await fields().nth(1).evaluate(node=>node.dataset.qaQuestion='persistent-owner');
  let captured;const entered=new Promise(resolve=>captured=resolve),held=new Promise(resolve=>releaseSeed=resolve);let oldSeedContainsRevision=false;
  activeSeedMatch=url=>url.pathname.includes(`/specs/${id}/`)&&url.pathname.endsWith('/__data.json');
  seedRoute=async route=>{const response=await route.fetch(),body=await response.text();oldSeedContainsRevision=body.includes(oldRevision);captured();await held;try{await route.fulfill({response,body});}catch{/* An aborted old loader is also ineligible. */}};
  await page.route(activeSeedMatch,seedRoute);
  await page.evaluate(async({id})=>{const url=performance.getEntriesByType('resource').map(x=>x.name).find(x=>x.includes('/runtime/app/navigation.js'));const {goto}=await import(url);window.__questionQANavigation=goto(`/specs/${id}?rel.linkedTasks=2`,{keepFocus:true,noScroll:true});window.__questionQANavigation.catch(()=>{});},{id});
  await Promise.race([entered,new Promise((_,reject)=>setTimeout(()=>reject(Error('Loader capture deadline exceeded')),10000))]);
  check('The pending real loader captured pre-write revision',oldSeedContainsRevision);
  await fields().first().fill(' saved while loader A waits ');await page.getByRole('button',{name:'Save answered questions',exact:true}).click();await page.getByText('1 question resolved',{exact:true}).waitFor();
  check('Confirmed outcome B is visible before releasing loader A',await fields().count()===1&&await fields().first().getAttribute('data-qa-question')==='persistent-owner');
  await page.evaluate(()=>{window.__questionQAStale=false;window.__questionQAObserver=new MutationObserver(()=>{if(document.querySelectorAll('[data-question-editor] textarea').length>1)window.__questionQAStale=true;});window.__questionQAObserver.observe(document.body,{subtree:true,childList:true});});
  releaseSeed();await page.evaluate(()=>window.__questionQANavigation);await page.unroute(activeSeedMatch,seedRoute);activeSeedMatch=undefined;
  await page.waitForTimeout(200);
  check('Late loader A never flashes old questions or resets the owner',!await page.evaluate(()=>window.__questionQAStale)&&await fields().count()===1&&await fields().first().getAttribute('data-qa-question')==='persistent-owner');
  check('Late loader A is not classified as an external version',await page.getByText('This spec changed externally',{exact:true}).count()===0&&await page.getByText('1 question resolved',{exact:true}).count()===1);
  let inspectorReads=0;requestListener=request=>{if(new URL(request.url()).pathname==='/workspace-detail')inspectorReads++;};page.on('request',requestListener);
  await page.evaluate(async({id})=>{const url=performance.getEntriesByType('resource').map(x=>x.name).find(x=>x.includes('/runtime/app/navigation.js'));const {goto}=await import(url);await goto(`/specs?inspect=spec:${id}`,{keepFocus:true,noScroll:true});},{id});
  await page.locator('.inspector-host textarea').first().waitFor();
  check('Canonical→inspector remount rejects even a matching fenced SSR seed',inspectorReads===1&&await page.locator('.inspector-host textarea').count()===1,inspectorReads);page.off('request',requestListener);requestListener=undefined;
  let enteredRead;const readStarted=new Promise(resolve=>enteredRead=resolve),readHeld=new Promise(resolve=>releaseRead=resolve);let currentReads=0;
  activeReadMatch=url=>url.pathname==='/workspace-detail';readRoute=async route=>{currentReads++;const response=await route.fetch();enteredRead();await readHeld;try{await route.fulfill({response});}catch{}};await page.route(activeReadMatch,readRoute);
  await page.locator('.inspector-actions a').filter({hasText:'Open page'}).click();
  await Promise.race([readStarted,new Promise((_,reject)=>setTimeout(()=>reject(Error('Controlled remount read deadline exceeded')),10000))]);
  check('Fenced canonical initial render publishes no prop fallback',await fields().count()===0&&await page.title()==='Loading details');
  releaseRead();await fields().first().waitFor();await page.unroute(activeReadMatch,readRoute);activeReadMatch=undefined;
  check('Only the controlled remount read supplies current questions',currentReads===1&&await fields().count()===1,currentReads);
  let reloadReads=0;requestListener=request=>{if(new URL(request.url()).pathname==='/workspace-detail')reloadReads++;};page.on('request',requestListener);
  await page.reload();await page.locator('.inspector-layout.enhanced').waitFor();await fields().first().waitFor();await page.waitForTimeout(150);
  check('Real new document may adopt fresh SSR without duplicate fetch',reloadReads===0&&await fields().count()===1,reloadReads);
  return {phase:'real-loader-seed-race-and-remount',pass:true,checks};
 }catch(error){return {phase:'real-loader-seed-race',pass:false,checks,error:String(error),url:page.url()};}
 finally{releaseSeed?.();releaseRead?.();if(activeSeedMatch)await page.unroute(activeSeedMatch,seedRoute);if(activeReadMatch)await page.unroute(activeReadMatch,readRoute);if(requestListener)page.off('request',requestListener);await page.evaluate(()=>{window.__questionQAObserver?.disconnect();delete window.__questionQAObserver;delete window.__questionQANavigation;}).catch(()=>{});}
}
