// Actual trusted click -> accepted100-row reader -> two animation frames. Coordinate a quiet lease.
export async function profileDetailReaders(page,{baseURL='http://127.0.0.1:5295'}={}){
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
