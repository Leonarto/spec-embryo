// Actual browser Back/Forward; test-only holding of our restoration makes the race deterministic.
// Public Kit pushState + opaque PageState only. No private router history keys.
export async function verifyQuestionHistory(page,{baseURL='http://127.0.0.1:5303',id='SPEC-00012',holdRestoration=false,choice='keep'}={}){
 const checks=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name);};
 try{
  page.setDefaultTimeout(10000);await page.goto(`${baseURL}/specs`);await page.locator('.inspector-layout.enhanced').waitFor();
  await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(x=>x.name).find(x=>x.includes('/runtime/app/navigation.js'));if(!url)throw Error('Public navigation module timing entry unavailable');const {pushState}=await import(url);pushState('/specs?qaProbe=D',{qa:'D'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));pushState('/specs?qaProbe=C',{qa:'C'});});
  await page.getByRole('link',{name:id,exact:true}).click();await page.locator('.inspector-host textarea').first().fill(' exact rapid history draft ');const accepted=page.url();
  if(holdRestoration)await page.evaluate(()=>{window.__questionQAGo=history.go.bind(history);window.__questionQAHeld=[];window.__questionQAPops=[];window.__questionQAReplace=history.replaceState.bind(history);history.replaceState=function(state,unused,url){window.__questionQAPops.push(location.href);return window.__questionQAReplace(state,unused,url);};window.__questionQAPop=()=>window.__questionQAPops.push(location.href);addEventListener('popstate',window.__questionQAPop,true);history.go=function(delta){if(delta===1){window.__questionQAHeld.push(delta);return;}return window.__questionQAGo(delta);};});
  await page.goBack();await page.locator('dialog[open]').waitFor();
  if(holdRestoration){
   check('Owned restoration was held without changing browser Back',await page.evaluate(()=>window.__questionQAHeld.length===1));
   await page.goBack();await page.waitForTimeout(100);const events=await page.evaluate(()=>window.__questionQAPops);check('Second different target is observable',events.some(url=>new URL(url).searchParams.get('qaProbe')==='D'),{events,repairedURL:page.url()});
   await page.evaluate(()=>{history.go=window.__questionQAGo;window.__questionQAGo(1);});
   await page.waitForTimeout(200);
   const destination=await page.locator('#question-leave-destination').innerText(),target=new URL(destination.replace(/^Destination: /,''),baseURL).href;
   check('Confirmation names its latest destination accessibly',await page.locator('dialog[open]').getAttribute('aria-describedby')==='question-leave-destination',destination);
   check('Draft remains exact before resolving the coalesced transition',await page.locator('.inspector-host textarea').first().inputValue()===' exact rapid history draft ');
   await page.getByRole('button',{name:choice==='save'?'Save and continue':choice==='discard'?'Discard and continue':'Keep editing',exact:true}).click();
   if(choice==='keep')check('Keep editing restores accepted URL after a changed pending target',page.url()===accepted,{accepted,actual:page.url()});
   else{await page.waitForFunction(expected=>location.href===expected,target);check('Only the latest observed destination replays',page.url()===target,{target,actual:page.url()});return {phase:'changed-restoration-target',choice,pass:true,checks};}
  }else{
   check('Owned Back restores URL before the choice',page.url()===accepted);
   await page.getByRole('button',{name:'Keep editing',exact:true}).click();
   await page.evaluate(()=>{history.back();setTimeout(()=>history.forward(),0);setTimeout(()=>history.back(),5);});await page.locator('dialog[open]').waitFor();
   check('Rapid burst coalesces to one confirmation',await page.locator('dialog[open]').count()===1);
   await page.getByRole('button',{name:'Keep editing',exact:true}).click();
  }
  check('History preserves exact draft',await page.locator('.inspector-host textarea').first().inputValue()===' exact rapid history draft ');
  await page.getByRole('button',{name:'Close inspector',exact:true}).click();await page.getByRole('button',{name:'Discard and continue',exact:true}).click();await page.waitForFunction(()=>!new URL(location.href).searchParams.has('inspect'));
  return {phase:holdRestoration?'changed-restoration-target':'native-history',pass:true,checks};
 }catch(error){return {phase:holdRestoration?'changed-restoration-target':'native-history',pass:false,checks,error:String(error),url:page.url()};}
 finally{await page.evaluate(()=>{if(window.__questionQAGo){history.go=window.__questionQAGo;if(window.__questionQAReplace)history.replaceState=window.__questionQAReplace;delete window.__questionQAReplace;delete window.__questionQAGo;delete window.__questionQAHeld;if(window.__questionQAPop)removeEventListener('popstate',window.__questionQAPop,true);delete window.__questionQAPop;delete window.__questionQAPops;}}).catch(()=>{});}
}
