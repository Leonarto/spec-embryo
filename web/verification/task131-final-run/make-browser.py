import json,pathlib,sys
repo=pathlib.Path('/Users/leonardodiazvidal/Documents/dev-projects/spec-pm');out=pathlib.Path('/private/tmp/spm-task131-final-run');phase=sys.argv[1];r=json.loads((out/f'start-{sys.argv[2]}.json').read_text());record=json.loads((out/'identity-oracles.json').read_text());base=r['url'].rstrip('/')
nav=(repo/'web/scripts/acceptance-navigation.mjs').read_text().replace('export ','')
modules=nav
if phase=='detail':
 modules+='\n'+(repo/'web/scripts/detail-relations-browser-profile.mjs').read_text().replace('export ','');body=f'const page=await owned.context.newPage();report=await profileDetailReaders(page,{{baseURL:{json.dumps(base)}}});'
elif phase=='warm':
 routes={x['route']:{**x['page100'],'url':base+x['page100']['path']}for x in record['plans']};body=f'report=await warmBrowserSeries(browserType,{{profile:{json.dumps(r["profile"])},expectedVersion:"157.0.8103.78",launchOptions:{{executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true}},routes:{json.dumps(routes)}}});'
elif phase=='cold':
 x=next(x for x in record['plans'] if x['route']==sys.argv[3]);expect={**x['page100'],'url':base+x['page100']['path']};body=f'report=await coldBrowserSample(browserType,{{profile:{json.dumps(r["profile"])},expectedVersion:"157.0.8103.78",launchOptions:{{executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true}},expected:{json.dumps(expect)}}});'
elif phase=='interactions':
 modules+='\n'+(repo/'web/scripts/acceptance-interactions.mjs').read_text().replace('export ','');routes=record['plans']
 for route in routes:
  for oracle in [route['page100'],route['page200'],*route['search']]:oracle['url']=base+oracle['path']
 options={'identity':{'fixture':record['fixtures'][0],'source':record['head'],'runtime':r},'routes':routes,'smoke':False};body=f'const page=await owned.context.newPage();page.setDefaultTimeout(30000);report=await runAcceptanceInteractions(page,{json.dumps(options)});'
elif phase=='retention':
 modules+='\n'+(repo/'web/scripts/acceptance-retention.mjs').read_text().replace('export ','');x=record['plans'][0];body=f'report=await retentionSmoke(owned.context,{{url:{json.dumps(base+x["page100"]["path"])},taskIDs:{json.dumps(x["page100"]["ids"][:5])}}});'
elif phase=='skeleton':
 modules+='\n'+(repo/'web/scripts/acceptance-detail-loading.mjs').read_text().replace('export ','');body=f'''const page=await owned.context.newPage();page.setDefaultTimeout(30000);await page.goto({json.dumps(base+'/tasks?sort=id.asc&scope=all')});await page.waitForFunction(()=>document.querySelector('.inspector-layout.enhanced'));report={{observations:[]}};report.observations.push({{kind:'task',...await observeDetailSkeleton(page,{{selector:'tr[data-entity-id="TASK-00001"] a[data-column-key="id"]',kind:'task',id:'TASK-00001'}})}});report.observations.push({{kind:'spec',...await observeDetailSkeleton(page,{{selector:'.inspector-reader a[href="/specs/SPEC-00001"]',kind:'spec',id:'SPEC-00001'}})}});await page.getByRole('button',{{name:'Close inspector',exact:true}}).click();'''
else:raise Exception(phase)
if phase in ('warm','cold'):code='async (page)=>{\n'+modules+'\nconst browserType=page.context().browser().browserType();let report;'+body+'return report;}';
else:code='async (page)=>{\n'+modules+f'''\nconst browserType=page.context().browser().browserType();let owned,report;try{{owned=await ownBrowserContext(browserType,{json.dumps(r['profile'])},{{expectedVersion:'157.0.8103.78',launchOptions:{{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}}}});{body}report.browser=owned.metadata;}}catch(error){{report??={{}};report.error=String(error);}}finally{{if(owned){{try{{await owned.context.close();}}catch(error){{(report.cleanupErrors??=[]).push(String(error));}}report.browserClosed=!owned.context.browser().isConnected();}}}}return report;}}'''
(out/f'{phase}-{sys.argv[2]}.mjs').write_text(code)
print(str(out/f'{phase}-{sys.argv[2]}.mjs'))
