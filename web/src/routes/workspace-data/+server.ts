import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { buildWorkspaceEnvelope } from "../../../../src/services/workspace.ts";
import { getWorkspaceRequestSource } from "../../lib/server/workspace.ts";
const headers={'Cache-Control':'no-store'};
export const GET:RequestHandler=async({locals,url})=>{
  const route=url.searchParams.get('route');
  if(route!=='overview'&&route!=='tasks'&&route!=='specs'&&route!=='timeline')return json({error:'Unsupported workspace view.'},{status:400,headers});
  try{return json(await buildWorkspaceEnvelope(await getWorkspaceRequestSource(locals),route,url.searchParams),{headers});}
  catch{return json({error:'Workspace data could not be loaded. Retry after checking the local project files.'},{status:500,headers});}
};
