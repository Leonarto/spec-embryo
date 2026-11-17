// A separate bounded visibility observation. Never edits/invokes the frozen100-row detail collector.
export function skeletonEvidence(sample){
 if(!sample||sample.trusted!==true||!Number.isFinite(sample.eventTimestamp)||!Number.isFinite(sample.capturedAt)||sample.eventTimestamp<0||sample.capturedAt<0||sample.eventTimestamp>sample.capturedAt)return {status:'NOT PROVEN',reason:'No trusted click observation',budgetMs:100};
 const observations=[['skeleton',sample.skeletonAt],['accepted content',sample.contentAt]].filter(([,time])=>Number.isFinite(time));
 if(!observations.length)return {status:'NOT PROVEN',reason:'No visible skeleton/content frame captured',budgetMs:100};
 const [kind,time]=observations.sort((a,b)=>a[1]-b[1])[0],delayMs=time-sample.eventTimestamp;
 if(delayMs<0||time<sample.capturedAt||(Number.isFinite(sample.stoppedAt)&&time>sample.stoppedAt))return {status:'NOT PROVEN',reason:'Inconsistent observation clock',budgetMs:100};
 return {status:delayMs<=100?'PASS':'FAIL',observed:kind,delayMs,budgetMs:100};
}
/** Caller supplies a settled page and real link; owns closing the inspector/page afterwards. */
export async function observeDetailSkeleton(page,{selector,kind,id,deadlineMs=15000}){
 const result={scope:'Separate single trusted-click visibility check; not detail latency or100-row acceptance'};
 try{const anchor=page.locator(selector);await anchor.scrollIntoViewIfNeeded();await anchor.evaluate((node,{kind,id})=>{
  window.__acceptanceSkeleton?.cleanup();const host=document.querySelector('.inspector-host');if(!host)throw Error('Inspector host unavailable');
  const state={start:null,eventTimestamp:null,capturedAt:null,trusted:false,skeletonAt:null,contentAt:null,errorAt:null};let frame;
  const visible=element=>{if(!element)return false;const box=element.getBoundingClientRect(),style=getComputedStyle(element);const clip=host.querySelector('.inspector-reader')?.getBoundingClientRect()??host.getBoundingClientRect();return box.width>1&&box.height>1&&box.right>Math.max(0,clip.left)&&box.left<Math.min(innerWidth,clip.right)&&box.bottom>Math.max(0,clip.top)&&box.top<Math.min(innerHeight,clip.bottom)&&style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0';};
  const scan=()=>{if(state.start===null)return;const identity=host.querySelector('.inspector-topline .identity')?.textContent?.replace(/\s+/g,' ').trim(),matches=identity===kind+' · '+id;
   if(matches&&visible(host)){if(state.skeletonAt===null&&visible(host.querySelector('.skeleton[role=status]')))state.skeletonAt=performance.now();if(state.contentAt===null&&host.querySelector('.inspector-reader')?.getAttribute('aria-busy')==='false'&&visible(host.querySelector('.detail-shell')))state.contentAt=performance.now();if(state.errorAt===null&&visible(host.querySelector('.detail-error')))state.errorAt=performance.now();}
   if(state.contentAt===null&&state.errorAt===null)frame=requestAnimationFrame(scan);
  };
  const clicked=event=>{state.eventTimestamp=event.timeStamp;state.start=event.timeStamp;state.capturedAt=performance.now();state.trusted=event.isTrusted;frame=requestAnimationFrame(scan);};node.addEventListener('click',clicked,{capture:true,once:true});window.__acceptanceSkeleton={state,cleanup:()=>{cancelAnimationFrame(frame);node.removeEventListener('click',clicked,{capture:true});}};
 },{kind,id});await anchor.click();await page.waitForFunction(()=>{const state=window.__acceptanceSkeleton?.state;return state&&(state.contentAt!==null||state.errorAt!==null);},undefined,{timeout:deadlineMs});
 }catch(error){result.error=String(error);}
 try{result.observation=await page.evaluate(()=>{const probe=window.__acceptanceSkeleton;if(!probe)return null;const state={...probe.state,stoppedAt:performance.now()};probe.cleanup();delete window.__acceptanceSkeleton;return state;});}catch(error){result.cleanupError=String(error);}
 result.evidence=skeletonEvidence(result.observation);result.pass=!result.error&&!result.cleanupError&&result.evidence.status==='PASS';return result;
}
