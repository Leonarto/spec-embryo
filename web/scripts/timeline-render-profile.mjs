// Current supported DEV runtime; fixed browser-only delta protocol, no IO microbenchmark.
export async function profileTimelineRender(page,{baseURL='http://127.0.0.1:5313'}={}){
 const browser=page.context().browser(),context=await browser.newContext({viewport:{width:1440,height:900}}),nav=[],keys=[],report={startedAt:new Date().toISOString(),runtime:'Supported Node/Vite DEV; exact source/fixture recorded separately',warmups:5,samples:20,nav,keys};let current;
 const summarize=rows=>{const values=rows.filter(r=>!r.warmup).map(r=>r.ms).sort((a,b)=>a-b);if(values.length!==20)return;return{median:(values[9]+values[10])/2,p95:values[18],min:values[0],max:values[19],estimator:'Conventional median; nearest-rank p95 position19/20; no removed samples'};};
 try{
  await page.goto('about:blank');
  await context.addInitScript(()=>{
   window.__timelineNav={start:0,end:0};let scheduled=false;
   const read=()=>{const pane=document.querySelector('.timeline-grid');return{virtual:!!document.querySelector('.timeline-body.virtual'),enhanced:!!document.querySelector('.inspector-layout.enhanced'),count:Number(document.querySelector('.timeline-toolbar h1 span')?.textContent),firstId:pane?.querySelector('.task-id')?.textContent,rows:pane?.querySelectorAll('[data-task-id]').length,visible:document.visibilityState==='visible'};};
   const observer=new MutationObserver(()=>{const s=read();if(scheduled||!s.virtual||!s.enhanced||s.count!==10000||s.firstId!=='TASK-00001')return;scheduled=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__timelineNav.end=performance.now();window.__timelineNav.state=read();observer.disconnect();}));});observer.observe(document,{subtree:true,childList:true,attributes:true});
  });
  for(let n=-5;n<20;n++){
   const p=await context.newPage();current=p;await p.bringToFront();p.setDefaultTimeout(15000);await p.goto(baseURL+'/timeline?timeline_mode=all');await p.waitForFunction(()=>window.__timelineNav?.end>0);
   const row=await p.evaluate(()=>({...window.__timelineNav,ms:window.__timelineNav.end-window.__timelineNav.start,timeOrigin:performance.timeOrigin,navigation:performance.getEntriesByType('navigation')[0]?.toJSON()}));nav.push({n,warmup:n<0,...row});
   if(!row.state.virtual||!row.state.enhanced||row.state.count!==10000||row.state.firstId!=='TASK-00001'||row.state.rows>80||!row.state.visible)throw Error('Invalid hydrated navigation endpoint');
   if(n!==19){await p.close();current=undefined;}
  }
  const p=current,button=p.locator('[data-group-toggle]').first();
  for(let n=-5;n<20;n++){
   await button.focus();await button.evaluate(node=>{
    const group=node.dataset.groupToggle,before=node.getAttribute('aria-expanded'),pane=document.querySelector('.timeline-grid');window.__timelineKey={start:0,end:0,trusted:false,before,group};let scheduled=false;
    const observer=new MutationObserver(()=>{const s=window.__timelineKey,after=node.getAttribute('aria-expanded'),rows=pane.querySelectorAll(`[data-timeline-key^="task:${group}:"]`).length;if(!s.start||scheduled||after===before||rows!==(after==='false'?0:5))return;scheduled=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{s.end=performance.now();s.after=node.getAttribute('aria-expanded');s.groupRows=pane.querySelectorAll(`[data-timeline-key^="task:${group}:"]`).length;observer.disconnect();}));});observer.observe(pane,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-expanded']});window.__timelineKeyObserver=observer;node.addEventListener('keydown',e=>{if(e.key==='Enter'){window.__timelineKey.start=performance.now();window.__timelineKey.trusted=e.isTrusted;}},{capture:true,once:true});
   });
   await button.press('Enter');await p.waitForFunction(()=>window.__timelineKey?.end>0);const row=await p.evaluate(()=>({...window.__timelineKey,ms:window.__timelineKey.end-window.__timelineKey.start}));keys.push({n,warmup:n<0,...row});if(!row.trusted||row.after===row.before||row.groupRows!==(row.after==='false'?0:5))throw Error('Invalid native Enter endpoint');
  }
  report.scroll=await p.evaluate(async()=>{
   if(!PerformanceObserver.supportedEntryTypes.includes('longtask'))throw Error('LongTask observer unsupported');const tasks=[],frames=[],pane=document.querySelector('.timeline-grid'),observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));observer.observe({entryTypes:['longtask']});const start=performance.now(),max=Math.max(1,pane.scrollHeight-pane.clientHeight);
   for(let i=0;i<100;i++){pane.scrollTop=((i+1)*7919)%max;await new Promise(requestAnimationFrame);frames.push({i,at:performance.now(),top:pane.scrollTop,mountedTaskRows:pane.querySelectorAll('[data-task-id]').length,ticks:pane.querySelectorAll('.ruler .tick').length,nonfinite:[...pane.querySelectorAll('[style]')].some(n=>/NaN|Infinity/.test(n.getAttribute('style')))});}
   const end=performance.now();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);observer.disconnect();const captured=tasks.filter(t=>t.start>=start&&t.start<=end),maxLongTask=Math.max(0,...captured.map(t=>t.duration)),maxRows=Math.max(...frames.map(f=>f.mountedTaskRows));return{start,end,method:'100 programmatic scrollTop jumps of(i+1)*7919 modulo scroll range, one frame perjump;2settleframes only for observer delivery. No physical input or AT claim.',frames,longTasks:captured,maxLongTask,maxRows,budgetPass:maxLongTask<=100&&maxRows<=80&&frames.every(f=>f.ticks<=64&&!f.nonfinite)};
  });
 }catch(error){report.invalid=String(error);}
 finally{report.finishedAt=new Date().toISOString();report.navigation=summarize(nav);report.groupToggleEnter=summarize(keys);report.interactionBudgetMs=50;report.interactionPass=!!report.groupToggleEnter&&report.groupToggleEnter.p95<=50;report.navigationScope='Timeline-specific hydrated native navigation; Tasks/Specs800ms gate is not claimed';await context.close();}
 return report;
}
