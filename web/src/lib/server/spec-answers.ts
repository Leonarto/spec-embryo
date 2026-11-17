import {answerSpecOpenQuestions,loadProjectContext} from '../../../../src/repository.ts';
import {buildSpecDetailFromContext} from '../../../../src/services/details.ts';
import {buildSpecAnswerEvaluation} from '../../../../src/services/spec-answer-evaluation.ts';
import {normalizeSpecAnswers,SpecQuestionWriteError,type SpecAnswerInput} from '../../../../src/services/spec-questions.ts';
import type {ProjectContext} from '../../../../src/domain.ts';
import type {SpecDetailActionResult} from '../components/detail/types.ts';
export const revisionPattern=/^[a-f0-9]{64}$/;
function pairs(form:FormData,question:string,answer:string):SpecAnswerInput[]{
 const qs=form.getAll(question),as=form.getAll(answer);
 if(qs.length!==as.length||qs.some(v=>typeof v!=='string')||as.some(v=>typeof v!=='string'))throw new SpecQuestionWriteError('validation','Questions and answers must be text pairs.');
 return qs.map((q,i)=>({question:q as string,answer:as[i] as string}));
}
export interface SpecAnswerOutcome {workspaceMismatch?:boolean;status:number;result:SpecDetailActionResult;context?:ProjectContext}
/** Exact echoes are separate from the repository's existing saved-value normalization. */
export async function submitSpecAnswers(root:string,id:string,form:FormData,record:(outcome:SpecAnswerOutcome)=>void=()=>{},dependencies={load:loadProjectContext,write:answerSpecOpenQuestions},workspaceStatus=0):Promise<SpecAnswerOutcome>{
 let postContext:ProjectContext|undefined;
 let drafts:SpecAnswerInput[]=[],recovery:SpecAnswerInput[]=[],baseRevision:string|undefined;
 const finish=(status:number,result:SpecDetailActionResult)=>{const value={status,context:postContext,result:{action:'answerOpenQuestions',submittedDrafts:drafts,recovery,baseRevision,...result}};record(value);return value;};
 try{
  drafts=pairs(form,'question','answer');recovery=pairs(form,'recoveryQuestion','recoveryAnswer');
  const revs=form.getAll('specRevision'),acks=form.getAll('acknowledgedRevision');
  if(revs.length>1||revs.some(v=>typeof v!=='string'||!revisionPattern.test(v))||acks.length>1||acks.some(v=>typeof v!=='string'||!revisionPattern.test(v)))throw new SpecQuestionWriteError('validation','Invalid or duplicate spec revision.');
  baseRevision=revs[0] as string|undefined;
  if(workspaceStatus)return finish(workspaceStatus,{workspaceMismatch:true,error:workspaceStatus===409?"The selected project changed. Your answers are preserved; reload and review before saving.":"Workspace identity is required. Your answers are preserved."});
  const expectedRevision=acks[0] as string|undefined??baseRevision;
  if(form.get('intent')==='discardRecovery')return finish(200,{recovery:[],redisplay:true});
  normalizeSpecAnswers(drafts);
  const committed=await dependencies.write(root,id,drafts,{expectedRevision});
  const result:SpecDetailActionResult={success:true,savedCount:drafts.filter(v=>v.question.trim()&&v.answer.trim()).length,answeredQuestions:committed.answeredQuestions,committedRevision:committed.committedRevision,committedQuestions:committed.remainingQuestions.map(question=>({question})),refreshWarning:committed.cleanupWarning};
  // Record the write before any optional read/evaluation: subsequent page loading cannot erase it.
  finish(200,result);
  try{
   const context=postContext=await dependencies.load(root),detail=buildSpecDetailFromContext(context,id),spec=context.specs.find(s=>s.id===id);
   if(!detail.found||!spec)throw new Error('missing');
   result.evaluation=buildSpecAnswerEvaluation({spec,linkedTasks:detail.linkedTasks,answeredQuestions:committed.answeredQuestions,remainingOpenQuestions:detail.openQuestions,resolvedDecisions:detail.resolvedDecisions});
   result.currentRevision=detail.specRevision;result.currentQuestions=detail.openQuestions;result.currentDecisions=detail.resolvedDecisions;
  }catch{result.refreshWarning='Answers were saved, but refreshed details could not be loaded. Reload details when available.';}
  return finish(200,result);
 }catch(error){
  const status=error instanceof SpecQuestionWriteError?error.code==='not_found'?404:error.code==='conflict'?409:400:500;
  const result:SpecDetailActionResult={error:error instanceof SpecQuestionWriteError?error.message:'Answers could not be saved. Try again after reviewing the current version.'};
  try{const context=postContext=await dependencies.load(root),detail=buildSpecDetailFromContext(context,id);if(detail.found){result.currentRevision=detail.specRevision;result.currentQuestions=detail.openQuestions;result.currentDecisions=detail.resolvedDecisions;}}
  catch{/* Recovery remains readable even if the current source is unavailable. */}
  return finish(status,result);
 }
}
