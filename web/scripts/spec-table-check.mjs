// TASK-137 consumer checks. Shared generic-grid behavior remains covered by TASK-127.
export async function verifySpecTable(page,{baseURL='http://127.0.0.1:5291',phase='core',evidenceDir}={}){
  const report={phase,capturedAt:new Date().toISOString(),browser:page.context().browser().version(),checks:[]};
  const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});if(!pass)throw new Error(name);};
  const visit=async(query='pageSize=200&sort=id.asc&taskScope=all')=>{await page.goto(`${baseURL}/specs?${query}`);await page.locator('table[role=grid]').waitFor();};
  const open=async label=>{const summary=page.locator('summary').filter({hasText:new RegExp(label)}).first();if(!await summary.evaluate(node=>node.parentElement.open))await summary.click();};
  const escape=()=>page.keyboard.press('Escape');
  const current=()=>page.evaluate(()=>({row:document.activeElement?.dataset.rowKey,column:document.activeElement?.dataset.columnKey}));
  try{
    await page.setViewportSize({width:1440,height:900});
    if(phase==='core'){
      await visit();check('200 Specs render with canonical status and global progress',await page.locator('tbody tr').count()===200&&(await page.locator('.progress-scope').innerText()).includes('Global progress')&&(await page.locator('tbody td[data-column=status]').first().innerText()).includes('Archived')&&(await page.locator('tbody td[data-column=progress]').first().innerText()).trim()==='1 / 3');
      await page.getByRole('searchbox',{name:'Search specs by ID, title or summary'}).focus();await page.keyboard.press('F6');check('Specs toolbar F6 enters existing grid',(await current()).row==='SPEC-00001');await page.keyboard.press('ArrowRight');check('Specs grid arrows reach title',(await current()).column==='title');
      await page.evaluate(()=>{window.__specCopies=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>window.__specCopies.push(value)}});});
      await page.keyboard.press('Control+c');check('Spec focused title copy neutralizes formula',(await page.evaluate(()=>window.__specCopies.at(-1))).startsWith("'=SUM(1)"));
      await page.locator('tbody tr').nth(1).locator('input').click();await page.locator('tbody tr').first().locator('input').click();await page.getByRole('button',{name:'Copy rows TSV',exact:true}).click();const text=await page.evaluate(()=>window.__specCopies.at(-1));check('Spec selected rows copy visible spec columns and canonical values',text.startsWith('ID\tTitle\tStatus\tDone / total\tBlocked\tReview\tTasks\nSPEC-00001\t')&&text.includes("'=SUM(1)")&&text.includes('\tArchived\t1 / 3\t1\t1\t3')&&text.split('\n').length===3);
      await open('Columns');await page.getByRole('checkbox',{name:'Owner',exact:true}).check();await escape();await page.reload();await page.locator('table[role=grid]').waitFor();check('Spec optional owner preference persists on reload',await page.locator('th[data-column=owner]').count()===1);check('Preferences use project+spec key',await page.evaluate(()=>Object.keys(localStorage).some(key=>key.startsWith('spm-table-v1:')&&key.endsWith(':spec'))));
      await open('Columns');await page.getByRole('button',{name:'Reset columns',exact:true}).click();await escape();
      for(const [query,count] of [['q=NO-MATCH-137',0],['q=SPEC-00001',1]]){await visit(query);check(`${count}-row result keeps shared grid usable`,await page.locator('tbody tr').count()===count&&await page.locator('table [tabindex="0"]').count()===1);}
      await page.locator('tbody a').first().focus();await page.keyboard.press('Enter');await page.waitForURL(/\/specs\/SPEC-00001$/);check('Spec identity Enter follows canonical detail',new URL(page.url()).pathname==='/specs/SPEC-00001'&&await page.getByRole('heading',{name:'Answer open questions',exact:true}).count()===1);
    }
    if(phase==='filters'){
      for(const [scope,progress] of [['all','1 / 3'],['unarchived','0 / 2'],['archived','1 / 1']]){
        await visit('status=archived&taskScope=all&page=2&pageSize=50&sort=id.asc');await open('Filters');await open('Progress task scope');await page.locator('label').filter({has:page.locator(`input[name=taskScope][value=${scope}]`)}).click();
        check(`${scope}: exactly one successful taskScope value`,JSON.stringify(await page.locator('#workspace-filters').evaluate(form=>new FormData(form).getAll('taskScope')))===JSON.stringify([scope]));
        await page.getByRole('button',{name:'Apply filters',exact:true}).click();await page.waitForURL(url=>url.searchParams.get('taskScope')===scope&&url.searchParams.get('page')==='1');await page.waitForFunction(value=>document.querySelector('tbody td[data-column=progress]')?.textContent.trim()===value,progress);
        const params=new URL(page.url()).searchParams;check(`${scope}: JS GET-equivalent apply preserves spec status/sort/page size`,params.get('status')==='archived'&&params.get('sort')==='id.asc'&&params.get('pageSize')==='50'&&(await page.locator('tbody td[data-column=status]').first().innerText()).includes('Archived'));check(`${scope}: progress label identifies subset`,(await page.locator('.progress-scope').innerText()).includes(scope==='all'?'Global progress':'Subset progress'));
      }
      await visit('window=7d&taskScope=all&sort=id.asc');check('Lifecycle window labels progress subset even at all scope',(await page.locator('.progress-scope').innerText()).includes('Subset progress')&&(await page.locator('tbody td[data-column=progress]').first().innerText()).trim()==='1 / 1');
    }
    if(phase==='refresh'){
      await visit();await page.locator('tbody tr').first().locator('input').click();await open('Filters');await open('Progress task scope');await page.locator('label').filter({has:page.locator('input[name=taskScope][value=archived]')}).click();
      const baseline=await page.evaluate(async()=>await(await fetch('/workspace-data?route=specs&pageSize=200&sort=id.asc&taskScope=all')).json());const fresh=structuredClone(baseline);fresh.revision='spec137-refresh';fresh.data.result.rows[0].title='Refreshed spec title';let release;const gate=new Promise(resolve=>release=resolve);const handler=async route=>{await gate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fresh)});};await page.route('**/workspace-data*',handler);
      await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();await page.locator('tbody tr').nth(3).locator('a').first().focus();const before={url:page.url(),focus:await current()};release();await page.waitForFunction(()=>document.querySelector('tbody td[data-column=title]')?.textContent.includes('Refreshed spec title'));
      check('Specs same-query refresh preserves selected ID and focused row/key',await page.locator('.selection-bar strong').innerText()==='1 selected'&&JSON.stringify(await current())===JSON.stringify(before.focus)&&page.url()===before.url);check('Specs refresh preserves unsubmitted taskScope radio draft',await page.locator('input[name=taskScope][value=archived]').isChecked());await page.unroute('**/workspace-data*',handler);
    }
    if(phase==='nojs'){
      const context=await page.context().browser().newContext({javaScriptEnabled:false,viewport:{width:1440,height:900}});try{const native=await context.newPage();
        for(const [scope,progress] of [['all','1 / 3'],['unarchived','0 / 2'],['archived','1 / 1']]){
          await native.goto(`${baseURL}/specs?status=archived&taskScope=all&page=2&pageSize=50&sort=id.asc&simple=1`);check(`${scope}: SSR is native table`,await native.locator('table').getAttribute('role')===null&&await native.locator('table input[type=checkbox]').count()===0);
          await native.locator('summary').filter({hasText:/^Filters/}).click();await native.locator('summary').filter({hasText:/Progress task scope/}).click();await native.locator('label').filter({has:native.locator(`input[name=taskScope][value=${scope}]`)}).click();check(`${scope}: native form has one taskScope`,JSON.stringify(await native.locator('#workspace-filters').evaluate(form=>new FormData(form).getAll('taskScope')))===JSON.stringify([scope]));
          const response=native.waitForResponse(response=>response.request().isNavigationRequest()&&response.request().method()==='GET');await native.getByRole('button',{name:'Apply filters',exact:true}).click();check(`${scope}: real no-JS GET succeeds`,(await response).status()===200);await native.waitForLoadState();const params=new URL(native.url()).searchParams;check(`${scope}: no-JS scope/page/facets and progress`,params.getAll('taskScope').length===1&&params.get('taskScope')===scope&&params.get('page')==='1'&&params.get('status')==='archived'&&params.get('simple')==='1'&&(await native.locator('tbody td[data-column=progress]').first().innerText()).trim()===progress);
        }
        await native.locator('thead a').filter({hasText:/^ID/}).click();await native.waitForLoadState();check('Native Specs sort link works without JavaScript',new URL(native.url()).searchParams.get('sort')==='id.desc');await native.locator('tbody a').first().click();await native.waitForURL(/\/specs\/SPEC-/);check('Native Specs identity link reaches canonical route',new URL(native.url()).pathname.startsWith('/specs/SPEC-'));
      }finally{await context.close();}
      await page.goto(`${baseURL}/specs?simple=1`);await page.locator('table').waitFor();check('simple=1 retains native table after JS mount',await page.locator('table').getAttribute('role')===null&&await page.locator('table [tabindex="0"]').count()===0);
    }
    if(phase==='layouts'){
      report.layouts=[];report.contrast=[];
      for(const theme of ['light','dark'])for(const [width,height] of [[1280,720],[1440,900],[1920,1080],[390,844]]){
        await page.setViewportSize({width,height});await visit();await page.getByRole('button',{name:'Workspace preferences',exact:true}).click();await page.getByRole('button',{name:theme==='dark'?'Dark':'Light',exact:true}).click();await page.waitForFunction(value=>document.documentElement.dataset.theme===value&&document.documentElement.dataset.colorMode===value,theme);await escape();
        const layout=await page.evaluate(()=>{const port=document.querySelector('[data-table-grid]').getBoundingClientRect(),header=document.querySelector('thead').getBoundingClientRect();return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,visibleRows:[...document.querySelectorAll('tbody tr')].filter(row=>{const box=row.getBoundingClientRect();return box.top>=header.bottom&&box.bottom<=Math.min(port.bottom,innerHeight);}).length,rowHeight:document.querySelector('tbody tr').getBoundingClientRect().height,role:document.querySelector('table').getAttribute('role')};});
        check(`${theme}/${width}: bounded Specs layout`,!layout.overflow&&layout.role==='grid'&&(width===390||layout.visibleRows>=(height===720?12:16)),layout);report.layouts.push({theme,...layout});
        const contrast=await page.evaluate(contrastAudit);check(`${theme}/${width}: solid-surface text contrast`,contrast.failures.length===0&&contrast.skipped.length===0,{checked:contrast.checked,failures:contrast.failures,skipped:contrast.skipped});report.contrast.push({theme,width,...contrast});
        if(evidenceDir)await page.screenshot({path:`${evidenceDir}/task137-specs-${theme}-${width}.png`});
      }
    }
  }catch(error){report.error=String(error);}report.pass=!report.error&&report.checks.every(check=>check.pass);return report;
}

// Same solid-surface text method used for TASK-127; excludes SVG and closed details.
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
