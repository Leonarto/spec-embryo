import {parseRelationPages} from '../../../../../src/services/detail-relations.ts';
import {error,fail} from '@sveltejs/kit';
import type {Actions,PageServerLoad} from './$types';
import {expectedWorkspaceStatus} from '../../../../../src/services/ui-projects.ts';
import {getWorkspaceDetail} from '../../../lib/server/detail.ts';
import {submitSpecAnswers} from '../../../lib/server/spec-answers.ts';
export const load:PageServerLoad=async({params,locals,url})=>{
 if(locals.specAnswerOutcome?.workspaceMismatch)return {detail:null,answerOutcome:locals.specAnswerOutcome.result,specId:params.specId};
 try{
  const {detail,revision:sourceRevision,pages,generatedAt}=await getWorkspaceDetail(locals,{kind:'spec',id:params.specId},parseRelationPages('spec',url?.searchParams??new URLSearchParams()));
  if(!detail.found){if(locals.specAnswerOutcome)return {detail:null,answerOutcome:locals.specAnswerOutcome.result,specId:params.specId};error(404,`Spec ${params.specId} was not found in the current managed memory.`);}
  return {detail,sourceRevision,pages,generatedAt,answerOutcome:locals.specAnswerOutcome?.result};
 }catch(cause){if(locals.specAnswerOutcome)return {detail:null,answerOutcome:locals.specAnswerOutcome.result,specId:params.specId};throw cause;}
};
export const actions:Actions={answerOpenQuestions:async({params,request,locals})=>{
 const form=await request.formData(), selection=locals.projectSelection!;
 const keys=form.getAll('expectedWorkspaceKey');
 const status=locals.projectSelectionError?409:keys.length>1||keys.some(key=>typeof key!=='string')?400:expectedWorkspaceStatus(selection,keys[0] as string|undefined??null);
 const outcome=await submitSpecAnswers(selection.root,params.specId,form,value=>{if(locals){locals.specAnswerOutcome={...value,workspaceMismatch:status!==0};locals.workspaceSource=undefined;}},undefined,status);
 return outcome.status>=400?fail(outcome.status,outcome.result):outcome.result;
}};
