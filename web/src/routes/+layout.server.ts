import {parseRelationPages} from '../../../src/services/detail-relations.ts';
import type {LayoutServerLoad} from './$types';
import {buildWorkspaceShell} from '../../../src/services/workspace.ts';
import {normalizeViewQuery,type WorkspaceRoute} from '../../../src/services/workspace-query.ts';
import {getWorkspaceRequestSource} from '../lib/server/workspace.ts';
import {getWorkspaceDetail} from '../lib/server/detail.ts';
export const load:LayoutServerLoad=async({locals,url})=>{
  const source=await getWorkspaceRequestSource(locals);
  const route=['/tasks','/specs','/timeline'].includes(url.pathname)?url.pathname.slice(1) as WorkspaceRoute:undefined;
  const identity=route?normalizeViewQuery(route,url.searchParams).inspect:undefined;
  let inspector=null,inspectorReadError=false;
  if(identity)try{inspector=await getWorkspaceDetail(locals,identity,parseRelationPages(identity.kind,url.searchParams));}catch{inspectorReadError=true;}
  return {shell:buildWorkspaceShell(source),inspector,inspectorReadError};
};
