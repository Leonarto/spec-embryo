// TASK131 only: tools supply lifecycle adapters and the existing public BrowserType.
export function navigationSummary(samples,expected,budgetMs){
 const failures=samples.filter(s=>s.error||s.cleanupErrors?.length||s.ready!==true||s.pageClosed===false||s.browserClosed===false||s.cleanup?.integrity?.pass===false||(!Number.isFinite(s.elapsedMs)||s.elapsedMs<0));
 const complete=samples.length===expected&&!failures.length,sorted=samples.map(s=>s.elapsedMs).sort((a,b)=>a-b);
 return {count:samples.length,expected,failures:failures.length,medianMs:complete?(sorted[(sorted.length-1)>>1]+sorted[sorted.length>>1])/2:null,p95Ms:complete?sorted[Math.ceil(expected*.95)-1]:null,budgetMs,pass:complete&&sorted[Math.ceil(expected*.95)-1]<=budgetMs};
}
export function navigationSchedule(mode,smoke=false){
 if(!['warm','cold'].includes(mode))throw Error('Expected warm or cold navigation mode');
 const count=smoke?1:20,warmups=smoke?0:5,result=[];
 if(mode==='cold')for(let i=0;i<count;i++)for(const route of ['tasks','specs'])result.push({route,index:i+1,warmup:false});
 else for(const route of ['tasks','specs']){for(let i=0;i<warmups;i++)result.push({route,index:i+1,warmup:true});for(let i=0;i<count;i++)result.push({route,index:i+1,warmup:false});}
 return result;
}
/** This predicate distinguishes streamed SSR rows from onMount grid controls. */
export function listReady(expected){
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
export function installNavigationProbe(){
 performance.setResourceTimingBufferSize(10000);
 const probe=window.__acceptanceNavigation={firstShellAt:null,firstLoadingAt:null};let scheduled=false;
 const visible=node=>!!node&&node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden'&&getComputedStyle(node).display!=='none';
 const scan=()=>{if(probe.firstShellAt===null&&visible(document.querySelector('.inspector-layout')))probe.firstShellAt=performance.now();if(probe.firstLoadingAt!==null||scheduled)return;
  const indicator=Array.from(document.querySelectorAll('[role=status],[aria-busy=true]')).find(n=>visible(n)&&n.getBoundingClientRect().width>1&&n.getBoundingClientRect().height>1&&/loading|actualizando|refreshing/i.test(n.textContent??''));
  if(indicator){scheduled=true;requestAnimationFrame(()=>{scheduled=false;if(indicator.isConnected&&visible(indicator))probe.firstLoadingAt=performance.now();});}
 };
 const observer=new MutationObserver(scan);observer.observe(document,{subtree:true,childList:true,attributes:true,characterData:true});addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
function cleanupError(result,stage,error){(result.cleanupErrors??=[]).push({stage,error:String(error)});}
function failedSample(value){return value.error||value.cleanupErrors?.length||!value.ready||value.pageClosed===false;}
export async function measureListNavigation(context,expected,{deadlineMs=30000}={}){
 const result={ready:false,url:expected.url,pageClosed:false};let page;
 const started=Date.now(),remaining=()=>Math.max(1,deadlineMs-(Date.now()-started));
 try{page=await context.newPage();await page.addInitScript(installNavigationProbe);await page.goto(expected.url,{waitUntil:'commit',timeout:remaining()});
  const endpoint=await page.waitForFunction(listReady,{...expected,finishWithFrames:true},{timeout:remaining()});
  try{result.elapsedMs=await endpoint.jsonValue();result.ready=true;}finally{try{await endpoint.dispose();}catch(error){cleanupError(result,'readiness handle',error);}}
 }catch(error){result.error=String(error);}
 if(page){try{Object.assign(result,await page.evaluate(()=>{const nav=performance.getEntriesByType('navigation')[0],paint=performance.getEntriesByName('first-contentful-paint')[0],probe=window.__acceptanceNavigation;return {navigationURL:nav?.name,ttfbMs:nav?.responseStart,responseEndMs:nav?.responseEnd,firstContentfulPaintMs:paint?.startTime??null,firstShellAt:probe?.firstShellAt??null,firstLoadingAt:probe?.firstLoadingAt??null,blankBeyond150ms:!paint||paint.startTime>150,loadingVisibleWithin150ms:probe?.firstLoadingAt!==null&&probe?.firstLoadingAt<=150};}));}
  catch(error){result.error??=String(error);result.ready=false;}
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
export async function ownBrowserContext(browserType,profile,{expectedVersion,launchOptions={}}){
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
export async function coldBrowserSample(browserType,{profile,expectedVersion,expected,launchOptions}){
 let owned,result;
 try{owned=await ownBrowserContext(browserType,profile,{expectedVersion,launchOptions});result={...await measureListNavigation(owned.context,expected),browser:owned.metadata};}
 catch(error){result={ready:false,error:String(error),cleanupErrors:error.cleanupErrors??[],browserClosed:error.browserClosed===true};}
 if(owned)await closeBrowser(owned.context,result);
 return result;
}
export async function warmBrowserSeries(browserType,{profile,expectedVersion,routes,launchOptions,smoke=false}){
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
export async function coldNavigationSeries(adapters,{routes,expectedVersion,smoke=false}){
 const samples=[],schedule=navigationSchedule('cold',smoke);let notRun=[];
 for(let i=0;i<schedule.length;i++){const item=schedule[i];let runtime,value;
  try{runtime=await adapters.start(`${item.route}-${String(item.index).padStart(2,'0')}`);value={...item,...await adapters.browser({profile:runtime.profile,expectedVersion,expected:{...routes[item.route],url:new URL(routes[item.route].path,runtime.url).href}})};}
  catch(error){value={...item,ready:false,error:String(error),browserClosed:error.browserClosed===true,cleanupErrors:error.cleanupErrors??[]};}
  if(runtime){try{value.cleanup=await adapters.stop(runtime);if(!value.cleanup.closed||value.cleanup.error)cleanupError(value,'runtime closure',value.cleanup.error??'Runtime closure unverified');if(value.cleanup.integrity?.pass===false)cleanupError(value,'dependencies',value.cleanup.integrity);}
   catch(error){cleanupError(value,'runtime.stop',error);value.cleanup={closed:false};}}
  if(value.browserClosed!==true)cleanupError(value,'browser closure','Browser closure unverified');
  samples.push(value);try{await adapters.record?.(value);}catch(error){cleanupError(value,'record',error);}
  // No new runtime/browser while a previous process may still be alive or seed bytes changed.
  if(value.browserClosed!==true||(runtime&&value.cleanup?.closed!==true)||(!runtime&&value.error)||value.cleanup?.integrity?.pass===false){notRun=schedule.slice(i+1).map(item=>({...item,status:'NOT RUN',reason:'Cleanup or dependency integrity unverified'}));break;}
 }
 const summary=Object.fromEntries(['tasks','specs'].map(route=>[route,navigationSummary(samples.filter(s=>s.route===route),smoke?1:20,2500)]));
 return {mode:smoke?'harness-smoke':'application/browser cold; OS cache uncontrolled',credit:!smoke,samples,notRun,summary,pass:!notRun.length&&Object.values(summary).every(s=>s.pass)};
}
