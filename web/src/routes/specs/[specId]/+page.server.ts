import {parseRelationPages} from '../../../../../src/services/detail-relations.ts';
import {error,fail} from '@sveltejs/kit';
import type {Actions,PageServerLoad} from './$types';
import {resolveProjectRoot} from '../../../lib/server/project-root.ts';
import {getWorkspaceDetail} from '../../../lib/server/detail.ts';
import {submitSpecAnswers} from '../../../lib/server/spec-answers.ts';
export const load:PageServerLoad=async({params,locals,url})=>{
 try{
  const {detail,revision:sourceRevision,pages,generatedAt}=await getWorkspaceDetail(locals,{kind:'spec',id:params.specId},parseRelationPages('spec',url?.searchParams??new URLSearchParams()));
  if(!detail.found){if(locals.specAnswerOutcome)return {detail:null,answerOutcome:locals.specAnswerOutcome.result,specId:params.specId};error(404,`Spec ${params.specId} was not found in the current managed memory.`);}
  return {detail,sourceRevision,pages,generatedAt,answerOutcome:locals.specAnswerOutcome?.result};
 }catch(cause){if(locals.specAnswerOutcome)return {detail:null,answerOutcome:locals.specAnswerOutcome.result,specId:params.specId};throw cause;}
};
export const actions:Actions={answerOpenQuestions:async({params,request,locals})=>{
 const outcome=await submitSpecAnswers(resolveProjectRoot(),params.specId,await request.formData(),value=>{if(locals){locals.specAnswerOutcome=value;locals.workspaceSource=undefined;}});
 return outcome.status>=400?fail(outcome.status,outcome.result):outcome.result;
}};
