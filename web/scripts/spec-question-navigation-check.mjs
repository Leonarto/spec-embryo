// Consumer-specific navigation, focus and responsive checks; no generic-grid matrix or timings.
export async function verifyQuestionNavigation(page,{baseURL='http://127.0.0.1:5303',id='SPEC-00011',screenshotRoot}={}){
 const checks=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name);};
 let popup;
 const field=()=>page.locator('.inspector-host textarea').first();
 const keep=async()=>{await page.locator('dialog[open]').waitFor();check('One accessible pending-destination prompt',await page.locator('dialog[open]').count()===1&&await page.locator('#question-leave-destination').innerText()!=='Destination: ');await page.getByRole('button',{name:'Keep editing',exact:true}).click();};
 try{
  page.setDefaultTimeout(10000);await page.setViewportSize({width:1440,height:900});await page.goto(`${baseURL}/specs`);await page.locator('.inspector-layout.enhanced').waitFor();
  const identity=page.getByRole('link',{name:id,exact:true});await identity.focus();await page.keyboard.press('Enter');await field().fill(' exact protected navigation draft ');await field().evaluate(node=>node.dataset.qaOwner='stable-question-owner');await field().focus();
  check('Keyboard row activation opens the shared question editor',new URL(page.url()).searchParams.get('inspect')===`spec:${id}`);
  await page.evaluate(async({id})=>{const url=performance.getEntriesByType('resource').map(x=>x.name).find(x=>x.includes('/runtime/app/navigation.js'));const {goto}=await import(url);await goto(`/specs?inspect=spec:${id}&section=questions&q=Inspector`,{keepFocus:true,noScroll:true});},{id});
  check('Same-entity list filters retain draft and owner without prompting',await page.locator('dialog[open]').count()===0&&await field().inputValue()===' exact protected navigation draft '&&await field().getAttribute('data-qa-owner')==='stable-question-owner');
  await page.getByRole('link',{name:'Document',exact:true}).click();check('Section changes retain the editor',await field().getAttribute('data-qa-owner')==='stable-question-owner'&&await page.locator('dialog[open]').count()===0);
  const relation=page.locator('[data-relation-window=linkedTasks] a[href^="/tasks/"]').first();
  const platform=await page.evaluate(()=>navigator.platform),opened=page.context().waitForEvent('page');await relation.click({modifiers:[platform.includes('Mac')?'Meta':'Control']});popup=await opened;await popup.waitForLoadState('domcontentloaded');
  check('Modified canonical relation opens a tab without disturbing draft',await field().inputValue()===' exact protected navigation draft '&&await page.locator('dialog[open]').count()===0&&new URL(popup.url()).pathname.startsWith('/tasks/'));await popup.close();popup=undefined;
  await relation.click();await keep();check('Relation navigation Keep retains identity',new URL(page.url()).searchParams.get('inspect')===`spec:${id}`);
  await page.getByRole('link',{name:'Next visible entity',exact:true}).click();await keep();check('Next entity Keep retains exact draft',await field().inputValue()===' exact protected navigation draft ');
  await page.locator('.inspector-actions a').filter({hasText:'Open page'}).click();await keep();check('Full-page Keep leaves the drawer intact',new URL(page.url()).pathname==='/specs');
  await page.getByRole('navigation',{name:'Workspace views'}).getByRole('link',{name:'Overview',exact:true}).click();await keep();check('Normal route navigation is guarded',new URL(page.url()).pathname==='/specs'&&await field().getAttribute('data-qa-owner')==='stable-question-owner');
  await field().focus();
  for(const [width,height]of [[1440,900],[1024,768],[390,844]]){await page.setViewportSize({width,height});await page.waitForTimeout(100);check(`Mode change ${width} preserves DOM, input and focus`,await field().getAttribute('data-qa-owner')==='stable-question-owner'&&await field().inputValue()===' exact protected navigation draft '&&await field().evaluate(node=>node===document.activeElement));}
  await page.evaluate(()=>document.documentElement.dataset.theme='dark');if(screenshotRoot)await page.screenshot({path:`${screenshotRoot}/task129-editor-mobile-dark.png`});
  await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>document.documentElement.dataset.theme='light');if(screenshotRoot)await page.screenshot({path:`${screenshotRoot}/task129-editor-desktop-light.png`});
  const label=await field().getAttribute('name');check('Answer controls retain native form names',label==='answer');
  // Native beforeunload is protection only, never a promise of abrupt-close recovery.
  const dialog=page.waitForEvent('dialog');const reload=page.reload().catch(()=>{});const leaving=await dialog;check('Dirty browser reload uses native beforeunload',leaving.type()==='beforeunload');await leaving.dismiss();await reload;
  check('Dismissing browser reload preserves exact draft',await field().inputValue()===' exact protected navigation draft ');
  await page.getByRole('button',{name:'Close inspector',exact:true}).click();await page.getByRole('button',{name:'Discard and continue',exact:true}).click();await page.waitForFunction(()=>!new URL(location.href).searchParams.has('inspect'));
  const result={phase:'navigation-layout',pass:true,checks};await page.evaluate(result=>window.__questionQANavigationResult=result,result);return result;
 }catch(error){const result={phase:'navigation-layout',pass:false,checks,error:String(error),url:page.url()};await page.evaluate(result=>window.__questionQANavigationResult=result,result).catch(()=>{});return result;}finally{await popup?.close().catch(()=>{});}
}

