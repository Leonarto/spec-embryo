import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {parseInspectorIdentity,buildWorkspaceRelationEnvelope} from '../../../../src/services/workspace-detail.ts';
import {isDetailRelation} from '../../../../src/services/detail-relations.ts';
import {getWorkspaceRequestSource} from '../../lib/server/workspace.ts';
const headers={'Cache-Control':'no-store'};
export const GET:RequestHandler=async({locals,url})=>{
 const identity=parseInspectorIdentity(url.searchParams.get('kind'),url.searchParams.get('id')),relation=url.searchParams.get('relation');
 if(!identity||!isDetailRelation(identity.kind,relation))return json({error:'Invalid relation identity.'},{status:400,headers});
 try{const envelope=buildWorkspaceRelationEnvelope(await getWorkspaceRequestSource(locals),identity,relation,url.searchParams.get('page'));
  return envelope?json(envelope,{headers}):json({schemaVersion:2,...identity,error:'Entity not found.'},{status:404,headers});
 }catch{return json({error:'Relations could not be loaded. Retry after checking the local project files.'},{status:500,headers});}
};
