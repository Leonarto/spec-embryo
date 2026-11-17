import { error, json } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { expectedWorkspaceStatus, resolveUiProject } from '../../src/services/ui-projects.ts';
import { resolveProjectRoot } from './lib/server/project-root.ts';
const endpoints=new Set(['/workspace-data','/workspace-options','/workspace-detail','/workspace-relations']);
export const handle:Handle=async({event,resolve})=>{
 try { event.locals.projectSelection=await resolveUiProject(event.url.searchParams,resolveProjectRoot(),process.env.SPM_UI_REGISTRY||undefined); }
 catch(cause){
  if(event.request.method==='POST' && /^\/specs\/[^/]+$/.test(event.url.pathname)){event.locals.projectSelectionError=true;event.locals.projectSelection=await resolveUiProject(new URLSearchParams(),resolveProjectRoot(),process.env.SPM_UI_REGISTRY||undefined);}
  else {const message=cause instanceof Error?cause.message:'Project selection could not be resolved.';if(endpoints.has(event.url.pathname))return json({error:message},{status:400,headers:{'Cache-Control':'no-store'}});error(400,message);}
 }
 if(endpoints.has(event.url.pathname)){
  const status=expectedWorkspaceStatus(event.locals.projectSelection,event.request.headers.get('x-spm-workspace-key'));
  if(status)return json({error:status===409?'Project changed. Reload the page.':'Workspace identity is required.'},{status,headers:{'Cache-Control':'no-store'}});
 }
 return resolve(event);
};
