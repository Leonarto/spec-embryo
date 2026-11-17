// Focused role regression only; no latency or whole-page accessibility credit.
export async function checkMermaidAccessibility(page,{url,axeScriptPath}){
 const result={url,scope:'Rendered diagram zoom group: aria-prohibited-attr and native Tab/button activation',steps:[]};let group;
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});group=page.getByRole('group',{name:'Diagram zoom controls',exact:true});await group.waitFor({timeout:15000});
  await page.addScriptTag({path:axeScriptPath});result.axe=await group.evaluate(async element=>{const report=await window.axe.run(element,{runOnly:{type:'rule',values:['aria-prohibited-attr']}});return {version:window.axe.version,violations:report.violations,incomplete:report.incomplete,passes:report.passes.length};});
  const out=group.getByRole('button',{name:'Zoom out',exact:true}),reset=group.getByRole('button',{name:'Reset zoom',exact:true});
  await reset.click();await out.focus();await page.keyboard.press('Tab');result.steps.push({name:'Tab out to reset',pass:await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')==='Reset zoom')});
  await page.keyboard.press('Tab');result.steps.push({name:'Tab reset to in',pass:await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')==='Zoom in')});
  await page.keyboard.press('Enter');result.steps.push({name:'Enter activates zoom in',value:await reset.innerText(),pass:(await reset.innerText()).trim()==='120%'});
  await page.keyboard.press('Shift+Tab');await page.keyboard.press('Space');result.steps.push({name:'Space activates reset',value:await reset.innerText(),pass:(await reset.innerText()).trim()==='100%'});
  await page.keyboard.press('Shift+Tab');await page.keyboard.press('Enter');result.steps.push({name:'Enter activates zoom out',value:await reset.innerText(),pass:(await reset.innerText()).trim()==='80%'});
 }catch(error){result.error=String(error);}
 if(group)try{await group.getByRole('button',{name:'Reset zoom',exact:true}).click({timeout:2000});}catch(error){result.cleanupErrors=[String(error)];}
 result.pass=!result.error&&!result.cleanupErrors?.length&&result.axe?.version==='4.11.4'&&result.axe.violations.length===0&&result.axe.incomplete.length===0&&result.steps.length===5&&result.steps.every(step=>step.pass);return result;
}
