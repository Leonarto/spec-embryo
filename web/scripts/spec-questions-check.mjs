// Synthetic fixtures only. No private drafts, browser storage, models or alternate product writes.
// Run each phase on fresh spec IDs produced by spec-questions-fixture.ts.
export async function verifyQuestionSmoke(page,{baseURL='http://127.0.0.1:5303',id='SPEC-00009',startupTimeoutMs=30000}={}){
 const checks=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name);};
 const field=()=>page.locator('.inspector-host textarea[name=answer]');
 try{
  page.setDefaultTimeout(10000);await page.goto(`${baseURL}/specs`,{timeout:startupTimeoutMs});await page.locator('.inspector-layout.enhanced').waitFor();
  await page.getByRole('link',{name:id,exact:true}).click();await field().first().fill(' synthetic saved answer ');await field().nth(1).fill('  ');
  await page.getByRole('button',{name:'Close inspector',exact:true}).click();await page.locator('dialog[open]').waitFor();
  check('Keep editing is the confirmation default',await page.getByRole('button',{name:'Keep editing',exact:true}).evaluate(n=>n===document.activeElement));
  await page.keyboard.press('Escape');check('Escape keeps exact drafts',await field().first().inputValue()===' synthetic saved answer '&&await field().nth(1).inputValue()==='  ');
  let posts=0;const count=r=>{if(r.method()==='POST'&&r.url().includes('answerOpenQuestions'))posts++;};page.on('request',count);
  try{await page.getByRole('button',{name:'Save answered questions',exact:true}).dblclick();await page.getByText('1 question resolved',{exact:true}).waitFor();check('One in-flight POST for double activation',posts===1,posts);}finally{page.off('request',count);}
  check('Unresolved whitespace stays visible',await field().count()===1&&await field().first().inputValue()==='  ');
  await page.getByRole('button',{name:'Close inspector',exact:true}).click();await page.locator('dialog[open]').waitFor();
  check('Unresolved whitespace still guards navigation',await page.locator('dialog[open]').count()===1);
  await page.getByRole('button',{name:'Keep editing',exact:true}).click();await field().first().fill('');
  await page.getByRole('button',{name:'Close inspector',exact:true}).click();await page.waitForFunction(()=>!new URL(location.href).searchParams.has('inspect'));
  check('Returning to baseline is clean',await page.locator('dialog[open]').count()===0);
  await page.getByRole('link',{name:id,exact:true}).click();await field().first().waitFor();check('Reopening fenced identity loads current questions',await field().count()===1);
  const match=url=>url.pathname===`/specs/${id}`&&url.search.includes('answerOpenQuestions');let writes=0;
  const drop=async route=>{if(route.request().method()!=='POST'){await route.continue();return;}writes++;await route.fetch();await route.abort('failed');};
  await page.route(match,drop);
  try{await field().first().fill(' synthetic ambiguous answer ');await page.getByRole('button',{name:'Save answered questions',exact:true}).click();await page.getByText('Save outcome not confirmed',{exact:true}).waitFor();await page.getByRole('button',{name:'Review current version',exact:true}).waitFor();check('Transport ambiguity keeps draft without retry',writes===1&&await field().first().inputValue()===' synthetic ambiguous answer '&&await page.getByRole('button',{name:'Save answered questions',exact:true}).isDisabled());}
  finally{await page.unroute(match,drop);}
  await page.getByRole('button',{name:'Review current version',exact:true}).click();check('Review retains unmatched answers as recovery',(await page.locator('.recovery').innerText()).includes(' synthetic ambiguous answer '));
  await page.getByRole('button',{name:'Close inspector',exact:true}).click();await page.getByRole('button',{name:'Save and continue',exact:true}).click();await page.getByText('Answers were not fully saved. Review errors and recovered answers before leaving.',{exact:true}).waitFor();check('Save and continue cannot abandon recovery',new URL(page.url()).searchParams.has('inspect'));
  await page.getByRole('button',{name:'Discard and continue',exact:true}).click();await page.waitForFunction(()=>!new URL(location.href).searchParams.has('inspect'));
  return {phase:'smoke',pass:true,checks};
 }catch(error){return {phase:'smoke',pass:false,checks,error:String(error),url:page.url()};}
}

// Runtime copy injects failing optional context + failing shared POST source only.
// Root layout, canonical load/render, writer and normal GET remain unchanged.
export async function verifyQuestionPostReadFailure(page,{baseURL='http://127.0.0.1:5304',saveId='SPEC-00010',blankId='SPEC-00011'}={}){
 const checks=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name);};
 const context=await page.context().browser().newContext({javaScriptEnabled:false});const p=await context.newPage();p.setDefaultTimeout(12000);
 const submit=async button=>{const [response]=await Promise.all([p.waitForResponse(r=>r.request().method()==='POST'),button.click()]);return response;};
 try{
  await p.goto(`${baseURL}/specs/${blankId}`);await p.locator('textarea').first().fill('  ');const bad=await submit(p.getByRole('button',{name:'Save answered questions',exact:true}));
  check('Native400 preserves exact whitespace when all reads fail',bad.status()===400&&(await p.locator('main.answer-recovery pre').first().textContent())==='  '&&await p.locator('.inspector-layout').count()===0);
  await p.goto(`${baseURL}/specs/${saveId}`);await p.locator('textarea').first().fill(' exact stale draft ');
  const other=await p.request.post(`${baseURL}/specs/${saveId}?/answerOpenQuestions`,{headers:{origin:baseURL},form:{question:'Second durable question?',answer:'Other fixture actor resolved this.'}});check('Concurrent fixture actor uses the canonical action',other.status()===200);
  const stale=await submit(p.getByRole('button',{name:'Save answered questions',exact:true}));check('Native409 echoes drafts through persistent load failure',stale.status()===409&&(await p.locator('main.answer-recovery').innerText()).includes(' exact stale draft ')&&await p.locator('form').count()===0);
  await p.goto(`${baseURL}/specs/${saveId}`);await p.locator('textarea').first().fill(' exact confirmed value ');const success=await submit(p.getByRole('button',{name:'Save answered questions',exact:true}));
  check('Confirmed write stays200 with minimal saved view',success.status()===200&&(await p.locator('main.answer-recovery').innerText()).includes('Answers were saved.')&&await p.locator('form').count()===0&&await p.locator('.inspector-layout').count()===0);
  const current=await(await p.request.get(`${baseURL}/workspace-detail?kind=spec&id=${saveId}`)).json();check('Independent GET sees committed bytes',current.detail.found&&current.detail.openQuestions.length===0);
  await p.goto(`${baseURL}/specs`);await p.setContent(`<form method="POST" action="${baseURL}/specs/SPEC-MISSING?/answerOpenQuestions"><input name="question" value="Removed fixture question?"><textarea name="answer"> exact missing draft </textarea><button type="submit">Submit missing fixture</button></form>`);
  const missing=await submit(p.getByRole('button',{name:'Submit missing fixture'}));check('Native404 preserves missing-target recovery',missing.status()===404&&(await p.locator('main.answer-recovery').innerText()).includes(' exact missing draft ')&&await p.locator('form').count()===0);
  const get=await p.goto(`${baseURL}/specs/SPEC-MISSING`);check('Ordinary GET missing remains404 without POST fallback',get.status()===404&&await p.locator('main.answer-recovery').count()===0);
  return {phase:'post-read-failure',pass:true,checks};
 }catch(error){return {phase:'post-read-failure',pass:false,checks,error:String(error),url:p.url()};}finally{await context.close();}
}
