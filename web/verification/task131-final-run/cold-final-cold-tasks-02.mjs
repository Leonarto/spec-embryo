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

const browserType=page.context().browser().browserType();let report;report=await coldBrowserSample(browserType,{profile:"/var/folders/kd/klgrnvx90t76gmtb4mw9slqc0000gn/T/spm-acceptance-CTFV0u/runs/final-cold-tasks-02/profile",expectedVersion:"157.0.8103.78",launchOptions:{executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true},expected:{"path": "/tasks?sort=id.asc&page=1&pageSize=100&scope=all&view=table", "ids": ["TASK-00001", "TASK-00002", "TASK-00003", "TASK-00004", "TASK-00005", "TASK-00006", "TASK-00007", "TASK-00008", "TASK-00009", "TASK-00010", "TASK-00011", "TASK-00012", "TASK-00013", "TASK-00014", "TASK-00015", "TASK-00016", "TASK-00017", "TASK-00018", "TASK-00019", "TASK-00020", "TASK-00021", "TASK-00022", "TASK-00023", "TASK-00024", "TASK-00025", "TASK-00026", "TASK-00027", "TASK-00028", "TASK-00029", "TASK-00030", "TASK-00031", "TASK-00032", "TASK-00033", "TASK-00034", "TASK-00035", "TASK-00036", "TASK-00037", "TASK-00038", "TASK-00039", "TASK-00040", "TASK-00041", "TASK-00042", "TASK-00043", "TASK-00044", "TASK-00045", "TASK-00046", "TASK-00047", "TASK-00048", "TASK-00049", "TASK-00050", "TASK-00051", "TASK-00052", "TASK-00053", "TASK-00054", "TASK-00055", "TASK-00056", "TASK-00057", "TASK-00058", "TASK-00059", "TASK-00060", "TASK-00061", "TASK-00062", "TASK-00063", "TASK-00064", "TASK-00065", "TASK-00066", "TASK-00067", "TASK-00068", "TASK-00069", "TASK-00070", "TASK-00071", "TASK-00072", "TASK-00073", "TASK-00074", "TASK-00075", "TASK-00076", "TASK-00077", "TASK-00078", "TASK-00079", "TASK-00080", "TASK-00081", "TASK-00082", "TASK-00083", "TASK-00084", "TASK-00085", "TASK-00086", "TASK-00087", "TASK-00088", "TASK-00089", "TASK-00090", "TASK-00091", "TASK-00092", "TASK-00093", "TASK-00094", "TASK-00095", "TASK-00096", "TASK-00097", "TASK-00098", "TASK-00099", "TASK-00100"], "total": 10000, "pageSize": 100, "url": "http://127.0.0.1:64901/tasks?sort=id.asc&page=1&pageSize=100&scope=all&view=table"}});return report;}