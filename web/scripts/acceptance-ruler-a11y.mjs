// Focused readonly ruler semantics; no whole-page or performance acceptance.
export async function checkRulerAccessibility(page,{url,axeScriptPath,expectedTicks}){
 const result={url,scope:'Named readonly ruler group, unchanged tick text and affected axe rule'};
 try{await page.goto(url,{waitUntil:'domcontentloaded'});const group=page.getByRole('group',{name:'Relative effort units',exact:true});await group.waitFor({timeout:15000});result.ticks=await group.locator('.tick').allTextContents();result.tabindex=await group.getAttribute('tabindex');result.interactiveChildren=await group.locator('button,input,select,textarea,a[href]').count();
  await page.addScriptTag({path:axeScriptPath});result.axe=await group.evaluate(async element=>{const r=await window.axe.run(element,{runOnly:{type:'rule',values:['aria-prohibited-attr']}});return {version:window.axe.version,violations:r.violations,incomplete:r.incomplete,passes:r.passes.length};});
 }catch(error){result.error=String(error);}
 result.pass=!result.error&&JSON.stringify(result.ticks)===JSON.stringify(expectedTicks)&&result.ticks.length<=64&&result.tabindex===null&&result.interactiveChildren===0&&result.axe?.version==='4.11.4'&&result.axe.violations.length===0&&result.axe.incomplete.length===0;return result;
}
