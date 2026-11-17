import {parseRelationPages} from '../../../../../src/services/detail-relations.ts';
import {error} from '@sveltejs/kit';
import type {PageServerLoad} from './$types';
import {getWorkspaceDetail} from '../../../lib/server/detail.ts';
export const load:PageServerLoad=async({params,locals,url})=>{
  const {detail,revision:sourceRevision,pages,generatedAt}=await getWorkspaceDetail(locals,{kind:'task',id:params.taskId},parseRelationPages('task',url?.searchParams??new URLSearchParams()));
  if(!detail.found)error(404,`Task ${params.taskId} was not found in the current managed memory.`);
  return {detail,sourceRevision,pages,generatedAt};
};
