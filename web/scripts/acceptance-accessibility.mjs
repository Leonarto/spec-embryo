// axe source is pinned/integrity-verified temporary tooling; never a product dependency.
export async function auditAccessibility(page,{source,expectedVersion='4.11.4',label}){
 await page.addScriptTag({content:source});const version=await page.evaluate(()=>window.axe?.version);if(version!==expectedVersion)throw Error(`axe version mismatch: ${version}`);
 const result=await page.evaluate(async()=>{const report=await window.axe.run(document);return {testEngine:report.testEngine,testEnvironment:report.testEnvironment,url:report.url,violations:report.violations,incomplete:report.incomplete,passes:report.passes.map(p=>({id:p.id,nodeCount:p.nodes.length})),inapplicable:report.inapplicable.map(p=>p.id)};});
 const blocking=result.violations.filter(v=>v.impact==='serious'||v.impact==='critical');
 return {label,version,...result,scope:'Automated serious/critical axe only; incomplete results require separate review',manualReviewRequired:result.incomplete.length>0,blockingCount:blocking.length,pass:blocking.length===0,screenReaders:'Not certified by axe; record manual environments separately'};
}
