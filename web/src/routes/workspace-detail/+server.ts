import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {parseInspectorIdentity} from '../../../../src/services/workspace-detail.ts';
import {getWorkspaceDetail} from '../../lib/server/detail.ts';
const headers={'Cache-Control':'no-store'};
export const GET:RequestHandler=async({locals,url})=>{
  const identity=parseInspectorIdentity(url.searchParams.get('kind'),url.searchParams.get('id'));
  if(!identity)return json({error:'Invalid inspector identity.'},{status:400,headers});
  try{const envelope=await getWorkspaceDetail(locals,identity);return json(envelope,{status:envelope.detail.found?200:404,headers});}
  catch{return json({error:'Detail could not be loaded. Retry after checking the local project files.'},{status:500,headers});}
};
