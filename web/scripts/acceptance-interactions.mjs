// TASK131 only. Public Playwright objects are supplied by the caller; no lifecycle ownership.
export function interactionSummary(samples,budgetMs,{expected=20,every=false}={}) {
 const invalid=samples.filter(row=>row.error||row.cleanupErrors?.length||row.ready!==true||!Number.isFinite(row.elapsedMs)||row.elapsedMs<0),complete=samples.length===expected&&!invalid.length;
 const sorted=samples.map(row=>row.elapsedMs).sort((a,b)=>a-b),median=complete?(sorted[(sorted.length-1)>>1]+sorted[sorted.length>>1])/2:null,p95=complete?sorted[Math.ceil(expected*.95)-1]:null,max=complete?sorted.at(-1):null;
 return {status:!samples.length?'NOT RUN':!complete?'INVALID':(every?max:p95)<=budgetMs?'PASS':'FAIL',count:samples.length,expected,invalid:invalid.length,medianMs:median,p95Ms:p95,maxMs:max,budgetMs,rule:every?'every observation':'nearest-rank p95',pass:complete&&(every?max:p95)<=budgetMs};
}
export function validateInteractionOracles(options) {
 if(!options?.identity||!['fixture','source','runtime'].every(key=>options.identity[key]))throw Error('Explicit fixture/source/runtime identity required');
 if(!Array.isArray(options.routes)||options.routes.length!==2||options.routes.map(r=>r.route).sort().join(',')!=='specs,tasks')throw Error('Separate Tasks and Specs route oracles required');
 for(const route of options.routes){
  for(const [oracle,size]of [[route.page100,100],[route.page200,200],...(route.search??[]).map(oracle=>[oracle,100])]){
   if(!oracle||!Array.isArray(oracle.ids)||new Set(oracle.ids).size!==oracle.ids.length||oracle.ids.some(id=>typeof id!=='string'||!id)||!Number.isSafeInteger(oracle.total)||oracle.total<oracle.ids.length||oracle.pageSize!==size||oracle.ids.length>size)throw Error('Invalid ordered row/count/page-size oracle');
   const url=new URL(oracle.url);if(url.pathname!==`/${route.route}`||url.searchParams.get('pageSize')!==String(size))throw Error('Oracle route/page-size URL mismatch');
  }
  if(route.page100.ids.length<2||!route.page100.ids.slice(0,2).includes(route.openerId))throw Error('Two known visible rows and a visible opener required');
  if(route.search?.length!==2||route.search[0].q===route.search[1].q||route.search.some(oracle=>typeof oracle.q!=='string'||!oracle.q||new URL(oracle.url).searchParams.get('q')!==oracle.q))throw Error('Two distinct predetermined search queries required');
  if(JSON.stringify(route.search[0].ids)===JSON.stringify(route.search[1].ids)&&route.search[0].total===route.search[1].total)throw Error('Search result identities must differ');
 }
 return true;
}
export function longTaskAssessment(record) {
 const valid=record.supported===true&&Number.isFinite(record.startAt)&&Number.isFinite(record.endAt)&&record.endAt>=record.startAt;
 const tasks=(record.entries??[]).filter(entry=>entry.startTime<=record.endAt&&entry.startTime+entry.duration>=record.startAt);
 const malformed=(record.entries??[]).some(entry=>!Number.isFinite(entry.startTime)||!Number.isFinite(entry.duration)||entry.duration<0);
 const maximum=tasks.length?Math.max(...tasks.map(entry=>entry.duration)):0;
 return {supported:record.supported,overlapping:tasks,maxDurationMs:maximum,budgetMs:100,pass:valid&&!malformed&&maximum<=100};
}
export function scrollAssessment(record,minimumDurationMs=10000) {
 const longTasks=longTaskAssessment(record),scrolled=(record.positions??[]).some(value=>value.source==='scroll'&&value.isTrusted===true&&value.top!==record.positions?.[0]?.top)&&(record.wheels??[]).some(value=>value.isTrusted===true);
 const durationMs=record.endAt-record.startAt,rowsValid=Number.isSafeInteger(record.maxMountedRows)&&record.maxMountedRows>0&&record.maxMountedRows<=200;
 return {longTasks,scrolled,durationMs,rowsValid,pass:longTasks.pass&&scrolled&&durationMs>=minimumDurationMs&&rowsValid};
}
export function stabilityAssessment(snapshots,openerId) {
 const before=snapshots?.before,stages=['opened','closed','refreshed'],failures=[];
 if(!before?.toolbar?.visible||!before.row?.visible||before.row.id!==openerId)failures.push('Initial opener/toolbar unavailable');
 for(const stage of stages){const value=snapshots?.[stage];if(!value?.toolbar?.visible||!before||Math.abs(value.toolbar.top-before.toolbar.top)>1)failures.push(`${stage}: toolbar moved or hidden`);if(!value?.row?.visible||value.row.id!==openerId)failures.push(`${stage}: opener outside usable viewport`);}
 if((snapshots?.closed?.focused?.rowId!==openerId||snapshots?.closed?.focused?.columnKey!=='id'))failures.push('Close did not restore opener focus');
 // Opening and clicking Refresh intentionally transfer focus; retain and report it.
 return {pass:!failures.length,failures,toleranceCssPx:1};
}
export async function inspectInteractionPayload({text,status,cacheControl,oracle,route,bodyMarker}) {
 const bytes=new TextEncoder().encode(text),sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(value=>value.toString(16).padStart(2,'0')).join(''),errors=[];let envelope;
 try{envelope=JSON.parse(text);}catch{errors.push('Invalid JSON');}
 const rows=Array.isArray(envelope?.data?.result?.rows)?envelope.data.result.rows:[];
 const allowed=route==='tasks'?['view','result','filters']:['result','filters','progressIsSubset'],data=envelope?.data,result=data?.result;
 if(status!==200||envelope&&Object.keys(envelope).some(key=>!['schemaVersion','route','requestKey','revision','generatedAt','shell','data'].includes(key))||envelope?.route!==route||envelope?.schemaVersion!==1||!data||!result||!Array.isArray(result.rows)||!data.filters||!Array.isArray(data.filters.options?.options)||Object.keys(data).some(key=>!allowed.includes(key)))errors.push('Route/result/filters shape mismatch or off-route dataset');
 if(result&&(result.pageSize!==100||result.totalMatching!==oracle.total||JSON.stringify(rows.map(row=>row.id))!==JSON.stringify(oracle.ids)))errors.push('Payload row/query oracle mismatch');
 const rowKeys=route==='tasks'?['id','title','summary','rawStatus','effectiveStatus','priority','specIds','dependsOn','unmetDependencies','downstreamCount','effort','completedAt','cancelledAt','archivedAt','archiveReason','updatedAt','createdAt']:['id','title','summary','status','taskIds','linkedTaskCount','progress','owner','updatedAt','tags'];
 if(rows.some(row=>!row||Object.keys(row).some(key=>!rowKeys.includes(key))))errors.push('Unexpected row content');
 function visit(value,path){if(!value||typeof value!=='object')return;for(const [key,child]of Object.entries(value)){if(/^(?:body|blocks?|raw(?:content|body)?|content|markdown|sections|narrative|sourceText)$/i.test(key))errors.push(`Document content field: ${path}.${key}`);visit(child,`${path}.${key}`);}}
 visit(envelope,'payload');if(envelope){const forbidden=[];function datasets(value,path){if(!value||typeof value!=='object')return;for(const [key,child]of Object.entries(value)){if(/^(?:tasks|specs|timeline|kanban|criticalPath|documents|handoffs|dashboard|graph|currentState)$/.test(key))forbidden.push(`${path}.${key}`);datasets(child,`${path}.${key}`);}}datasets(envelope,'payload');if(forbidden.length)errors.push(`Off-route datasets: ${forbidden.join(',')}`);}if(bodyMarker&&text.includes(bodyMarker))errors.push('Private fixture body marker leaked');
 if(bytes.length>250*1024)errors.push('Decoded UTF-8 payload exceeds 250KiB');
 return {status,cacheControl,bytes:bytes.length,sha256,budgetBytes:250*1024,ids:rows.map(row=>row.id),total:result?.totalMatching,errors,statusLabel:errors.length?'FAIL':'PASS',pass:!errors.length,rawText:text};
}
// Self-contained browser functions: serialize/inject without private runtime/module access.
export async function readInteractionPayloadResponse(url) {
 const response=await fetch(url,{headers:{Accept:'application/json'}});
 return {text:await response.text(),status:response.status,cacheControl:response.headers.get('cache-control')};
}
export function listInteractionReady(oracle) {
 const table=document.querySelector('[data-table-grid] table[role="grid"]'),input=document.querySelector('input[type="search"][name="q"]');
 if(!table||table.getBoundingClientRect().width<=0||!document.querySelector('.inspector-layout.enhanced')||!input||input.disabled)return false;
 const ids=Array.from(table.querySelectorAll('tbody tr[data-entity-id]')).map(row=>row.dataset.entityId),sort=table.querySelector('button.sort-control'),select=table.querySelector('thead input[type="checkbox"]');
 if(JSON.stringify(ids)!==JSON.stringify(oracle.ids)||Number((document.querySelector('h1')?.textContent??'').replace(/\D/g,''))!==oracle.total||!sort||sort.disabled||!select||table.getAttribute('aria-rowcount')!==String(ids.length+1))return false;
 if(!ids.length&&!Array.from(document.querySelectorAll('.empty-table')).some(node=>node.getClientRects().length&&/No matching records/.test(node.textContent??'')))return false;
 const actual=new URL(location.href),expected=new URL(oracle.url);actual.searchParams.sort();expected.searchParams.sort();
 return actual.origin===expected.origin&&actual.pathname===expected.pathname&&actual.searchParams.toString()===expected.searchParams.toString();
}
export function installInteractionProbe(config) {
 const key='__spmAcceptanceInteraction';if(window[key])throw Error('Previous interaction probe was not removed');
 const state={timeOrigin:performance.timeOrigin,kind:config.kind,events:[],requests:[],maxMountedRows:0,startAt:null,inputAt:null,feedbackAt:null,readyAt:null,stateCompletionAt:null,done:false,error:null};
 let closed=false,frame=0,feedbackFrame=0,acceptedFrames=0,observer,resources;const listeners=[],armedAt=performance.now();
 const mounted=()=>{state.maxMountedRows=Math.max(state.maxMountedRows,document.querySelectorAll('[data-table-grid] tbody tr[data-entity-id]').length);};
 function visible(node){return !!node&&node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden';}
 function ready(){
  if(config.kind==='key'){const active=document.activeElement;return active?.dataset.rowKey===config.rowId&&active?.dataset.columnKey===config.columnKey&&active.getAttribute('tabindex')==='0'&&document.querySelectorAll('[data-table-grid] [data-grid-target][tabindex="0"]').length===1;}
  if(config.kind==='click'){const row=Array.from(document.querySelectorAll('[data-table-grid] tbody tr[data-entity-id]')).find(row=>row.dataset.entityId===config.rowId);return row?.getAttribute('aria-selected')===String(config.selected)&&row.querySelector('input[type="checkbox"]')?.checked===config.selected;}
  const oracle=config.oracle,table=document.querySelector('[data-table-grid] table[role="grid"]'),input=document.querySelector('input[type="search"][name="q"]');
  if(!table||!visible(table)||!document.querySelector('.inspector-layout.enhanced')||!input||input.disabled)return false;
  const ids=Array.from(table.querySelectorAll('tbody tr[data-entity-id]')).map(row=>row.dataset.entityId),sort=table.querySelector('button.sort-control'),select=table.querySelector('thead input[type="checkbox"]');
  const actual=new URL(location.href),expected=new URL(oracle.url);actual.searchParams.sort();expected.searchParams.sort();
  return input.value===oracle.q&&actual.href===expected.href&&JSON.stringify(ids)===JSON.stringify(oracle.ids)&&Number((document.querySelector('h1')?.textContent??'').replace(/\D/g,''))===oracle.total&&!!sort&&!sort.disabled&&!!select&&table.getAttribute('aria-rowcount')===String(ids.length+1)&&(ids.length>0||Array.from(document.querySelectorAll('.empty-table')).some(node=>visible(node)&&/No matching records/.test(node.textContent??'')));
 }
 function scan(){if(closed||state.done)return;mounted();if(state.startAt===null)return;
  if(config.kind==='search'&&state.inputAt!==null&&state.feedbackAt===null&&!feedbackFrame){const input=document.querySelector('input[type="search"][name="q"]');if(visible(input)&&input.value===config.oracle.q)feedbackFrame=requestAnimationFrame(()=>{feedbackFrame=0;if(!closed&&visible(input)&&input.value===config.oracle.q)state.feedbackAt=performance.now();});}
  if(config.kind==='search'&&state.inputAt===null||frame)return;
  if(ready()){state.stateCompletionAt??=performance.now();frame=requestAnimationFrame(()=>{frame=0;if(closed||!ready()){acceptedFrames=0;return;}acceptedFrames++;if(acceptedFrames===(config.kind==='search'?2:1)){state.readyAt=performance.now();state.done=true;mounted();}else scan();});}else acceptedFrames=0;
 }
 function capture(event){if(closed||!event.target?.closest(config.selector))return;
  const capturedAt=performance.now(),record={type:event.type,isTrusted:event.isTrusted,timeStamp:event.timeStamp,capturedAt,key:event.key??null,inputType:event.inputType??null};state.events.push(record);
  if(!event.isTrusted||!Number.isFinite(performance.timeOrigin)||!Number.isFinite(event.timeStamp)||event.timeStamp<0||event.timeStamp>capturedAt+1){state.error='Missing/untrusted or incompatible monotonic event clock';state.done=true;return;}
  if(config.kind==='key'&&(event.key!==config.expectedKey||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)){state.error='Unexpected key or modifiers';state.done=true;return;}
  if(config.kind==='search'){if(event.type==='beforeinput'){state.startAt??=event.timeStamp;}else if(event.type==='input'){state.inputAt=event.timeStamp;if(state.startAt===null){state.error='Input had no trusted beforeinput';state.done=true;return;}state.readyAt=null;state.stateCompletionAt=null;acceptedFrames=0;}}
  else if(state.startAt===null)state.startAt=event.timeStamp;else{state.error='Unexpected repeated triggering event';state.done=true;return;}
  queueMicrotask(scan);
 }
 function collect(entries){for(const entry of entries){if(entry.startTime<armedAt)continue;try{const url=new URL(entry.name);if(config.kind==='search'&&(url.pathname.endsWith('/__data.json')||url.pathname==='/workspace-data')&&!state.requests.some(old=>old.url===entry.name&&old.startTime===entry.startTime))state.requests.push({url:entry.name,matchesQuery:url.searchParams.get('q')===config.oracle.q,startTime:entry.startTime,responseStart:entry.responseStart,responseEnd:entry.responseEnd,duration:entry.duration,transferSize:entry.transferSize});}catch{}}}
 const cleanup=()=>{closed=true;for(const [type,fn]of listeners)document.removeEventListener(type,fn,true);observer?.disconnect();resources?.disconnect();cancelAnimationFrame(frame);cancelAnimationFrame(feedbackFrame);delete window[key];};
 window[key]={state,cleanup,flushResources(){if(config.kind==='search')collect([...resources?.takeRecords()??[],...performance.getEntriesByType('resource')]);}};
 try{
  for(const type of config.kind==='search'?['beforeinput','input']:[config.kind==='key'?'keydown':'click']){document.addEventListener(type,capture,true);listeners.push([type,capture]);}
  observer=new MutationObserver(scan);observer.observe(document,{subtree:true,childList:true,attributes:true,characterData:true});
  resources=new PerformanceObserver(list=>collect(list.getEntries()));resources.observe({type:'resource',buffered:false});mounted();
 }catch(error){cleanup();throw error;}
 return {armed:true};
}
export function readInteractionProbe(partial=false) {const probe=window.__spmAcceptanceInteraction;if(!probe||!partial&&!probe.state.done)return false;probe.flushResources();return JSON.parse(JSON.stringify(probe.state));}
export function removeInteractionProbe(){const probe=window.__spmAcceptanceInteraction;if(probe)probe.cleanup();return {removed:!window.__spmAcceptanceInteraction};}
export function geometrySnapshot({route,openerId}) {
 const pane=document.querySelector('[data-table-grid]'),toolbar=document.querySelector(`.${route}-toolbar`),row=Array.from(pane?.querySelectorAll('tbody tr[data-entity-id]')??[]).find(row=>row.dataset.entityId===openerId),header=pane?.querySelector('thead'),viewport={width:innerWidth,height:innerHeight};
 function rect(node){if(!node)return null;const r=node.getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}
 const port=rect(pane),head=rect(header),bar=rect(toolbar),item=rect(row),active=document.activeElement?.closest('[data-grid-target]');
 return {viewport,mountedRows:pane?.querySelectorAll('tbody tr[data-entity-id]').length??0,scrollport:port,scroll:{top:pane?.scrollTop,left:pane?.scrollLeft},toolbar:{...bar,visible:!!bar&&bar.top>=0&&bar.bottom<=innerHeight&&bar.height>0},row:{...item,id:row?.dataset.entityId,visible:!!item&&!!port&&item.top>=Math.max(port.top,head?.bottom??port.top)&&item.bottom<=Math.min(port.bottom,innerHeight)&&item.right>port.left&&item.left<port.right},focused:{rowId:active?.dataset.rowKey,columnKey:active?.dataset.columnKey,role:document.activeElement?.getAttribute('aria-label'),tag:document.activeElement?.tagName}};
}
export function installScrollProbe() {
 if(window.__spmAcceptanceScroll)throw Error('Previous scroll probe was not removed');
 const pane=document.querySelector('[data-table-grid]');if(!pane)throw Error('Actual table scrollport missing');
 const record={supported:PerformanceObserver.supportedEntryTypes?.includes('longtask')===true,startAt:null,endAt:null,entries:[],positions:[],wheels:[],maxMountedRows:0};let active=false,observer,mutation;
 const capture=event=>{if(!active)return;record.positions.push({at:performance.now(),source:event?.type??'mounted-scan',isTrusted:event?.isTrusted??null,top:pane.scrollTop,left:pane.scrollLeft,maxTop:pane.scrollHeight-pane.clientHeight});record.maxMountedRows=Math.max(record.maxMountedRows,pane.querySelectorAll('tbody tr[data-entity-id]').length);};
 const wheel=event=>{if(active)record.wheels.push({at:performance.now(),timeStamp:event.timeStamp,isTrusted:event.isTrusted,deltaY:event.deltaY});};
 const cleanup=()=>{active=false;pane.removeEventListener('scroll',capture);pane.removeEventListener('wheel',wheel);mutation?.disconnect();observer?.disconnect();delete window.__spmAcceptanceScroll;};
 window.__spmAcceptanceScroll={record,start(){record.startAt=performance.now();active=true;capture();},finish(){record.endAt=performance.now();capture();active=false;return record;},cleanup};
 try{if(record.supported){observer=new PerformanceObserver(list=>{record.entries.push(...list.getEntries().map(e=>({name:e.name,startTime:e.startTime,duration:e.duration})));});observer.observe({type:'longtask',buffered:false});}
  pane.addEventListener('scroll',capture);pane.addEventListener('wheel',wheel,{passive:true});mutation=new MutationObserver(capture);mutation.observe(pane,{subtree:true,childList:true});
 }catch(error){cleanup();throw error;}
 return {supported:record.supported};
}
export function scrollProbeCommand(command){const probe=window.__spmAcceptanceScroll;if(!probe)throw Error('Scroll probe missing');if(command==='start'){probe.start();return probe.record.startAt;}if(command==='finish')return probe.finish();if(command==='read')return probe.record;if(command==='cleanup'){probe.cleanup();return {removed:!window.__spmAcceptanceScroll};}throw Error('Invalid scroll command');}
async function settle(page,oracle){await page.waitForFunction(listInteractionReady,oracle,{timeout:30000});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
export async function sampleInteraction(page,config,action){let raw,result={ready:false},handle;const requests=[];
 const requestRows=new Map();
 const requested=request=>{try{const url=new URL(request.url());if(config.kind==='search'&&(url.pathname.endsWith('/__data.json')||url.pathname==='/workspace-data')){const row={url:request.url(),matchesQuery:url.searchParams.get('q')===config.oracle.q,pending:true};requests.push(row);requestRows.set(request,row);}}catch{}};
 const finished=request=>{const row=requestRows.get(request);if(row){try{Object.assign(row,{pending:false,timing:request.timing(),failure:request.failure()});}catch(error){row.captureError=String(error);}}};
 const hooks=[['request',requested],['requestfinished',finished],['requestfailed',finished]];
 let hooked=0;
 try{for(const [event,handler]of hooks){page.on(event,handler);hooked++;}await page.evaluate(installInteractionProbe,config);await action();handle=await page.waitForFunction(readInteractionProbe,false,{timeout:15000});raw=await handle.jsonValue();result={...raw,ready:raw.done&&!raw.error&&Number.isFinite(raw.readyAt),elapsedMs:raw.readyAt-(config.kind==='search'?raw.inputAt:raw.startAt)};if(config.kind==='search'){result.feedbackMs=raw.feedbackAt-raw.startAt;result.feedbackReady=Number.isFinite(raw.feedbackAt)&&raw.feedbackAt>=raw.startAt;result.configuredDebounceMs=150;result.requestDelays=raw.requests.map(request=>({...request,inputToRequestMs:request.startTime-raw.inputAt}));}}
 catch(error){result.error=String(error);try{raw=await page.evaluate(readInteractionProbe,true);if(raw)result.partial=raw;}catch(secondary){(result.cleanupErrors??=[]).push({stage:'partial probe',error:String(secondary)});}}
 finally{for(const [event,handler]of hooks.slice(0,hooked))try{page.off(event,handler);}catch(error){(result.cleanupErrors??=[]).push({stage:'request listener cleanup',error:String(error)});}if(handle)try{await handle.dispose();}catch(error){(result.cleanupErrors??=[]).push({stage:'probe handle',error:String(error)});}try{const removed=await page.evaluate(removeInteractionProbe);if(!removed.removed)throw Error('Probe removal unverified');}catch(error){(result.cleanupErrors??=[]).push({stage:'interaction cleanup',error:String(error)});}}
 result.httpRequests=requests.map(row=>({...row,inputToRequestMs:raw&&Number.isFinite(row.timing?.startTime)?row.timing.startTime-raw.timeOrigin-raw.inputAt:null}));
 if(config.kind==='search'&&raw){result.feedbackMs=raw.feedbackAt-raw.startAt;result.feedbackReady=!raw.error&&Number.isFinite(raw.feedbackAt)&&Number.isFinite(raw.startAt)&&raw.feedbackAt>=raw.startAt;result.feedbackError=raw.error||undefined;result.configuredDebounceMs=150;result.requestDelays=raw.requests.map(request=>({...request,inputToRequestMs:request.startTime-raw.inputAt}));}
 return result;
}
async function scrollInterval(page,oracle,smoke){const result={ready:false,wheelCount:0},durationMs=smoke?250:10000;let installed=false;
 try{await page.goto(oracle.url);await settle(page,oracle);const pane=page.locator('[data-table-grid]');await pane.hover();
  // One preparatory down/up traversal, using real wheel input only.
  await page.mouse.wheel(0,100000);await page.waitForFunction(()=>{const pane=document.querySelector('[data-table-grid]');return pane&&pane.scrollTop>=pane.scrollHeight-pane.clientHeight-1;});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.mouse.wheel(0,-100000);await page.waitForFunction(()=>document.querySelector('[data-table-grid]')?.scrollTop<=1);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(installScrollProbe);installed=true;
  const start=await page.evaluate(scrollProbeCommand,'start');let direction=1;
  while(await page.evaluate(()=>performance.now())-start<durationMs){const position=await pane.evaluate(node=>({top:node.scrollTop,max:node.scrollHeight-node.clientHeight}));if(position.top>=position.max-1)direction=-1;else if(position.top<=1)direction=1;await page.mouse.wheel(0,direction*360);result.wheelCount++;await page.waitForTimeout(50);}
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));Object.assign(result,await page.evaluate(scrollProbeCommand,'finish'));await page.waitForTimeout(100);Object.assign(result,await page.evaluate(scrollProbeCommand,'read'));Object.assign(result,scrollAssessment(result,durationMs));result.ready=true;
 }catch(error){result.error=String(error);}
 finally{if(installed)try{const cleanup=await page.evaluate(scrollProbeCommand,'cleanup');if(!cleanup.removed)throw Error('Scroll cleanup unverified');}catch(error){(result.cleanupErrors??=[]).push({stage:'scroll cleanup',error:String(error)});}}
 result.pass=result.ready&&!result.error&&!result.cleanupErrors?.length&&result.longTasks?.pass&&result.scrolled&&result.maxMountedRows<=200&&result.durationMs>=durationMs;result.status=!result.supported?'UNAVAILABLE':!result.ready||result.error||result.cleanupErrors?.length||!result.scrolled?'INVALID':result.pass?'PASS':'FAIL';return result;
}
async function stabilitySequence(page,route){const snapshots={},result={ready:false,snapshots};try{
 await page.goto(route.page100.url);await settle(page,route.page100);const link=page.locator(`[data-table-grid] [data-entity-id="${route.openerId}"] a[data-column-key="id"]`);await link.focus();snapshots.before=await page.evaluate(geometrySnapshot,route);
 await link.click();await page.waitForFunction(({id,kind})=>{const host=document.querySelector('.inspector-host');return host&&!host.hidden&&host.querySelector('.identity')?.textContent?.trim()===`${kind} · ${id}`&&new URL(location.href).searchParams.get('inspect')===`${kind}:${id}`&&host.querySelector('.inspector-reader .item-id')?.textContent?.trim()===id&&host.querySelector('.inspector-reader')?.getAttribute('aria-busy')==='false'&&!!host.querySelector('.detail-shell');},{id:route.openerId,kind:route.route==='tasks'?'task':'spec'},{timeout:30000});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));snapshots.opened=await page.evaluate(geometrySnapshot,route);
 await page.getByRole('button',{name:'Close inspector',exact:true}).click();await settle(page,route.page100);snapshots.closed=await page.evaluate(geometrySnapshot,route);
 const [response]=await Promise.all([page.waitForResponse(response=>{const url=new URL(response.url());return url.pathname==='/workspace-data'&&url.searchParams.get('route')===route.route;},{timeout:30000}),page.getByRole('button',{name:'Refresh workspace',exact:true}).click()]);await response.finished();result.refresh={url:response.url(),status:response.status()};if(response.status()!==200)throw Error('Refresh failed');await page.waitForFunction(()=>{const button=document.querySelector('button[aria-label="Refresh workspace"]');return button?.getAttribute('aria-busy')!=='true'&&!document.querySelector('.refresh-error')&&!/Actualizando/.test(document.querySelector('.refresh-state')?.textContent??'');});await settle(page,route.page100);snapshots.refreshed=await page.evaluate(geometrySnapshot,route);result.ready=true;
 }catch(error){result.error=String(error);}const assessment=stabilityAssessment(snapshots,route.openerId);return {...result,...assessment,pass:result.ready&&!result.error&&assessment.pass};
}
export async function runAcceptanceInteractions(page,options) {
 options=JSON.parse(JSON.stringify(options));validateInteractionOracles(options);const smoke=options.smoke===true,count=smoke?1:20,warmupCount=smoke?0:5,report={phase:smoke?'interaction harness smoke':'AC13 interactions',credit:!smoke,identity:options.identity,oracles:options.routes,routes:[],budgets:{gridP95Ms:50,feedbackEveryMs:100,filterTotalP95Ms:1150,configuredDebounceMs:150,longTaskMaxMs:100,payloadBytes:250*1024,tableRows:200}};
 for(const route of options.routes){const entry={route:route.route,warmups:{key:[],click:[],search:[]},samples:{key:[],click:[],search:[]},notRun:[],maxMountedRows:0};report.routes.push(entry);
  for(const kind of ['key','click','search']){let setupError;
   try{await page.goto(route.page100.url);await settle(page,route.page100);for(let index=0;index<warmupCount+count;index++){
    const warmup=index<warmupCount,ordinal=warmup?index+1:index-warmupCount+1;let config,action;
    if(kind==='key'){const rowId=route.page100.ids[index%2?0:1],from=route.page100.ids[index%2?1:0];await page.locator(`[data-row-key="${from}"][data-column-key="id"][data-grid-target]`).focus();config={kind,selector:'[data-table-grid] [data-grid-target]',rowId,columnKey:'id',expectedKey:index%2?'ArrowUp':'ArrowDown'};action=()=>page.keyboard.press(index%2?'ArrowUp':'ArrowDown');}
    else if(kind==='click'){config={kind,selector:'[data-table-grid] tbody input[type="checkbox"]',rowId:route.openerId,selected:index%2===0};action=()=>page.getByRole('checkbox',{name:`Select ${route.openerId}`,exact:true}).click();}
    else{const oracle=route.search[index%2];config={kind,selector:'input[type="search"][name="q"]',oracle};action=async()=>{const input=page.locator(config.selector);await input.focus();await input.press('ControlOrMeta+A');await page.keyboard.insertText(oracle.q);};}
    const sample={index:ordinal,warmup,...await sampleInteraction(page,config,action)};(warmup?entry.warmups:entry.samples)[kind].push(sample);entry.maxMountedRows=Math.max(entry.maxMountedRows,sample.maxMountedRows??sample.partial?.maxMountedRows??0);
    if(sample.cleanupErrors?.length){entry.fatalCleanup=true;entry.notRun.push({metric:kind,status:'NOT RUN',remaining:warmupCount+count-index-1,reason:'Probe cleanup unverified'});break;}
   }}catch(error){setupError=String(error);entry.notRun.push({metric:kind,status:'NOT RUN',reason:setupError});}
   if(entry.fatalCleanup)break;
  }
  entry.summary={key:interactionSummary(entry.samples.key,50,{expected:count}),click:interactionSummary(entry.samples.click,50,{expected:count}),feedback:interactionSummary(entry.samples.search.map(row=>({...row,error:row.feedbackError,ready:row.feedbackReady,elapsedMs:row.feedbackMs})),100,{expected:count,every:true}),filter:interactionSummary(entry.samples.search,1150,{expected:count})};
  for(const kind of ['key','click','search'])if(entry.warmups[kind].length!==warmupCount||entry.warmups[kind].some(row=>!row.ready||row.error||row.cleanupErrors?.length)){if(kind==='search'){entry.summary.feedback.pass=false;entry.summary.feedback.status='INVALID';entry.summary.filter.pass=false;entry.summary.filter.status='INVALID';}else{entry.summary[kind].pass=false;entry.summary[kind].status='INVALID';}}
  if(entry.fatalCleanup){entry.pass=false;entry.scroll=entry.payload=entry.stability={status:'NOT RUN',pass:false,reason:'Probe cleanup unverified'};for(const remaining of options.routes.slice(report.routes.length))report.routes.push({route:remaining.route,status:'NOT RUN',pass:false,reason:'Previous probe cleanup unverified'});break;}
  entry.scroll=await scrollInterval(page,route.page200,smoke);entry.maxMountedRows=Math.max(entry.maxMountedRows,entry.scroll.maxMountedRows??0);
  if(entry.scroll.cleanupErrors?.length){entry.pass=false;entry.payload=entry.stability={status:'NOT RUN',pass:false,reason:'Scroll cleanup unverified'};for(const remaining of options.routes.slice(report.routes.length))report.routes.push({route:remaining.route,status:'NOT RUN',pass:false,reason:'Previous scroll cleanup unverified'});break;}
  try{const url=new URL('/workspace-data',route.page100.url);url.search=new URL(route.page100.url).search;url.searchParams.set('route',route.route);const raw=await page.evaluate(readInteractionPayloadResponse,url.href);entry.payload=await page.evaluate(inspectInteractionPayload,{...raw,oracle:route.page100,route:route.route,bodyMarker:options.bodyMarker});}catch(error){entry.payload={pass:false,error:String(error)};}
  entry.stability=await stabilitySequence(page,route);entry.maxMountedRows=Math.max(entry.maxMountedRows,...Object.values(entry.stability.snapshots).map(value=>value.mountedRows??0));entry.pass=!entry.notRun.length&&Object.values(entry.summary).every(summary=>summary.pass)&&entry.scroll.pass&&entry.payload.pass&&entry.stability.pass&&entry.maxMountedRows<=200;
 }
 report.pass=report.routes.length===2&&report.routes.every(route=>route.pass);return report;
}
