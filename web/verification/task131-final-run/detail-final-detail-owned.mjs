async (page)=>{
// TASK131 only: tools supply lifecycle adapters and the existing public BrowserType.
function navigationSummary(samples,expected,budgetMs){
 const failures=samples.filter(s=>s.error||s.cleanupErrors?.length||s.ready!==true||s.pageClosed===false||s.browserClosed===false||s.cleanup?.integrity?.pass===false||(!Number.isFinite(s.elapsedMs)||s.elapsedMs<0));
 const complete=samples.length===expected&&!failures.length,sorted=samples.map(s=>s.elapsedMs).sort((a,b)=>a-b);
 return {count:samples.length,expected,failures:failures.length,medianMs:complete?(sorted[(sorted.length-1)>>1]+sorted[sorted.length>>1])/2:null,p95Ms:complete?sorted[Math.ceil(expected*.95)-1]:null,budgetMs,pass:complete&&sorted[Math.ceil(expected*.95)-1]<=budgetMs};
}
function navigationSchedule(mode,smoke=false){
 if(!['warm','cold'].includes(mode))throw Error('Expected warm or cold navigation mode');
 const count=smoke?1:20,warmups=smoke?0:5,result=[];
 if(mode==='cold')for(let i=0;i<count;i++)for(const route of ['tasks','specs'])result.push({route,index:i+1,warmup:false});
 else for(const route of ['tasks','specs']){for(let i=0;i<warmups;i++)result.push({route,index:i+1,warmup:true});for(let i=0;i<count;i++)result.push({route,index:i+1,warmup:false});}
 return result;
}
/** This predicate distinguishes streamed SSR rows from onMount grid controls. */
function listReady(expected){
 const table=document.querySelector('[data-table-grid] table[role=grid]'),shell=document.querySelector('.inspector-layout.enhanced');
 if(!table||!shell||table.getBoundingClientRect().width===0)return false;
 const rows=Array.from(table.querySelectorAll('tbody tr[data-entity-id]')).map(n=>n.dataset.entityId);
 if(rows.length!==expected.ids.length||rows.some((id,i)=>id!==expected.ids[i]))return false;
 const total=Number((document.querySelector('h1')?.textContent??'').replace(/\D/g,''));
 const sort=table.querySelector('button.sort-control'),selection=table.querySelector('thead input[type=checkbox]');
 const ready=total===expected.total&&!!sort&&!sort.disabled&&!!selection&&table.getAttribute('aria-rowcount')===String(rows.length+1);
 // The endpoint is captured in the browser, before any tool round trip or diagnostics.
 return ready&&expected.finishWithFrames?new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now())))):ready;
}
/** Separate loading evidence; navigation's accepted endpoint is never moved. */
function loadingEvidence(value){
 const fresh=value.startedFromBlank===true&&value.priorRequestCount===0&&value.navigationType==='navigate'&&value.pageshowPersisted!==true&&value.activationStart===0&&value.prerendering===false&&value.serviceWorkerController===false;
 const indicator=Number.isFinite(value.firstLoadingAt)&&value.firstLoadingAt<=150,content=Number.isFinite(value.firstContentfulPaintMs)&&value.firstContentfulPaintMs<=150;
 const lowerBound=fresh&&Number.isFinite(value.ttfbMs)&&value.ttfbMs>150;
 if(lowerBound&&(indicator||content))return {blankBeyond150ms:null,loading150:{status:'NOT PROVEN',reason:'Contradictory loading/HTTP clocks',budgetMs:150}};
 return {blankBeyond150ms:lowerBound?true:indicator||content?false:null,loading150:{status:lowerBound?'FAIL':indicator||content?'PASS':'NOT PROVEN',reason:lowerBound?'Fresh direct document had no response bytes at150ms':indicator?'Visible product indicator observed by150ms':content?'Contentful document paint observed by150ms':'Paint/indicator evidence does not establish loading by150ms',budgetMs:150},freshNavigationVerified:fresh};
}
function installNavigationProbe(){
 performance.setResourceTimingBufferSize(10000);
 const probe=window.__acceptanceNavigation={firstShellAt:null,firstLoadingAt:null,pageshowPersisted:null};let scheduled=false;addEventListener('pageshow',event=>{probe.pageshowPersisted=event.persisted;},{once:true});
 const visible=node=>!!node&&node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden'&&getComputedStyle(node).display!=='none';
 const scan=()=>{if(probe.firstShellAt===null&&visible(document.querySelector('.inspector-layout')))probe.firstShellAt=performance.now();if(probe.firstLoadingAt!==null||scheduled)return;
  const indicator=Array.from(document.querySelectorAll('[role=status],[aria-busy=true]')).find(n=>visible(n)&&n.getBoundingClientRect().width>1&&n.getBoundingClientRect().height>1&&/loading|actualizando|refreshing/i.test(n.textContent??''));
  if(indicator){scheduled=true;requestAnimationFrame(()=>{scheduled=false;if(indicator.isConnected&&visible(indicator))probe.firstLoadingAt=performance.now();});}
 };
 const observer=new MutationObserver(scan);observer.observe(document,{subtree:true,childList:true,attributes:true,characterData:true});addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
function cleanupError(result,stage,error){(result.cleanupErrors??=[]).push({stage,error:String(error)});}
function failedSample(value){return value.error||value.cleanupErrors?.length||!value.ready||value.pageClosed===false;}
async function measureListNavigation(context,expected,{deadlineMs=30000}={}){
 const result={ready:false,url:expected.url,pageClosed:false};let page,navigationStarted=false,priorRequests=0;const noteRequest=()=>{if(!navigationStarted)priorRequests++;};
 const started=Date.now(),remaining=()=>Math.max(1,deadlineMs-(Date.now()-started));
 try{page=await context.newPage();result.startedFromBlank=page.url?.()==='about:blank';page.on?.('request',noteRequest);await page.addInitScript(installNavigationProbe);navigationStarted=true;await page.goto(expected.url,{waitUntil:'commit',timeout:remaining()});
  const endpoint=await page.waitForFunction(listReady,{...expected,finishWithFrames:true},{timeout:remaining()});
  try{result.elapsedMs=await endpoint.jsonValue();result.ready=true;}finally{try{await endpoint.dispose();}catch(error){cleanupError(result,'readiness handle',error);}}
 }catch(error){result.error=String(error);}
 if(page){try{Object.assign(result,await page.evaluate(()=>{const nav=performance.getEntriesByType('navigation')[0],paint=performance.getEntriesByName('first-contentful-paint')[0],probe=window.__acceptanceNavigation;return {diagnosticCapturedAtMs:performance.now(),visibilityState:document.visibilityState,hasFocus:document.hasFocus(),paintEntries:performance.getEntriesByType('paint').map(entry=>({name:entry.name,startTime:entry.startTime})),paintObservation:paint?'observed':'paint-unavailable',navigationType:nav?.type,activationStart:nav?.activationStart??0,prerendering:document.prerendering===true,serviceWorkerController:!!navigator.serviceWorker?.controller,pageshowPersisted:probe?.pageshowPersisted??null,navigationURL:nav?.name,ttfbMs:nav?.responseStart,responseEndMs:nav?.responseEnd,firstContentfulPaintMs:paint?.startTime??null,firstShellAt:probe?.firstShellAt??null,firstLoadingAt:probe?.firstLoadingAt??null,loadingVisibleWithin150ms:probe?.firstLoadingAt!==null&&probe?.firstLoadingAt<=150};}));}
  catch(error){result.error??=String(error);result.ready=false;}
  result.priorRequestCount=typeof page.on==='function'?priorRequests:null;Object.assign(result,loadingEvidence(result));
  try{page.off?.('request',noteRequest);}catch(error){cleanupError(result,'request observer',error);}
  try{await page.close();result.pageClosed=true;}catch(error){cleanupError(result,'page.close',error);result.pageClosed=page.isClosed?.()===true;}
 }
 return result;
}
async function closeBrowser(context,result){
 try{await context.close();}catch(error){cleanupError(result,'context.close',error);}
 result.browserClosed=context.browser()?.isConnected()===false;
 if(!result.browserClosed)cleanupError(result,'browser closure','Browser closure unverified');
}
/** Profile paths are unique owned directories supplied by the finite lifecycle adapter. */
async function ownBrowserContext(browserType,profile,{expectedVersion,launchOptions={}}){
 const context=await browserType.launchPersistentContext(profile,{...launchOptions,headless:launchOptions.headless??true,viewport:{width:1440,height:900},serviceWorkers:'block'});
 try{const version=context.browser()?.version();if(version!==expectedVersion)throw Error(`Browser version mismatch: expected ${expectedVersion}, observed ${version}`);
  const session=await context.browser().newBrowserCDPSession();let browserPID,primary;
  try{browserPID=(await session.send('SystemInfo.getProcessInfo')).processInfo.find(p=>p.type==='browser')?.id;}catch(error){primary=error;}
  try{await session.detach();}catch(error){if(primary)primary.cleanupErrors=[{stage:'CDP detach',error:String(error)}];else primary=error;}
  if(primary)throw primary;if(!browserPID)throw Error('Fresh browser process identity unavailable');
  return {context,metadata:{version,profile,browserPID,executable:launchOptions.executablePath??browserType.executablePath(),viewport:{width:1440,height:900},headless:launchOptions.headless??true}};
 }
 catch(error){const failure={error:String(error),cleanupErrors:error.cleanupErrors??[]};await closeBrowser(context,failure);throw Object.assign(new Error(failure.error),{cleanupErrors:failure.cleanupErrors,browserClosed:failure.browserClosed});}
}
async function coldBrowserSample(browserType,{profile,expectedVersion,expected,launchOptions}){
 let owned,result;
 try{owned=await ownBrowserContext(browserType,profile,{expectedVersion,launchOptions});result={...await measureListNavigation(owned.context,expected),browser:owned.metadata};}
 catch(error){result={ready:false,error:String(error),cleanupErrors:error.cleanupErrors??[],browserClosed:error.browserClosed===true};}
 if(owned)await closeBrowser(owned.context,result);
 return result;
}
async function warmBrowserSeries(browserType,{profile,expectedVersion,routes,launchOptions,smoke=false}){
 const schedule=navigationSchedule('warm',smoke),samples=[],warmups=[];let owned,notRun=[],setupError;
 const report={mode:smoke?'harness-smoke':'warm',credit:!smoke,samples,warmups};
 try{owned=await ownBrowserContext(browserType,profile,{expectedVersion,launchOptions});report.browser=owned.metadata;
  for(let i=0;i<schedule.length;i++){const item=schedule[i],value={...item,...await measureListNavigation(owned.context,routes[item.route])};(item.warmup?warmups:samples).push(value);
   if(value.pageClosed!==true){notRun=schedule.slice(i+1).map(item=>({...item,status:'NOT RUN',reason:'Page closure unverified'}));break;}
  }
 }catch(error){setupError=String(error);report.cleanupErrors=error.cleanupErrors??[];report.browserClosed=error.browserClosed===true;notRun=schedule.slice(samples.length+warmups.length).map(item=>({...item,status:'NOT RUN',reason:'Browser setup/measurement failed'}));}
 if(owned)await closeBrowser(owned.context,report);
 Object.assign(report,{notRun,error:setupError,validWarmup:!warmups.some(failedSample),summary:Object.fromEntries(['tasks','specs'].map(route=>[route,navigationSummary(samples.filter(s=>s.route===route),smoke?1:20,800)]))});
 for(const route of ['tasks','specs'])if(!report.browserClosed||report.cleanupErrors?.length||setupError||warmups.some(s=>s.route===route&&failedSample(s)))report.summary[route].pass=false;
 report.pass=!notRun.length&&Object.values(report.summary).every(s=>s.pass);return report;
}
/** functions.exec supplies these three tool adapters; there is no HTTP controller. */
async function coldNavigationSeries(adapters,{routes,expectedVersion,smoke=false}){
 const samples=[],schedule=navigationSchedule('cold',smoke);let notRun=[];
 for(let i=0;i<schedule.length;i++){const item=schedule[i];let runtime,value;
  try{runtime=await adapters.start(`${item.route}-${String(item.index).padStart(2,'0')}`);value={...item,...await adapters.browser({profile:runtime.profile,expectedVersion,expected:{...routes[item.route],url:new URL(routes[item.route].path,runtime.url).href}})};}
  catch(error){value={...item,ready:false,error:String(error),browserClosed:error.browserClosed===true,cleanupErrors:error.cleanupErrors??[]};}
  if(runtime){value.startup={sourceCommit:runtime.sourceCommit,startupMs:runtime.startupMs,reportedArtifactValidationMs:runtime.reportedArtifactValidationMs,nodeExecutable:runtime.nodeExecutable,nodeVersion:runtime.nodeVersion,buildId:runtime.buildId??runtime.artifact?.buildId};try{value.cleanup=await adapters.stop(runtime);if(!value.cleanup.closed||value.cleanup.error)cleanupError(value,'runtime closure',value.cleanup.error??'Runtime closure unverified');if(value.cleanup.integrity?.pass===false)cleanupError(value,'dependencies',value.cleanup.integrity);}
   catch(error){cleanupError(value,'runtime.stop',error);value.cleanup={closed:false};}}
  if(value.browserClosed!==true)cleanupError(value,'browser closure','Browser closure unverified');
  samples.push(value);try{await adapters.record?.(value);}catch(error){cleanupError(value,'record',error);}
  // No new runtime/browser while a previous process may still be alive or seed bytes changed.
  if(value.browserClosed!==true||(runtime&&value.cleanup?.closed!==true)||(!runtime&&value.error)||value.cleanup?.integrity?.pass===false){notRun=schedule.slice(i+1).map(item=>({...item,status:'NOT RUN',reason:'Cleanup or dependency integrity unverified'}));break;}
 }
 const summary=Object.fromEntries(['tasks','specs'].map(route=>[route,navigationSummary(samples.filter(s=>s.route===route),smoke?1:20,2500)]));
 return {mode:smoke?'harness-smoke':'application/browser cold; OS cache uncontrolled',credit:!smoke,samples,notRun,summary,pass:!notRun.length&&Object.values(summary).every(s=>s.pass)};
}

// Actual trusted click -> accepted100-row reader -> two animation frames. Coordinate a quiet lease.
async function profileDetailReaders(page,{baseURL='http://127.0.0.1:5295'}={}){
 const warmups=5,sampleCount=20,startedAt=new Date().toISOString(),results=[],requests=[],active=new Set(),byRequest=new Map();
 let maxAllInFlight=0,partial,invalid,currentKind,currentSample,lastRow;
 const record=request=>{if(new URL(request.url()).origin!==baseURL)return;const value={url:request.url(),method:request.method(),type:request.resourceType(),start:Date.now()};requests.push(value);byRequest.set(request,value);active.add(request);maxAllInFlight=Math.max(maxAllInFlight,active.size);};
 const done=request=>{const value=byRequest.get(request);if(value){value.end=Date.now();value.abort=request.failure()?.errorText??null;}active.delete(request);};
 const response=reply=>{const value=byRequest.get(reply.request());if(value)value.status=reply.status();};
 page.on('request',record);page.on('requestfinished',done);page.on('requestfailed',done);page.on('response',response);
 try{
  // Retain diagnostic metadata; no clock, transport, DOM or product behavior is modified.
  await page.addInitScript(()=>{performance.setResourceTimingBufferSize(10000);window.__spmTimingBufferFull=0;performance.addEventListener('resourcetimingbufferfull',()=>window.__spmTimingBufferFull++);});
  await page.setViewportSize({width:1440,height:900});
  await page.goto(`${baseURL}/tasks?sort=id.asc&scope=all`);await page.waitForFunction(()=>document.querySelector('.inspector-layout')?.classList.contains('enhanced'));
  async function close(){await page.getByRole('button',{name:'Close inspector',exact:true}).click();await page.waitForFunction(()=>!new URL(location.href).searchParams.has('inspect'));}
  async function prepareTask(){await page.locator('tr[data-entity-id=TASK-00001] a').first().click();await page.waitForFunction(()=>document.querySelectorAll('[data-relation-window=blockingTasks] [data-relation-item]').length===100);}
  for(const kind of ['task','spec']){
   const samples=[];let firstObservation;currentKind=kind;partial={kind,samples};
   for(let n=-warmups;n<sampleCount;n++){
    currentSample=n;lastRow=undefined;if(kind==='spec')await prepareTask();
    const anchor=kind==='task'?page.locator('tr[data-entity-id=TASK-00001] a').first():page.locator('.inspector-reader a[href="/specs/SPEC-00001"]');
    await anchor.scrollIntoViewIfNeeded();
    await anchor.evaluate((node,kind)=>{
     const name=kind==='task'?'blockingTasks':'linkedTasks';window.__spmDetailSample={start:0,end:0,trusted:false,rows:0};let scheduled=false;
     const observer=new MutationObserver(()=>{const sample=window.__spmDetailSample;if(!sample.start||scheduled||document.querySelectorAll(`[data-relation-window=${name}] [data-relation-item]`).length!==100)return;scheduled=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{sample.end=performance.now();sample.rows=document.querySelectorAll(`[data-relation-window=${name}] [data-relation-item]`).length;observer.disconnect();}));});
     window.__spmDetailObserver=observer;observer.observe(document.querySelector('.inspector-host'),{subtree:true,childList:true});node.addEventListener('click',event=>{window.__spmDetailSample.start=performance.now();window.__spmDetailSample.trusted=event.isTrusted;},{capture:true,once:true});
    },kind);
    await anchor.click();await page.waitForFunction(()=>window.__spmDetailSample?.end>0);
    const row=await page.evaluate(kind=>{const sample=window.__spmDetailSample,entries=performance.getEntriesByType('resource'),matches=entries.filter(entry=>{const url=new URL(entry.name);return entry.startTime>=sample.start&&url.pathname==='/workspace-detail'&&url.searchParams.get('kind')===kind;});const request=matches.at(-1);return {renderMs:sample.end-sample.start,start:sample.start,end:sample.end,trusted:sample.trusted,rows:sample.rows,httpMs:request?.duration??null,transferBytes:request?.transferSize??null,resourceEntries:entries.length,matchingEntries:matches.length,bufferFullEvents:window.__spmTimingBufferFull??0};},kind);
    lastRow=row;
    const reasons=[];if(!row.trusted)reasons.push('click-not-trusted');if(row.rows!==100)reasons.push('accepted-row-count-not100');if(row.httpMs===null)reasons.push('matching-http-resource-entry-missing');
    if(reasons.length)throw Object.assign(new Error('Invalid trusted reader timing sample'),{reasons});
    if(n===-warmups){firstObservation=row;partial.firstObservation=row;}if(n>=0)samples.push(row);await close();
   }
   const sorted=samples.map(row=>row.renderMs).sort((a,b)=>a-b),summary={median:(sorted[9]+sorted[10])/2,p95:sorted[18]};results.push({kind,firstObservation,summary,samples,budgetMs:300,budgetPass:summary.p95<=300});partial=undefined;
  }
 }catch(error){invalid={reason:String(error),fields:error.reasons??['collector-operation-failed'],kind:currentKind,sample:currentSample,row:lastRow??null};}
 finally{await page.evaluate(()=>window.__spmDetailObserver?.disconnect()).catch(()=>{});await page.waitForTimeout(100).catch(()=>{});page.off('request',record);page.off('requestfinished',done);page.off('requestfailed',done);page.off('response',response);}
 return {startedAt,finishedAt:new Date().toISOString(),browser:page.context().browser().version(),viewport:{width:1440,height:900},warmups,sampleCount,resourceTimingBufferSize:10000,requests,maxAllInFlight,remaining:active.size,invalid,partial,contextCountProof:'Exact-source instrumented functional trace established faviconGET/HEAD/query0contexts and Task/list/Spec1context each; these final uninstrumented network records do not independently count server calls.',scope:'Trusted click capture in browser through accepted100-row detail DOM and two animation frames. Node/Vite fresh no-store; Task9999downstream/Spec10k linked rows and full narrative/questions. Spec preparation opens Task outside the measured interval for its real related-spec link. Five warmups/twenty serial samples. Only ResourceTiming retention changes; no clocks, waits, transport, product source or threshold changed. Invalid runs retain all available partial samples and are not acceptance evidence. Mermaid may enhance after initial reader acceptance.',results,budgetPass:!invalid&&results.length===2&&results.every(result=>result.budgetPass)};
}

const browserType=page.context().browser().browserType();let owned,report;try{owned=await ownBrowserContext(browserType,"/var/folders/kd/klgrnvx90t76gmtb4mw9slqc0000gn/T/spm-acceptance-CTFV0u/runs/final-detail-owned/profile",{expectedVersion:'157.0.8103.78',launchOptions:{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}});const page=await owned.context.newPage();report=await profileDetailReaders(page,{baseURL:"http://127.0.0.1:60556"});report.browser=owned.metadata;}catch(error){report??={};report.error=String(error);}finally{if(owned){try{await owned.context.close();}catch(error){(report.cleanupErrors??=[]).push(String(error));}report.browserClosed=!owned.context.browser().isConnected();}}return report;}