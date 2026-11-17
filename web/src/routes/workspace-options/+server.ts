import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { queryWorkspaceOptions } from "../../../../src/services/workspace.ts";
import { parseWorkspaceOptionsQuery,parseWorkspaceListQuery } from "../../../../src/services/workspace-query.ts";
import { getWorkspaceRequestSource } from "../../lib/server/workspace.ts";
const headers={'Cache-Control':'no-store'};
export const GET:RequestHandler=async({locals,url})=>{
  try{
    const source=await getWorkspaceRequestSource(locals);
    const params=new URLSearchParams(url.searchParams);
    params.set('option_q',params.get('q')??'');params.set('option_page',params.get('page')??'1');params.set('option_pageSize',params.get('pageSize')??'50');
    const selected=parseWorkspaceListQuery('spec',params,source.knownSpecIds).specIds;
    return json(queryWorkspaceOptions(source,parseWorkspaceOptionsQuery(params,selected)),{headers});
  }catch{return json({error:'Spec options could not be loaded. Retry.'},{status:500,headers});}
};
