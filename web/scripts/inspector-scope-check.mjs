// Functional metadata/link probes only; no latency, mutation or question-guard claim.
export async function verifyInspectorScope(page,{baseURL='http://127.0.0.1:5301',phase='all'}={}){
  const report={capturedAt:new Date().toISOString(),scope:'Combined working tree: committed138/140 plus approved130 overlay/seam. Only traversal-scope labels and same-inspect relation intent; no129 guard/performance acceptance.',checks:[]};
  const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name);};
  const task='TASK-00001',spec='SPEC-00001';
  const context=await page.context().browser().newContext({viewport:{width:1440,height:900}});
  try{
    const p=await context.newPage();
    if(phase==='all'){
    await p.goto(`${baseURL}/timeline?timeline_mode=all&selected_task=${task}&inspect=task:${task}&section=relations&rel.blockingTasks=2`);
    await p.waitForSelector('.timeline-body.virtual');await p.waitForSelector('.inspector-reader .detail-shell');
    check('Visible expanded task has traversal and no absence banner',await p.locator('.outside').count()===0&&await p.getByRole('link',{name:'Next visible entity',exact:true}).count()===1);
    const reader=await p.locator('.inspector-reader .detail-shell').elementHandle(),key=await p.locator(`.timeline-grid [data-task-id="${task}"]`).getAttribute('data-timeline-key'),group=key.split(':')[1],toggle=p.locator(`[data-group-toggle="${group}"]`);
    await toggle.click();await p.locator('.outside').filter({hasText:'Outside expanded results'}).waitFor();
    check('Collapsed inspected group uses expanded-results label and disables traversal',await p.locator('.outside').innerText()==='Outside expanded results · Previous/next unavailable'&&await p.getByRole('link',{name:'Next visible entity',exact:true}).count()===0);
    check('Collapse retains reader node, trace, inspection and relation page',await reader.evaluate(node=>node.isConnected)&&new URL(p.url()).searchParams.get('selected_task')===task&&new URL(p.url()).searchParams.get('inspect')===`task:${task}`&&new URL(p.url()).searchParams.get('rel.blockingTasks')==='2');
    await toggle.click();await p.waitForFunction(()=>!document.querySelector('.outside'));
    const next=p.getByRole('link',{name:'Next visible entity',exact:true}),before=await next.getAttribute('href');await p.locator('.timeline-grid').evaluate(node=>node.scrollTop=180_000);await p.waitForTimeout(60);
    check('Re-expansion restores traversal and virtual scrolling does not change logical Next',await reader.evaluate(node=>node.isConnected)&&await next.getAttribute('href')===before);
    await next.click();await p.waitForFunction(id=>new URL(location.href).searchParams.get('inspect')!==`task:${id}`,task);
    check('Inspector Next across virtual window keeps trace and clears old-entity relation intent',new URL(p.url()).searchParams.get('selected_task')===task&&!new URL(p.url()).searchParams.has('rel.blockingTasks'));

    await p.goto(`${baseURL}/timeline?timeline_mode=all&selected_task=${task}&simple=1&page=2&inspect=task:${task}&section=relations&rel.blockingTasks=2`);
    await p.waitForSelector('.table-scroll');await p.locator('.outside').filter({hasText:'Outside this page of results'}).waitFor();
    check('Simple Timeline uses effective-page label rather than expanded label',await p.locator('.outside').innerText()==='Outside this page of results · Previous/next unavailable');
    const links=[p.getByRole('link',{name:'Clear trace',exact:true}),p.getByRole('link',{name:'Visual timeline',exact:true}),p.getByRole('link',{name:'Active only',exact:true}),p.locator('.timeline-pager a').filter({hasText:/^Next$/}),p.locator('.timeline-pager a').filter({hasText:/^50$/}),p.locator('.table-scroll td:last-child a').first()];
    for(let i=0;i<links.length;i++){
      const url=new URL(await links[i].getAttribute('href'),baseURL);
      check(`Timeline builder${i+1} retains same inspect/section/allowlisted relation page`,url.searchParams.get('inspect')===`task:${task}`&&url.searchParams.get('section')==='relations'&&url.searchParams.get('rel.blockingTasks')==='2');
    }
    await p.locator('.timeline-pager a').filter({hasText:/^Next$/}).click();await p.waitForURL(/page=3/);
    check('Real Timeline page activation preserves relation intent',new URL(p.url()).searchParams.get('rel.blockingTasks')==='2'&&new URL(p.url()).searchParams.get('inspect')===`task:${task}`);
    await p.getByRole('link',{name:'Visual timeline',exact:true}).click();await p.waitForSelector('.timeline-body.virtual');await p.waitForFunction(()=>!document.querySelector('.outside'));
    check('Switch to visual recomputes expanded registration reactively',await p.getByRole('link',{name:'Next visible entity',exact:true}).count()===1&&new URL(p.url()).searchParams.get('rel.blockingTasks')==='2');

    }
    for(const [route,kind,id]of (phase==='all'?[['tasks','task',task],['specs','spec',spec]]:[['specs','spec',spec]])){
      await p.goto(`${baseURL}/${route}?sort=id.asc&page=2&inspect=${kind}:${id}`);await p.waitForSelector('table[role=grid]');await p.locator('.outside').waitFor();
      // Specs has no list registration before TASK129; this is observed baseline, not a missing seam.
      check(`${route}: ${route==='tasks'?'default page registration':'unregistered context'} wording`,await p.locator('.outside').innerText()===(route==='tasks'?'Outside this page of results · Previous/next unavailable':'Previous/next unavailable in this view'));
    }
    await p.goto(`${baseURL}/timeline?timeline_mode=all&inspect=spec:${spec}`);await p.waitForSelector('.timeline-grid');await p.locator('.outside').waitFor();
    check('Incomparable Timeline kind retains unavailable-in-view wording',await p.locator('.outside').innerText()==='Previous/next unavailable in this view');

    const nativeContext=await page.context().browser().newContext({javaScriptEnabled:false});
    try{const native=await nativeContext.newPage();await native.goto(`${baseURL}/timeline?timeline_mode=all&selected_task=${task}&simple=1&page=2&inspect=task:${task}&section=relations&rel.blockingTasks=2`);await native.locator('.timeline-pager a').filter({hasText:/^Next$/}).click();const params=new URL(native.url()).searchParams;check('No-JS GET pager retains inspect/section/relation/trace',params.get('page')==='3'&&params.get('inspect')===`task:${task}`&&params.get('section')==='relations'&&params.get('rel.blockingTasks')==='2'&&params.get('selected_task')===task);}finally{await nativeContext.close();}
  }catch(error){report.error=error instanceof Error?error.stack:String(error);}
  finally{await context.close();}
  return report;
}
