export async function diagnosticNetwork(page){
 const origin='http://127.0.0.1:5297',requests=[],active=new Set(),records=new Map();let stage='bootstrap',peak=0,apiPeak=0;
 const isAPI=url=>/\/(workspace-(detail|relations|data|options)|.*__data\.json)/.test(new URL(url).pathname);
 const start=request=>{if(new URL(request.url()).origin!==origin)return;const record={stage,url:request.url(),method:request.method(),type:request.resourceType(),start:Date.now()};records.set(request,record);requests.push(record);active.add(request);peak=Math.max(peak,active.size);apiPeak=Math.max(apiPeak,[...active].filter(request=>isAPI(request.url())).length);};
 const end=request=>{const record=records.get(request);if(record){record.end=Date.now();record.abort=request.failure()?.errorText??null;}active.delete(request);};
 const response=async response=>{const record=records.get(response.request());if(record){record.status=response.status();record.serverRequest=(await response.allHeaders())['x-spm-diagnostic-request']??null;}};
 page.on('request',start);page.on('requestfinished',end);page.on('requestfailed',end);page.on('response',response);
 const samples=[];try{await page.setViewportSize({width:1440,height:900});await page.goto(origin+'/tasks?sort=id.asc&scope=all');await page.waitForFunction(()=>document.querySelector('.inspector-layout')?.classList.contains('enhanced'));
 const task=()=>page.locator('tr[data-entity-id=TASK-00001] a').first();
 async function openTask(){await task().click();await page.waitForFunction(()=>document.querySelectorAll('[data-relation-window=blockingTasks] [data-relation-item]').length===100);}
 for(const kind of ['task','spec'])for(let n=-3;n<5;n++){
  stage=`${kind}:${n}:prepare`;if(kind==='spec')await openTask();const anchor=kind==='task'?task():page.locator('.inspector-reader a[href="/specs/SPEC-00001"]');stage=`${kind}:${n}:prehover`;const from=requests.length,begin=Date.now();await anchor.scrollIntoViewIfNeeded();await anchor.hover();stage=`${kind}:${n}:click`;await anchor.click();const name=kind==='task'?'blockingTasks':'linkedTasks';await page.waitForFunction(name=>document.querySelectorAll(`[data-relation-window=${name}] [data-relation-item]`).length===100,name);stage=`${kind}:${n}:close`;await page.getByRole('button',{name:'Close inspector',exact:true}).click();await page.waitForFunction(()=>!new URL(location.href).searchParams.has('inspect'));await page.waitForTimeout(100);samples.push({kind,n,warmup:n<0,begin,end:Date.now(),requestFrom:from,requestTo:requests.length,remaining:active.size});
 }
 await page.waitForTimeout(150);return {scope:'Exploratory counts-only copy;3warm/5serial perkind. All same-origin request start/end/abort from prehover through afterclose; includes bootstrap and Spec preparation requests. No acceptance/p95 claim.',requests,samples,maxSameOriginInFlight:peak,maxAPIInFlight:apiPeak,remaining:active.size};
 }finally{page.off('request',start);page.off('requestfinished',end);page.off('requestfailed',end);page.off('response',response);}
}
