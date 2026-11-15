// Focused P3 checks; takes a supplied Playwright page. Fixtures remain read-only.
export async function verifyTaskTable(page,{baseURL='http://localhost:5188',evidenceDir,phase='core',axePath,isolated=false}={}){
  if(phase==='layouts'&&!isolated){const context=await page.context().browser().newContext({viewport:{width:1440,height:900}});try{return await verifyTaskTable(await context.newPage(),{baseURL,evidenceDir,phase,axePath,isolated:true});}finally{await context.close();}}
  const report={phase,capturedAt:new Date().toISOString(),browser:page.context().browser().version(),checks:[]};
  const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});if(!pass)throw new Error(name);};
  const visit=async(query='pageSize=200&sort=id.asc')=>{await page.goto(`${baseURL}/tasks?${query}`);await page.waitForSelector('table[role=grid]');};
  const current=()=>page.evaluate(()=>({row:document.activeElement?.dataset.rowKey,column:document.activeElement?.dataset.columnKey}));
  const selected=()=>page.locator('.selection-bar strong').innerText();
  const open=async label=>{const trigger=page.locator('summary').filter({hasText:new RegExp(`^${label}`)}).first();await trigger.focus();await page.keyboard.press('Enter');};
  const escape=()=>page.keyboard.press('Escape');
  try {
    await page.setViewportSize({width:1440,height:900});
    if(phase==='review-fixes'){
      await visit();const checkbox=page.locator('tbody tr').first().locator('input');await checkbox.focus();await page.keyboard.press('Enter');check('Row Enter selects once',await selected()==='1 selected');await page.keyboard.press('Enter');check('Row Enter clears once',await selected()==='0 selected');await page.keyboard.press('Space');check('Native row Space still toggles once',await selected()==='1 selected');await page.keyboard.press('ArrowDown');await page.keyboard.press('Shift+Space');check('Shift+Space still extends inclusive range',await selected()==='2 selected');
      await page.keyboard.press('Control+Home');await page.keyboard.press('Enter');check('Header Enter selects this page once',await selected()==='200 selected');await page.keyboard.press('Enter');check('Header Enter clears this page once',await selected()==='0 selected');await page.keyboard.press('Space');check('Native header Space still toggles once',await selected()==='200 selected');
      await page.goto(`${baseURL}/tasks?simple=1&pageSize=50`);await page.waitForSelector('tbody input');await page.locator('tbody input').first().focus();await page.keyboard.press('Enter');check('Simple mode retains native Enter checkbox behavior',await selected()==='0 selected'&&await page.locator('table[role=grid]').count()===0);await page.keyboard.press('Space');check('Simple mode retains native Space checkbox behavior',await selected()==='1 selected');
      const context=await page.context().browser().newContext({javaScriptEnabled:false,viewport:{width:1280,height:720}});
      try{const native=await context.newPage();await native.goto(`${baseURL}/tasks?pageSize=50`);check('No-JS preset is readable text without inert select',await native.locator('select[aria-label="View preset"]').count()===0&&(await native.locator('.preset').innerText()).includes('Not archived'));
        await native.locator('summary').filter({hasText:/^Filters/}).click();await native.locator('summary').filter({hasText:/Status/}).click();await native.locator('label').filter({has:native.locator('input[name="status"][value="blocked"]')}).click();await native.getByRole('button',{name:'Apply filters',exact:true}).click();check('No-JS status GET remains operable',new URL(native.url()).searchParams.getAll('status').includes('blocked')&&await native.locator('tbody tr').count()>0&&await native.locator('td[data-column=status]').evaluateAll(nodes=>nodes.every(node=>node.textContent.includes('Blocked'))));
        await native.locator('summary').filter({hasText:/^Filters/}).click();await native.locator('summary').filter({hasText:/Archive scope/}).click();await native.locator('label').filter({has:native.locator('input[name="scope"][value="all"]')}).click();await native.getByRole('button',{name:'Apply filters',exact:true}).click();check('No-JS scope GET remains operable',new URL(native.url()).searchParams.get('scope')==='all');if(evidenceDir)await native.screenshot({path:`${evidenceDir}/task127-no-js.png`});
      }finally{await context.close();}
    }
    if(phase==='core'){
      await visit();const ids=await page.locator('tbody tr').evaluateAll(nodes=>nodes.map(node=>node.dataset.entityId));
      check('10k fixture renders at most 200 rows',ids.length===200&&await page.locator('.range').innerText()==='1–200 of 10000');
      check('Grid has exactly one tab target',await page.locator('table [tabindex="0"]').count()===1);
      await page.locator('tbody tr').first().locator('a').first().focus();
      await page.keyboard.press('ArrowRight');check('Right moves to title without selecting',(await current()).column==='title'&&await selected()==='0 selected');
      await page.keyboard.press('Space');check('Space on identity does not select',await selected()==='0 selected');
      await page.keyboard.press('Home');await page.keyboard.press('Space');check('Native checkbox toggles once',await selected()==='1 selected');
      await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Shift+Space');check('Shift+Space selects inclusive visible range',await selected()==='3 selected');
      await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');check('Arrow focus leaves selection unchanged',await selected()==='3 selected');
      await page.keyboard.press('Control+Home');check('Ctrl+Home reaches first header',JSON.stringify(await current())===JSON.stringify({row:'__header__',column:'select'}));
      const header=page.locator('thead input');check('Header exposes mixed page selection',await header.getAttribute('aria-checked')==='mixed');
      await page.keyboard.press('Space');check('Header select-all affects this page once',await selected()==='200 selected');
      await page.keyboard.press('Space');check('Header clears page once',await selected()==='0 selected');
      await page.keyboard.press('Control+End');check('Ctrl+End stays on loaded page',JSON.stringify(await current())===JSON.stringify({row:ids.at(-1),column:'blockers'}));
      const visible=await page.evaluate(()=>{const port=document.querySelector('[data-table-grid]').getBoundingClientRect(),active=document.activeElement.getBoundingClientRect();return active.top>=port.top&&active.bottom<=port.bottom+1;});check('End focus is revealed within scrollport',visible);
      await page.keyboard.press('PageUp');const up=await current();check('PageUp moves within current server page',ids.includes(up.row)&&up.row!==ids.at(-1));
      await page.keyboard.press('Tab');check('Tab exits grid',await page.evaluate(()=>!document.activeElement.closest('table')));
      await page.locator('tbody tr').first().locator('a').first().focus();await page.keyboard.press('Shift+Tab');check('Shift+Tab exits grid',await page.evaluate(()=>!document.activeElement.closest('table')));
      await page.getByRole('searchbox',{name:'Search tasks by ID, title or summary'}).focus();await page.keyboard.press('F6');check('F6 enters grid',await page.evaluate(()=>!!document.activeElement.closest('table')));await page.keyboard.press('Shift+F6');check('Shift+F6 returns to toolbar',await page.getByRole('searchbox',{name:'Search tasks by ID, title or summary'}).evaluate(node=>node===document.activeElement));
      const idSort=page.getByRole('button',{name:/^Sort by ID/});await idSort.focus();await page.keyboard.press('Enter');await page.waitForURL(/sort=id.desc/);check('Enter sort toggles once and retains header focus',await idSort.evaluate(node=>node===document.activeElement)&&await page.locator('th[aria-sort]').count()===1&&await page.locator('th[aria-sort]').getAttribute('aria-sort')==='descending');
      await page.getByRole('button',{name:/^Sort by Title/}).focus();await page.keyboard.press('Shift+Enter');await page.waitForURL(/sort=title.asc/);check('Shift activation adds secondary sort',new URL(page.url()).searchParams.getAll('sort').join(',')==='id.desc,title.asc'&&await page.locator('th[aria-sort]').count()===1);
      await visit('q=NO-MATCH-UNIQUE-127');check('Zero rows retains one header tab target',await page.locator('tbody tr').count()===0&&await page.locator('table [tabindex="0"]').count()===1);
      await visit('q=TASK-00001');check('One row retains one target',await page.locator('tbody tr').count()===1&&await page.locator('table [tabindex="0"]').count()===1);
      await page.locator('tbody a').first().focus();await page.keyboard.press('Enter');await page.waitForURL(/\/tasks\/TASK-00001$/);check('Enter follows canonical identity href',new URL(page.url()).pathname==='/tasks/TASK-00001');
    }
    if(phase==='copy'){
      await visit();await page.evaluate(()=>{window.__copied=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__copied.push(text)}});});
      await page.locator('tbody tr').nth(1).locator('input').click();await page.locator('tbody tr').first().locator('input').click();await page.getByRole('button',{name:'Copy rows TSV',exact:true}).click();
      let copied=await page.evaluate(()=>window.__copied);check('Copy rows includes headers, visible order, excludes selection',copied[0].startsWith('ID\tTitle\tStatus\tPriority\tSpecs\tBlockers\nTASK-00001\t')&&copied[0].split('\n').length===3);
      await page.getByRole('button',{name:'Copy IDs',exact:true}).click();copied=await page.evaluate(()=>window.__copied);check('Copy IDs uses visible row order',copied.at(-1)==='TASK-00001\nTASK-00002');
      await page.getByRole('button',{name:'Clear selection',exact:true}).click();await page.locator('tbody tr').first().locator('a').first().focus();await page.keyboard.press('Control+c');copied=await page.evaluate(()=>window.__copied);check('Ctrl+C without selection copies focused value only',copied.at(-1)==='TASK-00001');
      await page.evaluate(()=>{const node=document.querySelector('tbody td[data-column=title] a');const range=document.createRange();range.selectNodeContents(node);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);});const count=copied.length;await page.keyboard.press('Control+c');check('Selected browser text keeps native copy',await page.evaluate(()=>window.__copied.length)===count);await page.evaluate(()=>getSelection().removeAllRanges());
      await page.getByRole('searchbox',{name:'Search tasks by ID, title or summary'}).focus();await page.keyboard.press('Control+c');check('Toolbar input copy is untouched',await page.evaluate(()=>window.__copied.length)===count);
      await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new DOMException('Denied','NotAllowedError');};});await page.locator('tbody tr').first().locator('input').click();await page.getByRole('button',{name:'Copy rows TSV',exact:true}).click();const fallback=page.getByRole('textbox',{name:'Clipboard unavailable. Select and copy this text'});await fallback.waitFor();check('Denied clipboard shows labeled selectable fallback',await fallback.inputValue()!==''&&await fallback.getAttribute('readonly')!==null);check('Denied clipboard does not announce success',(await page.locator('.selection-bar + [role=status]').innerText()).includes('Clipboard unavailable'));
      if(evidenceDir)await page.screenshot({path:`${evidenceDir}/task127-clipboard-denied.png`});
    }
    if(phase==='columns'){
      await visit();await open('Columns');await page.getByRole('button',{name:'Reset columns',exact:true}).click();
      const titleWidth=page.getByRole('spinbutton',{name:'Title width in pixels'});const auto=Number(await titleWidth.inputValue());check('Auto title uses available space within cap',auto>=320&&auto<=800);
      await titleWidth.focus();await titleWidth.fill('424');await page.keyboard.press('Enter');await escape();check('Numeric keyboard width reaches rendered column',Math.round(await page.locator('th[data-column=title]').evaluate(node=>node.getBoundingClientRect().width))===424);
      await page.setViewportSize({width:1280,height:720});check('Explicit width survives viewport resize',Math.round(await page.locator('th[data-column=title]').evaluate(node=>node.getBoundingClientRect().width))===424);
      await open('Columns');await page.getByRole('checkbox',{name:'Dependencies',exact:true}).focus();await page.keyboard.press('Space');check('Keyboard can show optional column',await page.locator('th[data-column=dependencies]').count()===1);
      await page.getByRole('button',{name:'Move Dependencies up',exact:true}).focus();await page.keyboard.press('Enter');check('Keyboard can reorder optional column',(await page.locator('thead th').evaluateAll(nodes=>nodes.map(node=>node.dataset.column))).slice(-2).join(',')==='dependencies,blockers');
      await page.getByRole('button',{name:'Reset columns',exact:true}).focus();await page.keyboard.press('Enter');check('Reset restores auto title and default visible columns',Number(await titleWidth.inputValue())!==424&&await page.locator('th[data-column=dependencies]').count()===0);
      await escape();await page.reload();await page.waitForSelector('table[role=grid]');check('Versioned preferences survive reload',await page.locator('th[data-column=dependencies]').count()===0&&await page.locator('table [tabindex="0"]').count()===1);
      await page.locator('tbody tr').first().locator('input').click();await open('Columns');await page.getByRole('checkbox',{name:'Status',exact:true}).focus();await page.keyboard.press('Space');await escape();check('Hiding columns preserves row selection',await selected()==='1 selected');
      await open('Columns');await page.getByRole('button',{name:'Reset columns',exact:true}).click();await escape();
      await page.getByRole('button',{name:/^Density:/}).focus();await page.keyboard.press('Enter');check('Density toggles to40',Math.round(await page.locator('tbody tr').first().evaluate(node=>node.getBoundingClientRect().height))===40);await page.getByRole('button',{name:/^Density:/}).click();
    }
    if(phase==='refresh'){
      await visit();const baseline=await page.evaluate(async()=>await(await fetch('/workspace-data?route=tasks&pageSize=200&sort=id.asc')).json());
      await page.locator('tbody tr').nth(2).locator('input').click();await page.locator('tbody tr').nth(4).locator('a').first().focus();await page.keyboard.press('Control+End');await page.keyboard.press('ArrowUp');
      const before=await page.evaluate(()=>({focus:{row:document.activeElement.dataset.rowKey,column:document.activeElement.dataset.columnKey},scroll:document.querySelector('[data-table-grid]').scrollTop,url:location.href}));
      const data=structuredClone(baseline);data.revision='127-refresh';data.data.result.rows[0].title='=SAFE refreshed title';
      let release;const gate=new Promise(resolve=>release=resolve);const handler=async route=>{await gate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});};await page.route('**/workspace-data*',handler);
      await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.locator(`tr[data-entity-id="${before.focus.row}"] td[data-column="${before.focus.column}"]`).focus();release();await page.waitForFunction(()=>document.querySelector('tbody td[data-column=title]').textContent.includes('SAFE refreshed'));
      const after=await page.evaluate(()=>({focus:{row:document.activeElement.dataset.rowKey,column:document.activeElement.dataset.columnKey},scroll:document.querySelector('[data-table-grid]').scrollTop,url:location.href}));check('Same-query refresh preserves focused row/key, scroll and URL',JSON.stringify(before)===JSON.stringify(after),{before,after});check('Same-query refresh preserves visible selection',await selected()==='1 selected');await page.unroute('**/workspace-data*',handler);
      const removed=structuredClone(data);const focusedIndex=removed.data.result.rows.findIndex(row=>row.id===before.focus.row);const expected=removed.data.result.rows[focusedIndex+1]?.id??removed.data.result.rows[focusedIndex-1]?.id;removed.data.result.rows=removed.data.result.rows.filter(row=>row.id!==before.focus.row&&row.id!==baseline.data.result.rows[2].id);removed.revision='127-removed';
      let releaseRemoved;const removedGate=new Promise(resolve=>releaseRemoved=resolve);const removedHandler=async route=>{await removedGate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(removed)});};await page.route('**/workspace-data*',removedHandler);await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.locator(`tr[data-entity-id="${before.focus.row}"] td[data-column="${before.focus.column}"]`).focus();releaseRemoved();await page.waitForFunction(id=>!document.querySelector(`tr[data-entity-id="${id}"]`),before.focus.row);check('Removed focused row maps to nearest remaining row',(await current()).row===expected,{expected,actual:await current()});check('Removed selection is reconciled and announced',await selected()==='0 selected'&&(await page.locator('.selection-bar + [role=status]').innerText()).includes('left this page'));await page.unroute('**/workspace-data*',removedHandler);
      const abort=route=>route.abort('failed');await page.route('**/workspace-data*',abort);await page.locator('tbody tr').first().locator('input').click();const failureBefore=await page.locator('tbody').innerHTML();await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.getByRole('alert').filter({hasText:'Datos anteriores'}).waitFor();check('Failed refresh retains exact data and selection',await page.locator('tbody').innerHTML()===failureBefore&&await selected()==='1 selected');await page.unroute('**/workspace-data*',abort);
      await page.getByRole('button',{name:'Retry',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.refresh-error'));check('Retry recovers without leaving Table',await page.locator('table[role=grid]').count()===1);
      await page.getByRole('button',{name:/^Sort by Title/}).click();await page.waitForURL(/sort=title.asc/);check('User sort clears page-local selection',await selected()==='0 selected');
    }
    if(phase==='controls'){
      await visit();await open('Columns');await page.getByRole('button',{name:'Reset columns',exact:true}).click();await escape();
      const before=await page.locator('th[data-column=title]').evaluate(node=>node.getBoundingClientRect().width),handle=page.getByRole('separator',{name:'Resize Title; numeric controls in Columns'}),box=await handle.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x-80,box.y+box.height/2);await page.mouse.up();const after=await page.locator('th[data-column=title]').evaluate(node=>node.getBoundingClientRect().width);check('Pointer width shares clamped explicit sizing',after<before&&after>=200&&after<=800,{before,after});
      await page.locator('tbody tr').first().locator('input').click();await page.locator('tbody td[data-column=status]').first().focus();await open('Columns');await page.getByRole('checkbox',{name:'Status',exact:true}).focus();await page.keyboard.press('Space');await escape();await page.keyboard.press('F6');check('Hidden focused column maps to nearest visible key',(await current()).column==='priority'&&await selected()==='1 selected');
      await page.keyboard.press('F6');await open('Columns');await page.getByRole('button',{name:'Reset columns',exact:true}).click();await escape();await open('Sort');await page.getByLabel(/^Primary column/).selectOption('title');await page.getByLabel(/^Primary direction/).selectOption('desc');await page.getByLabel(/^Secondary column/).selectOption('status');await page.getByRole('button',{name:'Apply sort',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForURL(/sort=title.desc/);check('Sort panel applies equivalent primary and secondary keys',new URL(page.url()).searchParams.getAll('sort').join(',')==='title.desc,status.asc');
      await page.getByRole('button',{name:'Remove secondary',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>new URL(location.href).searchParams.getAll('sort').length===1);check('Sort panel removes secondary key',new URL(page.url()).searchParams.getAll('sort').join(',')==='title.desc');
      await escape();const link=page.locator('tbody a').first(),href=await link.getAttribute('href');const popupPromise=page.context().waitForEvent('page',{timeout:5000});await link.click({button:'middle'});const popup=await popupPromise;await popup.waitForLoadState();check('Middle click preserves genuine canonical new-tab navigation',new URL(popup.url()).pathname===href);await popup.close();
    }
    if(phase==='refresh-empty'){
      await visit('pageSize=100&page=2&sort=id.asc');const baseline=await page.evaluate(async()=>await(await fetch('/workspace-data?route=tasks&pageSize=100&page=2&sort=id.asc')).json());
      const id=baseline.data.result.rows[0].id;await page.locator('tbody tr').first().locator('input').click();
      const clamped=structuredClone(baseline);clamped.revision='127-clamped';clamped.data.result.rows=clamped.data.result.rows.slice(0,1);clamped.data.result.totalMatching=1;clamped.data.result.page=1;clamped.data.result.normalizedQuery.page=1;
      let release;const gate=new Promise(resolve=>release=resolve);const handler=async route=>{await gate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(clamped)});};await page.route('**/workspace-data*',handler);await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.locator('tbody a').first().focus();release();await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===1);
      check('Same URL clamped execution preserves surviving selection/focus',await selected()==='1 selected'&&(await current()).row===id&&new URL(page.url()).searchParams.get('page')==='2');check('Clamped page is announced',await page.locator('.page-notice').count()===1);await page.unroute('**/workspace-data*',handler);
      const empty=structuredClone(clamped);empty.revision='127-empty';empty.data.result.rows=[];empty.data.result.totalMatching=0;
      let releaseEmpty;const emptyGate=new Promise(resolve=>releaseEmpty=resolve);const emptyHandler=async route=>{await emptyGate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(empty)});};await page.route('**/workspace-data*',emptyHandler);await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.locator('tbody a').first().focus();releaseEmpty();await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===0);
      check('Empty refresh returns focus to toolbar',await page.getByRole('searchbox',{name:'Search tasks by ID, title or summary'}).evaluate(node=>node===document.activeElement));check('Empty refresh clears selection while keeping one header target',await selected()==='0 selected'&&await page.locator('table [tabindex="0"]').count()===1);await page.unroute('**/workspace-data*',emptyHandler);
    }
    if(phase==='layouts'){
      report.layouts=[];report.contrast=[];report.axe=[];
      for(const theme of ['light','dark'])for(const [width,height,minRows] of [[1440,900,16],[1280,720,12]]){
        await page.setViewportSize({width,height});await visit();await page.evaluate(()=>{for(const key of Object.keys(localStorage))if(key.startsWith('spm-table-v1:'))localStorage.removeItem(key);});await page.reload();await page.waitForSelector('table[role=grid]');await selectTheme(page,theme);
        const resolved=await resolvedTheme(page,'tbody td');check(`${theme}/${width}: resolved theme and surface`,resolved.theme===theme&&resolved.colorMode===theme&&resolved.surface===(theme==='dark'?'#151b1e':'#ffffff')&&resolved.background===(theme==='dark'?'rgb(21, 27, 30)':'rgb(255, 255, 255)'),resolved);
        const layout=await page.evaluate(()=>{const port=document.querySelector('[data-table-grid]').getBoundingClientRect(),header=document.querySelector('thead').getBoundingClientRect();return {width:innerWidth,height:innerHeight,overflow:document.body.scrollWidth>innerWidth,rows:[...document.querySelectorAll('tbody tr')].filter(row=>{const rect=row.getBoundingClientRect();return rect.top>=header.bottom&&rect.bottom<=port.bottom;}).length,rowHeight:document.querySelector('tbody tr').getBoundingClientRect().height,primaryFont:parseFloat(getComputedStyle(document.querySelector('td[data-column=id]')).fontSize),states:[...new Set([...document.querySelectorAll('td[data-column=status]')].map(node=>node.textContent))]};});report.layouts.push({theme,...layout});check(`${theme}/${width}: visible rows and primary text`,layout.rows>=minRows&&layout.rowHeight===32&&layout.primaryFont>=13&&!layout.overflow&&layout.states.length>1,layout);
        if(evidenceDir)await page.screenshot({path:`${evidenceDir}/task127-${theme}-${width}.png`});
        if(width===1440){const audit=await page.evaluate(contrastAudit);report.contrast.push({theme,view:'table',...audit});check(`${theme}: Table solid-surface text contrast`,audit.failures.length===0&&audit.skipped.length===0,{checked:audit.checked,failures:audit.failures,skipped:audit.skipped});
          if(axePath){await page.addScriptTag({path:axePath});const result=await page.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return {passes:result.passes.length,violations:result.violations.map(item=>({id:item.id,impact:item.impact,nodes:item.nodes.map(node=>node.html)})),incomplete:result.incomplete.map(item=>({id:item.id,nodes:item.nodes.length}))};});report.axe.push({theme,view:'table',...result});check(`${theme}: Table axe WCAG`,result.violations.length===0,result);}
        }
      }
      for(const theme of ['light','dark']){
        await page.setViewportSize({width:1440,height:900});await page.goto(`${baseURL}/tasks?view=board&pageSize=50`);await page.waitForSelector('.board');await selectTheme(page,theme);const resolved=await resolvedTheme(page,'.task-card');check(`${theme}: Board resolved theme and surface`,resolved.theme===theme&&resolved.colorMode===theme&&resolved.surface===(theme==='dark'?'#151b1e':'#ffffff')&&resolved.background===(theme==='dark'?'rgb(21, 27, 30)':'rgb(255, 255, 255)'),resolved);const audit=await page.evaluate(contrastAudit);report.contrast.push({theme,view:'board',...audit});check(`${theme}: Board solid-surface contrast`,audit.failures.length===0&&audit.skipped.length===0,{checked:audit.checked,failures:audit.failures,skipped:audit.skipped});
        if(axePath){await page.addScriptTag({path:axePath});const result=await page.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return {passes:result.passes.length,violations:result.violations.map(item=>({id:item.id,impact:item.impact,nodes:item.nodes.map(node=>node.html)})),incomplete:result.incomplete.map(item=>({id:item.id,nodes:item.nodes.length}))};});report.axe.push({theme,view:'board',...result});check(`${theme}: Board axe WCAG`,result.violations.length===0,result);}
        if(evidenceDir)await page.screenshot({path:`${evidenceDir}/task127-board-${theme}.png`});
      }
    }
    if(phase==='touch'){
      const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
      try {const touch=await context.newPage();await touch.goto(`${baseURL}/tasks?pageSize=50`);await touch.waitForSelector('table[role=grid]');
        const track=await touch.locator('td[data-column=select]').first().evaluate(node=>node.getBoundingClientRect().width);check('Touch selection track expands to44 without stored desktop mutation',track===44);
        for(const label of ['Columns','Filters']){await touch.locator('summary').filter({hasText:new RegExp(`^${label}`)}).first().click();if(label==='Filters')await touch.locator('summary').filter({hasText:/Status/}).click();
          const panel=await touch.locator('details[open]>.popover-panel').evaluate(node=>{const rect=node.getBoundingClientRect();return {x:rect.x,right:rect.right,bottom:rect.bottom,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,overflow:getComputedStyle(node).overflowY,targets:[...node.querySelectorAll('button,input[type=number],summary')].filter(el=>el.getClientRects().length&&!el.disabled).map(el=>el.getBoundingClientRect().height)};});check(`Touch ${label}: panel stays in viewport and targets44`,panel.x>=0&&panel.right<=390&&panel.bottom<=844&&panel.targets.every(height=>height>=44)&&['auto','scroll'].includes(panel.overflow),panel);
          if(evidenceDir)await touch.screenshot({path:`${evidenceDir}/task127-touch-${label.toLowerCase()}.png`});await touch.locator('details[open]>.popover-panel').first().locator('..').locator(':scope>summary').click();
        }
        await touch.setViewportSize({width:768,height:900});await touch.locator('summary').filter({hasText:/^Columns/}).first().click();const bounds=await touch.locator('details[open]>.popover-panel').evaluate(node=>node.getBoundingClientRect().toJSON());check('768px popover stays inside viewport',bounds.x>=0&&bounds.right<=768&&bounds.bottom<=900,bounds);
      }finally{await context.close();}
    }
    if(phase==='fallback'){
      await page.goto(`${baseURL}/tasks?scope=all&view=board&page=2&q=fixture`);await page.waitForSelector('.board');check('Board explicitly remains unarchived',(await page.locator('.board-note').innerText()).includes('unarchived'));
      await page.getByLabel('View preset',{exact:true}).selectOption('archived');await page.waitForSelector('table[role=grid]');let params=new URL(page.url()).searchParams;check('Archived preset from Board explicitly changes Table',params.get('view')==='table'&&params.get('scope')==='archived'&&!params.has('status')&&params.get('page')==='1');
      await visit('q=fixture&spec=SPEC-00001&priority=2&window=7d&sort=title.desc&pageSize=50');await page.getByLabel('View preset',{exact:true}).selectOption('in_progress');await page.waitForURL(/status=in_progress/);params=new URL(page.url()).searchParams;check('Presets preserve independent facets and sort',params.get('q')==='fixture'&&params.get('spec')==='SPEC-00001'&&params.get('priority')==='2'&&params.get('window')==='7d'&&params.get('sort')==='title.desc'&&params.get('pageSize')==='50');
      await visit('scope=all&status=review');check('Mixed scope/status has Custom preset',await page.getByLabel('View preset',{exact:true}).inputValue()==='custom');
      await visit();await page.locator('tbody tr').first().locator('input').click();const historyBefore=await page.evaluate(()=>history.length);await page.getByRole('searchbox',{name:'Search tasks by ID, title or summary'}).fill('TASK-00001');await page.waitForURL(/q=TASK-00001/);check('Debounced search replaces history and clears selection',await page.evaluate(()=>history.length)===historyBefore&&await selected()==='0 selected');
      await page.getByRole('link',{name:'Simple table',exact:true}).click();await page.waitForSelector('table:not([role])');check('Simple mode keeps native semantics and native tab controls',await page.locator('table[role=grid]').count()===0&&await page.locator('tbody a:not([tabindex])').count()===2&&new URL(page.url()).searchParams.get('q')==='TASK-00001');
      const context=await page.context().browser().newContext({javaScriptEnabled:false,viewport:{width:1280,height:720}});
      try{
        const native=await context.newPage();await native.goto(`${baseURL}/tasks?pageSize=50&sort=id.asc`);check('No-JS SSR is semantic table with no dead grid controls',await native.locator('table:not([role])').count()===1&&await native.locator('table input,table button,[role=grid]').count()===0&&await native.locator('tbody tr').count()===50);
        await native.locator('thead a').filter({hasText:'Title'}).click();check('No-JS sort follows genuine GET link',new URL(native.url()).searchParams.get('sort')==='title.asc');
        await native.locator('summary').filter({hasText:/^Filters/}).click();await native.getByRole('searchbox',{name:'Search tasks by ID, title or summary'}).fill('TASK-00001');await native.getByRole('button',{name:'Apply filters',exact:true}).click();check('No-JS GET form includes external toolbar search',new URL(native.url()).searchParams.get('q')==='TASK-00001'&&await native.locator('tbody tr').count()===1);
        await native.locator('summary').filter({hasText:/^Filters/}).click();await native.getByRole('link',{name:'Clear filters',exact:true}).click();check('No-JS Clear restores unfiltered table',!new URL(native.url()).searchParams.has('q')&&await native.locator('tbody tr').count()===100);
        if(evidenceDir)await native.screenshot({path:`${evidenceDir}/task127-no-js.png`});
      }finally{await context.close();}
    }
  }catch(error){report.error=String(error);}
  return report;
}

