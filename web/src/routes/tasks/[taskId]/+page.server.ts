import {error} from '@sveltejs/kit';
import type {PageServerLoad} from './$types';
import {getWorkspaceDetail} from '../../../lib/server/detail.ts';
export const load:PageServerLoad=async({params,locals})=>{
  const {detail}=await getWorkspaceDetail(locals,{kind:'task',id:params.taskId});
  if(!detail.found)error(404,`Task ${params.taskId} was not found in the current managed memory.`);
  return {detail};
};