export async function verifyQuestionContrast(page,{baseURL='http://127.0.0.1:5303',id='SPEC-00006',screenshotRoot}={}){
 const checks=[],measurements=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name);};
 const measure=async(selector,pseudo)=>page.locator(selector).first().evaluate((node,{pseudo})=>{
  const style=getComputedStyle(node,pseudo),parse=value=>value.match(/[\d.]+/g).map(Number),fg=parse(style.color);let current=node,bg;
  while(current){const color=parse(getComputedStyle(current).backgroundColor);if(color.length===3||color[3]===1){bg=color;break;}current=current.parentElement;}
  if(!bg)throw Error('No opaque background found');const luminance=rgb=>rgb.slice(0,3).reduce((sum,c,i)=>{c/=255;return sum+(c<=.04045?c/12.92:((c+.055)/1.055)**2.4)*[.2126,.7152,.0722][i];},0),a=luminance(fg),b=luminance(bg);
  return {color:style.color,background:bg.slice(0,3),opacity:style.opacity,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
 },{pseudo});
 try{
  page.setDefaultTimeout(10000);await page.setViewportSize({width:1440,height:900});await page.goto(`${baseURL}/specs`);await page.locator('.inspector-layout.enhanced').waitFor();await page.getByRole('link',{name:id,exact:true}).click();await page.locator('.inspector-host textarea').first().fill(' Synthetic visual verification draft. ');
  for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);const placeholder=await measure('.inspector-host textarea','::placeholder');measurements.push({theme,placeholder});check(`${theme} answer placeholder meets4.5:1`,placeholder.ratio>=4.5,placeholder.ratio);}
  if(screenshotRoot){await page.setViewportSize({width:390,height:844});await page.locator('.inspector-host textarea').first().focus();await page.screenshot({path:`${screenshotRoot}/task129-editor-mobile-dark.png`});await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>document.documentElement.dataset.theme='light');await page.locator('.inspector-host textarea').first().focus();await page.screenshot({path:`${screenshotRoot}/task129-editor-desktop-light.png`});}
  await page.getByRole('button',{name:'Save answered questions',exact:true}).click();await page.getByText('1 question resolved',{exact:true}).waitFor();
  for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);const success=await measure('.feedback.success');measurements.push({theme,success});check(`${theme} confirmed success meets4.5:1`,success.ratio>=4.5,success.ratio);}
  await page.locator('.inspector-host textarea').first().fill(' Keep this synthetic answer until choosing. ');await page.getByRole('button',{name:'Close inspector',exact:true}).click();await page.locator('dialog[open]').waitFor();
  const backdrop=await page.locator('dialog[open]').evaluate(node=>getComputedStyle(node,'::backdrop').backgroundColor);check('Native dialog uses the existing host backdrop',backdrop==='rgba(0, 0, 0, 0.533)',backdrop);
  if(screenshotRoot)await page.screenshot({path:`${screenshotRoot}/task129-question-dialog-dark.png`});await page.getByRole('button',{name:'Keep editing',exact:true}).click();await page.getByRole('button',{name:'Close inspector',exact:true}).click();await page.getByRole('button',{name:'Discard and continue',exact:true}).click();await page.waitForFunction(()=>!new URL(location.href).searchParams.has('inspect'));
  return {phase:'question-contrast',pass:true,checks,measurements};
 }catch(error){return {phase:'question-contrast',pass:false,checks,measurements,error:String(error),url:page.url()};}
}
