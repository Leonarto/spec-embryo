import {expect,test} from 'bun:test';
import {createQuestionEditor,editAnswer,editorProtected,externalChange,ingestQuestionSnapshot,reviewQuestionSnapshot,freezeQuestionSubmission,completeQuestionSubmission} from '../web/src/lib/components/detail/question-editor.ts';
import {SpecOutcomeFence} from '../web/src/lib/inspector/spec-outcome-fence.ts';
const snapshot=(revision='a',questions=['First?','Second?'])=>({revision,questions:questions.map(question=>({question}))});
test('baseline-relative exact drafts survive metadata/reorder; review matches exact occurrences with recovery',()=>{
 let e=createQuestionEditor('p/SPEC-1',snapshot());e=editAnswer(e,e.fields[0]!.key,' ');expect(editorProtected(e)).toBe(true);
 e=editAnswer(e,e.fields[0]!.key,'');expect(editorProtected(e)).toBe(false);e=editAnswer(e,e.fields[0]!.key,' exact  ');
 e=ingestQuestionSnapshot(e,snapshot('b',['Second?','Changed?']));expect(e.fields.map(v=>v.question)).toEqual(['First?','Second?']);expect(e.fields[0]!.answer).toBe(' exact  ');expect(externalChange(e)).toBe(true);
 e=reviewQuestionSnapshot(e);expect(e.base.revision).toBe('b');expect(e.recovery).toEqual([{question:'First?',answer:' exact  '}]);expect(editorProtected(e)).toBe(true);
});
test('echo is dirty, same revision refresh preserves draft, missing remains protected',()=>{
 let e=createQuestionEditor('p/s',snapshot(),{submittedDrafts:[{question:'First?',answer:'echo'}],baseRevision:'old'});expect(editorProtected(e)).toBe(true);
 e=ingestQuestionSnapshot(e,snapshot('old'));expect(e.fields[0]!.answer).toBe('echo');e=ingestQuestionSnapshot(e,null);expect(e.missing).toBe(true);expect(e.fields[0]!.answer).toBe('echo');
});
test('submission freezes exact values; success preserves recovery and rejects foreign generations',()=>{
 let e=createQuestionEditor('p/s',snapshot());e=editAnswer(e,e.fields[0]!.key,' value ');e={...e,recovery:[{question:'removed',answer:'keep'}]};const submitted=freezeQuestionSubmission(e);e={...e,saving:true,generation:submitted.generation};
 expect(editAnswer(e,e.fields[0]!.key,'changed')).toBe(e);expect(submitted.pairs[0]!.answer).toBe(' value ');
 expect(completeQuestionSubmission(e,{...submitted,identity:'other'},{success:true})).toBe(e);
 e=completeQuestionSubmission(e,submitted,{success:true,answeredQuestions:['First?'],committedRevision:'written'});expect(e.base.revision).toBe('written');expect(e.fields.map(v=>v.question)).toEqual(['Second?']);expect(e.latestStale).toBe(true);expect(e.recovery[0]!.answer).toBe('keep');expect(editorProtected(e)).toBe(true);
});
test('document session fence is identity-only, stable across instances until a real new session',()=>{
 const f=new SpecOutcomeFence();expect(f.fenced('project','SPEC-1')).toBe(false);expect(f.mark('project','SPEC-1')).toBe(1);expect(f.fenced('project','SPEC-1')).toBe(true);expect(f.fenced('other','SPEC-1')).toBe(false);expect(f.mark('project','SPEC-1')).toBe(2);expect(new SpecOutcomeFence().fenced('project','SPEC-1')).toBe(false);
});
test('initial noJS confirmed outcome bases only on committed revision/questions; later external read needs acknowledgement',()=>{
 const e=createQuestionEditor('p/s',snapshot('later',['Externally added?']),{success:true,committedRevision:'written',committedQuestions:[{question:'Remaining at write?'}],answeredQuestions:['First?']});expect(e.base.revision).toBe('written');expect(e.fields.map(v=>v.question)).toEqual(['Remaining at write?']);expect(externalChange(e)).toBe(true);expect(e.latest?.questions).toEqual([{question:'Externally added?'}]);
});
test('partial save retains unresolved whitespace dirty in JS completion and initial noJS success',()=>{
 let e=createQuestionEditor('p/s',snapshot());e=editAnswer(e,e.fields[0]!.key,'saved');e=editAnswer(e,e.fields[1]!.key,'  ');const submitted=freezeQuestionSubmission(e);e={...e,saving:true,generation:submitted.generation};
 const result={success:true,committedRevision:'written',committedQuestions:[{question:'Second?'}],answeredQuestions:['First?'],submittedDrafts:submitted.pairs};
 const complete=completeQuestionSubmission(e,submitted,result);expect(complete.fields[0]!.answer).toBe('  ');expect(complete.fields[0]!.baseline).toBe('');expect(editorProtected(complete)).toBe(true);
 const initial=createQuestionEditor('p/s',snapshot('written',['Second?']),result);expect(initial.fields[0]!.answer).toBe('  ');expect(initial.fields[0]!.baseline).toBe('');expect(editorProtected(initial)).toBe(true);
});