function contrastAudit(){
            const rgba = value => {
              const hex = /^#([0-9a-f]{6})$/i.exec(value);
              if (hex) return [0,2,4].map(i=>parseInt(hex[1].slice(i,i+2),16)).concat(1);
              if (value.startsWith('color(srgb')) { const p=value.match(/[\d.]+/g).map(Number); return [p[0]*255,p[1]*255,p[2]*255,p[3]??1]; }
              const p=value.match(/[\d.]+/g)?.map(Number); return p?.length >= 3 ? [p[0],p[1],p[2],p[3]??1] : null;
            };
            const over=(front,back)=>[...front.slice(0,3).map((v,i)=>v*front[3]+back[i]*(1-front[3])),1];
            const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
            const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
            const failures=[]; let checked=0; const skipped=[];
            for (const el of document.querySelectorAll('body *')) {
              if (!Array.from(el.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()) || !el.getClientRects().length || el.closest('svg')) continue;
              let closedContent=false;for(let ancestor=el.parentElement;ancestor;ancestor=ancestor.parentElement)if(ancestor.tagName==='DETAILS'&&!ancestor.open&&!ancestor.querySelector(':scope > summary')?.contains(el)){closedContent=true;break;}if(closedContent)continue;
              const rect=el.getBoundingClientRect(); if(rect.width===0||rect.height===0)continue;
              const style=getComputedStyle(el); if(style.visibility==='hidden')continue;
              const chain=[]; for(let p=el;p;p=p.parentElement)chain.push(p);
              let bg=rgba(getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim());
              let unsupported=false;
              for(const p of chain.reverse()){const s=getComputedStyle(p),c=rgba(s.backgroundColor);if(s.backgroundImage!=='none')unsupported=true;if(c)bg=over(c,bg);}
              const fg=rgba(style.color); if(!fg||unsupported){skipped.push(el.tagName+'.'+el.className);continue;}
              const value=ratio(over(fg,bg),bg); checked++;
              const min=Number.parseFloat(style.fontSize)>=24 || (Number.parseFloat(style.fontSize)>=18.66&&Number.parseInt(style.fontWeight)>=700)?3:4.5;
              if(value<min)failures.push({element:el.tagName+'.'+el.className,text:el.textContent.trim().slice(0,80),ratio:Math.round(value*100)/100,min,color:style.color,background:bg});
            }
            return {checked,failures,skipped};

}

async function resolvedTheme(page,selector){return page.evaluate(selector=>({theme:document.documentElement.dataset.theme,colorMode:document.documentElement.dataset.colorMode,surface:getComputedStyle(document.documentElement).getPropertyValue('--surface').trim().toLowerCase(),background:getComputedStyle(document.querySelector(selector)).backgroundColor}),selector);}

async function selectTheme(page,theme){await page.getByRole('button',{name:'Workspace preferences',exact:true}).click();await page.getByRole('button',{name:theme==='dark'?'Dark':'Light',exact:true}).click();await page.waitForFunction(theme=>document.documentElement.dataset.colorMode===theme&&document.documentElement.dataset.theme===theme,theme);await page.keyboard.press('Escape');}
