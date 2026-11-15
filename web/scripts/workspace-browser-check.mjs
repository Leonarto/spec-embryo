// Invoke with Playwright's page (including the connected browser tool).
// No personal data is written: these checks only change browser preferences.
export async function verifyWorkspaceShell(page, { baseURL = 'http://127.0.0.1:5184', evidenceDir } = {}) {
  const report = { browser: page.context().browser().version(), capturedAt: new Date().toISOString(), checks: [], layouts: [], contrast: [] };
  const check = (name, condition, detail) => { report.checks.push({ name, pass: !!condition, detail }); if (!condition) throw new Error(`${name}: ${JSON.stringify(detail)}`); };
  await page.goto(baseURL);
  await page.evaluate(() => { localStorage.setItem('spm-workspace-v1', JSON.stringify({ version: 1, rail: 'collapsed' })); localStorage.setItem('spm-color-mode', 'dark'); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  check('Compact rail 56px', await page.locator('.sidebar').evaluate(el => el.getBoundingClientRect().width) === 56);
  await page.getByRole('button', { name: 'Expand navigation', exact: true }).click();
  check('Expanded rail 184px', await page.locator('.sidebar').evaluate(el => el.getBoundingClientRect().width) === 184);
  await page.reload();
  check('Rail preference survives reload', await page.locator('.sidebar').evaluate(el => el.getBoundingClientRect().width) === 184);
  await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Workspace preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Light', exact: true }).focus();
  await page.keyboard.press('Enter');
  check('Keyboard chooses light theme', await page.locator('html').getAttribute('data-theme') === 'light');
  await page.keyboard.press('Escape');
  check('Escape closes preferences and restores focus', await page.getByRole('button', { name: 'Workspace preferences', exact: true }).evaluate(el => document.activeElement === el && el.getAttribute('aria-expanded') === 'false'));
  await page.getByRole('button', { name: 'Workspace preferences', exact: true }).click();
  await page.getByRole('button', { name: 'System', exact: true }).click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  check('System follows dark OS', await page.locator('html').getAttribute('data-theme') === 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  check('System follows light OS', await page.locator('html').getAttribute('data-theme') === 'light');
  await page.keyboard.press('Escape');

  const routes = ['/', '/tasks', '/specs', '/timeline', '/tasks/TASK-115', '/specs/SPEC-057'];
  for (const mode of ['dark', 'light', 'system']) {
    await page.evaluate(mode => localStorage.setItem('spm-color-mode', mode), mode);
    for (const [width, height] of [[1440,900],[1280,720],[768,900],[390,844]]) {
      await page.setViewportSize({ width, height });
      for (const [index, route] of routes.entries()) {
        await page.goto(baseURL + route);
        const layout = await page.evaluate(() => ({ route: location.pathname, theme: document.documentElement.dataset.theme, width: innerWidth, documentWidth: document.documentElement.scrollWidth, navWidth: document.querySelector('.sidebar').getBoundingClientRect().width, headerHeight: document.querySelector('.topbar').getBoundingClientRect().height, active: [...document.querySelectorAll('nav [aria-current]')].map(el => el.getAttribute('aria-label')) }));
        report.layouts.push({ mode, ...layout });
        check(`${mode}/${width}${route}: no document overflow`, layout.documentWidth <= width, layout.documentWidth);
        check(`${mode}/${width}${route}: compact topbar`, layout.headerHeight === 44, layout.headerHeight);
        check(`${mode}/${width}${route}: one active parent`, layout.active.length === 1 && layout.active[0] === (route.startsWith('/tasks') ? 'Tasks' : route.startsWith('/specs') ? 'Specs' : route === '/timeline' ? 'Timeline' : 'Overview'), layout.active);
        if (evidenceDir && (route === '/' || (width === 1440 && mode !== 'system'))) await page.screenshot({ path: `${evidenceDir}/p1-${mode}-${width}-${index}.png` });
        if (mode !== 'system' && width === 1440) {
          const audit = await page.evaluate(() => {
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
          });
          report.contrast.push({ mode, route, ...audit });
        }
      }
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.goto(baseURL);
  await page.getByRole('button',{name:'Refresh workspace',exact:true}).waitFor();
  check('Active Overview registers controlled refresh', await page.getByRole('button',{name:'Refresh workspace',exact:true}).count() === 1);
  const context = await page.context().browser().newContext({ javaScriptEnabled: false, viewport:{width:1280,height:720} });
  const ssr = await context.newPage();
  await ssr.goto(baseURL+'/tasks');
  check('No-JS navigation and content remain useful', await ssr.getByRole('heading',{name:'Tasks',exact:true}).count()===1 && await ssr.locator('nav a').count()===4);
  await context.close();
  const blockedContext = await page.context().browser().newContext({viewport:{width:1440,height:900}});
  await blockedContext.addInitScript(()=>{Object.defineProperty(Storage.prototype,'getItem',{value(){throw new Error('Storage unavailable')}});Object.defineProperty(Storage.prototype,'setItem',{value(){throw new Error('Storage unavailable')}})});
  const blocked=await blockedContext.newPage();
  await blocked.goto(baseURL);
  await blocked.getByRole('button',{name:'Expand navigation',exact:true}).click();
  await blocked.getByRole('button',{name:'Collapse navigation',exact:true}).waitFor();
  check('Blocked storage keeps preferences operable',await blocked.getByRole('button',{name:'Collapse navigation',exact:true}).count()===1);
  await blockedContext.close();
  await page.emulateMedia({reducedMotion:'reduce'});
  check('Reduced motion removes transitions', await page.locator('body').evaluate(el => getComputedStyle(el).transitionDuration.split(',').every(t => parseFloat(t)<=.001)));
  return report;
}

// Targeted TASK-125 review regression. Does not repeat the original 72-case suite.
export async function verifyRefreshDeferral(page, { baseURL = 'http://127.0.0.1:5184', evidenceDir } = {}) {
  const report = { capturedAt: new Date().toISOString(), decision: 'Astra moved controlled in-place refresh to TASK-126; TASK-125 exposes no refresh control.', checks: [], screenshots: [] };
  const check = (name, condition, detail) => { report.checks.push({name,pass:!!condition,detail}); if(!condition)throw new Error(`${name}: ${JSON.stringify(detail)}`); };
  const routes = ['/', '/tasks', '/specs', '/timeline', '/tasks/TASK-115', '/specs/SPEC-057'];
  await page.goto(baseURL);
  await page.evaluate(()=>{localStorage.setItem('spm-workspace-v1',JSON.stringify({version:1,rail:'collapsed'}));});
  for(const mode of ['dark','light','system']) {
    await page.evaluate(mode=>localStorage.setItem('spm-color-mode',mode),mode);
    for(const [width,height] of [[1440,900],[1280,720],[768,900],[390,844]]) {
      await page.setViewportSize({width,height});
      for(const [index,route] of routes.entries()) {
        if(route!=='/' && (width!==1440 || mode==='system')) continue;
        await page.goto(baseURL+route);
        await page.getByRole('button',{name:'Workspace preferences',exact:true}).isEnabled();
        const state=await page.evaluate(()=>({headerHeight:document.querySelector('.topbar').getBoundingClientRect().height,width:innerWidth,documentWidth:document.documentElement.scrollWidth,refreshControls:[...document.querySelectorAll('button,a')].filter(el=>/refresh workspace/i.test(el.getAttribute('aria-label')||el.textContent)).length}));
        check(`${mode}/${width}${route}: Refresh is absent`,state.refreshControls===0);
        check(`${mode}/${width}${route}: header remains 44px`,state.headerHeight===44,state.headerHeight);
        check(`${mode}/${width}${route}: no document overflow`,state.documentWidth<=width,state.documentWidth);
        if(evidenceDir){const path=`${evidenceDir}/p1-${mode}-${width}-${index}.png`;await page.screenshot({path});report.screenshots.push(path);}
      }
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.goto(baseURL+'/tasks?spec=SPEC-057');
  await page.getByRole('button',{name:'Workspace preferences',exact:true}).click();
  await page.keyboard.press('Escape');
  await page.locator('.view-frame').evaluate(el=>el.scrollTop=Math.min(240,el.scrollHeight-el.clientHeight));
  const before=await page.evaluate(()=>({url:location.href,scroll:document.querySelector('.view-frame').scrollTop,title:document.title}));
  let abortedDataRequests=0, fullNavigations=0;
  const onNavigation=frame=>{if(frame===page.mainFrame())fullNavigations++;};
  page.on('framenavigated',onNavigation);
  const abort=route=>{abortedDataRequests++;return route.abort('failed');};
  await page.route('**/__data.json*',abort);
  await page.getByRole('button',{name:'Workspace preferences',exact:true}).click();
  await page.keyboard.press('Escape');
  const after=await page.evaluate(()=>({url:location.href,scroll:document.querySelector('.view-frame').scrollTop,title:document.title,focus:document.activeElement?.getAttribute('aria-label')}));
  await page.unroute('**/__data.json*',abort);
  page.off('framenavigated',onNavigation);
  check('No obsolete refresh control is offered during network failure',await page.getByRole('button',{name:'Refresh workspace',exact:true}).count()===0);
  check('Preference interaction does not request SvelteKit data',abortedDataRequests===0,abortedDataRequests);
  check('Preference interaction does not trigger full navigation',fullNavigations===0,fullNavigations);
  check('Current URL and view identity survive',before.url===after.url&&before.title===after.title,{before,after});
  check('Current scroll is preserved',before.scroll===after.scroll,{before:before.scroll,after:after.scroll});
  check('Escape restores focus',after.focus==='Workspace preferences',after.focus);
  return report;
}
