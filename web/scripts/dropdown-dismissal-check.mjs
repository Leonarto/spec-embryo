// Serial shared-helper regression over the committed Tasks consumer, no Specs table dependency.
export async function verifyDropdownDismissal(page,{baseURL='http://127.0.0.1:5292'}={}){
  const report={capturedAt:new Date().toISOString(),browser:page.context().browser().version(),checks:[]};
  const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});if(!pass)throw new Error(name);};
  const setup=async(p,kind)=>{
    await p.goto(`${baseURL}/tasks?scope=all&page=2&pageSize=50&sort=id.asc`);await p.locator('table[role=grid]').waitFor();
    await p.evaluate(()=>{window.__submitCount=0;document.querySelector('#workspace-filters').addEventListener('submit',()=>window.__submitCount++);});
    await p.locator('summary').filter({hasText:/^Filters/}).click();const summary=p.locator('summary').filter({hasText:kind==='select'?/Archive scope/:/Status/}).first();await summary.click();return summary;
  };
  const input=(p,kind)=>p.locator(kind==='select'?'input[name=scope][value=archived]':'input[name=status][value=review]');
  const result=async(p,kind)=>{const params=new URL(p.url()).searchParams;const envelope=await p.evaluate(async()=>await(await fetch('/workspace-data?route=tasks&'+location.search.slice(1))).json());return {params:[...params],submits:await p.evaluate(()=>window.__submitCount),scope:envelope.data.result.normalizedQuery.scope,status:envelope.data.result.normalizedQuery.statuses,page:envelope.data.result.page,total:envelope.data.result.totalMatching};};
  try{
    await page.setViewportSize({width:1440,height:900});
    for(const kind of ['select','multi'])for(const mode of ['mouse','keyboard-enter','keyboard-space']){
      const summary=await setup(page,kind),control=input(page,kind);
      if(mode==='mouse')await page.locator('label').filter({has:control}).click();else{await control.focus();await page.keyboard.press('Space');}
      check(`${kind}/${mode}: selection stays open before Apply`,await summary.evaluate(node=>node.parentElement.open));
      const form=await page.locator('#workspace-filters').evaluate(form=>Array.from(new FormData(form)));const key=kind==='select'?'scope':'status',value=kind==='select'?'archived':'review';check(`${kind}/${mode}: successful controls are unique`,form.filter(([name])=>name===key).length===1&&form.find(([name])=>name===key)?.[1]===value);
      const apply=page.getByRole('button',{name:'Apply filters',exact:true});if(mode==='mouse')await apply.click();else{await apply.focus();await page.keyboard.press(mode==='keyboard-enter'?'Enter':'Space');}
      await page.waitForURL(url=>url.searchParams.get('page')==='1'&&url.searchParams.get(key)===value,{timeout:5000});const state=await result(page,kind);
      check(`${kind}/${mode}: first activation submits once with intended query/payload`,state.submits===1&&state.page===1&&state.total===200&&(kind==='select'?state.scope==='archived':state.status.join(',')==='review'),state);
    }
    for(const kind of ['select','multi']){
      const summary=await setup(page,kind);await input(page,kind).focus();await page.keyboard.press('Space');await page.evaluate(()=>{window.__escapeDefault=[];document.addEventListener('keydown',event=>{if(event.key==='Escape')window.__escapeDefault.push(event.defaultPrevented);});});await page.keyboard.press('Escape');const escaped=await summary.evaluate(node=>!node.parentElement.open&&node===document.activeElement)&&await page.locator('summary').filter({hasText:/^Filters/}).evaluate(node=>node.parentElement.open);check(`${kind}: first Escape only closes inner and focuses its summary`,escaped);check(`${kind}: Escape is defaultPrevented at host and draft remains intact`,await page.evaluate(()=>window.__escapeDefault.at(-1))===true&&await input(page,kind).isChecked()===true);await page.keyboard.press('Escape');check(`${kind}: second Escape closes Filters and focuses outer summary`,await page.locator('summary').filter({hasText:/^Filters/}).evaluate(node=>!node.parentElement.open&&node===document.activeElement));
      await setup(page,kind);await page.locator('input[name=priority]').evaluate(node=>{window.__destinationClicks=0;node.addEventListener('click',()=>window.__destinationClicks++);});await page.locator('input[name=priority]').click();check(`${kind}: outside destination acts once after dropdown dismissal`,await page.evaluate(()=>window.__destinationClicks)===1&&await summary.evaluate(node=>!node.parentElement.open)&&await page.locator('input[name=priority]').evaluate(node=>node===document.activeElement));
    }
    const touch=await page.context().browser().newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
    try{const p=await touch.newPage();
      for(const kind of ['select','multi']){
        const summary=await setup(p,kind),control=input(p,kind);await p.locator('label').filter({has:control}).tap();check(`${kind}/touch: chosen dropdown remains open`,await summary.evaluate(node=>node.parentElement.open));await p.getByRole('button',{name:'Apply filters',exact:true}).tap();const key=kind==='select'?'scope':'status',value=kind==='select'?'archived':'review';await p.waitForURL(url=>url.searchParams.get('page')==='1'&&url.searchParams.get(key)===value,{timeout:5000});const state=await result(p,kind);check(`${kind}/touch: first tap Apply submits once`,state.submits===1&&state.page===1&&state.total===200,state);
      }
      await setup(p,'select');await p.locator('summary').filter({hasText:/Archive scope/}).click();const specs=p.locator('summary').filter({hasText:/Specs/}).first();await specs.tap();
      const list=specs.locator('..').locator('.option-list');await list.evaluate(node=>{node.scrollTop=0;window.__pointerCancels=0;document.addEventListener('pointercancel',()=>window.__pointerCancels++);});const box=await list.boundingBox();const cdp=await touch.newCDPSession(p);const x=Math.round(box.x+box.width/2),y=Math.round(Math.min(box.y+100,760));
      await cdp.send('Input.synthesizeScrollGesture',{x,y,yDistance:-160,speed:500,gestureSourceType:'touch'});await p.waitForTimeout(100);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await p.waitForTimeout(100);
      const scrolling={scrollTop:await list.evaluate(node=>node.scrollTop),pointerCancels:await p.evaluate(()=>window.__pointerCancels),open:await specs.evaluate(node=>node.parentElement.open)};check('Touch scroll/pointercancel preserves an open dropdown without a click',scrolling.open&&scrolling.pointerCancels>=1&&scrolling.scrollTop>0,scrolling);await cdp.detach();
    }finally{await touch.close();}
  }catch(error){report.error=String(error);}report.pass=!report.error&&report.checks.every(check=>check.pass);return report;
}
