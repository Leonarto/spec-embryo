import {normalizeQuestion} from '../../../../../src/services/spec-questions.ts';
import type {SpecDetailActionResult,QuestionDraft} from './types.ts';
export interface QuestionSnapshot {revision:string|null;questions:Array<{question:string}>;decisions?:Array<{question?:string;answer:string}>}
export interface EditorField extends QuestionDraft {key:string;baseline:string}
export interface QuestionEditor {identity:string;base:QuestionSnapshot;fields:EditorField[];recovery:QuestionDraft[];latest?:QuestionSnapshot;missing:boolean;latestStale:boolean;saving:boolean;unknown:boolean;generation:number;outcome?:SpecDetailActionResult}
function fields(questions:Array<{question:string}>,values:QuestionDraft[]=[]):EditorField[]{
 const counts=new Map<string,number>();
 return questions.map((q,index)=>{const text=normalizeQuestion(q.question),occurrence=counts.get(text)??0;counts.set(text,occurrence+1);const matches=values.filter(v=>normalizeQuestion(v.question)===text);return {question:q.question,key:JSON.stringify([text,occurrence]),answer:matches[occurrence]?.answer??'',baseline:''};});
}
export function createQuestionEditor(identity:string,snapshot:QuestionSnapshot,echo?:SpecDetailActionResult):QuestionEditor{
 const base=echo?.success&&echo.committedRevision?{revision:echo.committedRevision,questions:echo.committedQuestions??snapshot.questions}:echo?.submittedDrafts&&!echo.success?{revision:echo.baseRevision??null,questions:echo.submittedDrafts}:snapshot;
 return {identity,base,fields:fields(base.questions,echo?.submittedDrafts),recovery:echo?.recovery??[],latest:snapshot,latestStale:false,missing:false,saving:false,unknown:false,generation:0,outcome:echo};
}
export function editorProtected(editor:QuestionEditor){return editor.saving||editor.unknown||editor.recovery.length>0||editor.fields.some(f=>f.answer!==f.baseline);}
export function externalChange(editor:QuestionEditor){return !editor.latestStale&&editor.latest&&editor.latest.revision!==editor.base.revision;}
export function ingestQuestionSnapshot(editor:QuestionEditor,snapshot:QuestionSnapshot|null):QuestionEditor{
 if(!snapshot)return {...editor,missing:true,latest:undefined,latestStale:false};
 if(editorProtected(editor)||externalChange(editor)||editor.outcome?.success&&snapshot.revision!==editor.base.revision)return {...editor,latest:snapshot,latestStale:false,missing:false};
 if(snapshot.revision===editor.base.revision)return {...editor,latest:snapshot,latestStale:false,missing:false};
 return {...editor,base:snapshot,fields:fields(snapshot.questions),latest:snapshot,latestStale:false,missing:false};
}
export function reviewQuestionSnapshot(editor:QuestionEditor):QuestionEditor{
 const latest=editor.latest;if(!latest?.revision||editor.latestStale||editor.saving)return editor;
 const available=new Map<string,number>();for(const q of latest.questions){const key=normalizeQuestion(q.question);available.set(key,(available.get(key)??0)+1);}
 const kept:QuestionDraft[]=[],recovery=[...editor.recovery];
 for(const f of editor.fields){const key=normalizeQuestion(f.question),count=available.get(key)??0;if(count){available.set(key,count-1);kept.push(f);}else if(f.answer.length)recovery.push({question:f.question,answer:f.answer});}
 return {...editor,base:latest,fields:fields(latest.questions,kept),recovery,unknown:false,outcome:undefined};
}
export function editAnswer(editor:QuestionEditor,key:string,answer:string):QuestionEditor{return editor.saving?editor:{...editor,fields:editor.fields.map(f=>f.key===key?{...f,answer}:f)};}
export function freezeQuestionSubmission(editor:QuestionEditor){return {generation:editor.generation+1,identity:editor.identity,revision:editor.base.revision,pairs:editor.fields.map(({question,answer})=>({question,answer})),recovery:editor.recovery.map(v=>({...v}))};}
export function completeQuestionSubmission(editor:QuestionEditor,submission:ReturnType<typeof freezeQuestionSubmission>,result:SpecDetailActionResult):QuestionEditor{
 if(submission.identity!==editor.identity||submission.generation!==editor.generation)return editor;
 if(!result.success)return {...editor,saving:false,outcome:result,latest:result.currentQuestions?{revision:result.currentRevision??null,questions:result.currentQuestions,decisions:result.currentDecisions}:editor.latest,latestStale:false};
 const answered=new Set((result.answeredQuestions??[]).map(normalizeQuestion));
 const remaining=editor.fields.filter(f=>!answered.has(normalizeQuestion(f.question)));
 const base={revision:result.committedRevision??null,questions:remaining.map(f=>({question:f.question}))};
 return {...editor,base,fields:remaining,recovery:submission.recovery,saving:false,unknown:false,latest:undefined,latestStale:true,outcome:result};
}
