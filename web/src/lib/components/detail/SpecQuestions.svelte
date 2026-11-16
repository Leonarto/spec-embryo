<script lang="ts">
 import {onMount,untrack} from 'svelte';
 import type {BoundedSpecDetail} from '../../../../../src/services/detail-relations.ts';
 import type {SpecDetailActionResult} from './types.ts';
 import {createQuestionEditor,editAnswer,editorProtected,externalChange,ingestQuestionSnapshot,reviewQuestionSnapshot,freezeQuestionSubmission,completeQuestionSubmission,type QuestionSnapshot} from './question-editor.ts';
 import {questionReader,questionNavigation,type QuestionRegistration} from './question-context.ts';
 import {specOutcomeFence} from '../../inspector/spec-outcome-fence.ts';
 import {getWorkspaceRefresh} from '../../workspace/context.svelte.ts';
 let {detail,actionResult,projectKey}:{detail:BoundedSpecDetail;actionResult?:SpecDetailActionResult;projectKey:string}=$props();
 const snapshot=():QuestionSnapshot=>({revision:detail.specRevision,questions:detail.openQuestions,decisions:detail.resolvedDecisions});
 let editor=$state.raw(untrack(()=>createQuestionEditor(detail.spec.id,snapshot(),actionResult))),form:HTMLFormElement;
 const bridge=questionReader(),navigation=questionNavigation(),workspace=getWorkspaceRefresh();
 let mounted=$state(false);
 let lastDetail=untrack(()=>detail),savingWork:Promise<boolean>|undefined;
 const changed=$derived(externalChange(editor)),protectedDraft=$derived(editorProtected(editor));
 export function hasAnswerDraft(){return editorProtected(editor);}
 const registration:QuestionRegistration={protected:()=>editorProtected(editor),saving:()=>editor.saving,save:()=>save(),discard:()=>{editor=createQuestionEditor(detail.spec.id,snapshot());},accept:candidate=>{
  if(!candidate)return true;
  if(candidate.kind==='spec'&&candidate.id===editor.identity&&!candidate.detail.found&&editorProtected(editor)){editor=ingestQuestionSnapshot(editor,null);return false;}
  return true;
 }};
 onMount(()=>{mounted=true;const unregister=bridge?.register(registration)??navigation?.register(registration);return()=>unregister?.();});
 $effect(()=>{const next=detail;if(next!==lastDetail){lastDetail=next;editor=ingestQuestionSnapshot(editor,snapshot());}});
 async function performSave():Promise<boolean>{
  if(!form||!editor.base.revision||editor.missing||editor.unknown||changed)return false;
  const submitted=freezeQuestionSubmission(editor),body=new FormData(form); // Freeze before disabled fields leave FormData.
  editor={...editor,saving:true,generation:submitted.generation,outcome:undefined};
  try{
   const response=await fetch(form.action,{method:'POST',body,headers:{'x-sveltekit-action':'true',accept:'application/json'}});
   const {deserialize}=await import('./action-response.ts');
   const result=deserialize(await response.text());
   if(result.type!=='success'&&result.type!=='failure')throw new Error('unconfirmed');
   const data=result.data as SpecDetailActionResult;
   if(!data||data.action!=='answerOpenQuestions'||!data.success&&!data.error)throw new Error('unconfirmed');
   if(data.success){specOutcomeFence.mark(projectKey,editor.identity);bridge?.invalidate();editor={...editor,latest:undefined,latestStale:true};}
   editor=completeQuestionSubmission(editor,submitted,data);
   if(data.success){await Promise.allSettled([bridge?.refresh(),workspace?.active?.refresh()]);return !editorProtected(editor);}
   return false;
  }catch{
   specOutcomeFence.mark(projectKey,editor.identity);bridge?.invalidate();
   editor={...editor,saving:false,unknown:true,latest:undefined,latestStale:true,outcome:{error:'Save outcome not confirmed. Review the current version before trying again.'}};
   await bridge?.refresh();return false;
  }
 }
 function save():Promise<boolean>{if(savingWork)return savingWork;const work=performSave();savingWork=work;void work.finally(()=>{if(savingWork===work)savingWork=undefined;});return work;}
 function submit(event:SubmitEvent){event.preventDefault();if(!editor.saving)void save();}
</script>
<div class="questions" data-question-editor data-detail-section="questions">
 {#if editor.outcome?.success}<div class="feedback success" role="status"><strong>{editor.outcome.answeredQuestions?.length??editor.outcome.savedCount} question{(editor.outcome.answeredQuestions?.length??editor.outcome.savedCount)===1?'':'s'} resolved</strong>{#if editor.outcome.refreshWarning}<p>{editor.outcome.refreshWarning}</p>{/if}</div>{/if}
 {#if editor.outcome?.error}<p class="feedback warning" role="alert"><strong>Save error</strong> · {editor.outcome.error}</p>{/if}
 {#if editor.missing}<p class="feedback warning" role="alert">The current spec is missing. Your answers are kept for recovery; saving cannot recreate it.</p>{/if}
 {#if changed||editor.unknown}<section class="feedback warning" aria-label="Current version review"><strong>{editor.unknown?'Save outcome not confirmed':'This spec changed externally'}</strong><p>Your answers remain attached to the version you edited.</p>{#if editor.latest&&!editor.latestStale}<p>Current open questions</p><ul>{#each editor.latest.questions as question}<li>{question.question}</li>{/each}</ul>{#each editor.latest.decisions??[] as decision}<p>{decision.question}: {decision.answer}</p>{/each}{#if mounted}<button type="button" disabled={!editor.latest.revision||editor.saving} onclick={()=>editor=reviewQuestionSnapshot(editor)}>Review current version</button>{/if}{:else}<p>Current details are unavailable.</p>{#if mounted}<button type="button" onclick={()=>void bridge?.refresh()}>Retry current details</button>{:else}<a href={`/specs/${detail.spec.id}`}>Reload current details</a>{/if}{/if}</section>{/if}
 <form bind:this={form} class="question-form" method="POST" action={`/specs/${encodeURIComponent(detail.spec.id)}?/answerOpenQuestions`} onsubmit={submit}>
  {#if editor.base.revision}<input type="hidden" name="specRevision" value={editor.base.revision}/>{/if}
  <fieldset disabled={editor.saving||!editor.base.revision||editor.missing}>
   {#each editor.fields as field (field.key)}<label class="question-card"><input type="hidden" name="question" value={field.question}/><strong>{field.question}</strong><textarea name="answer" rows="4" value={field.answer} oninput={event=>editor=editAnswer(editor,field.key,event.currentTarget.value)} placeholder="Add the durable answer to write back into the spec."></textarea></label>{/each}
  </fieldset>
  {#each editor.recovery as entry,index}<section class="recovery"><input type="hidden" name="recoveryQuestion" value={entry.question}/><input type="hidden" name="recoveryAnswer" value={entry.answer}/><strong>Recovered answer · {entry.question}</strong><pre>{entry.answer}</pre>{#if mounted}<button type="button" disabled={editor.saving} onclick={()=>editor={...editor,recovery:editor.recovery.filter((_,i)=>i!==index)}}>Discard this recovered answer</button>{/if}</section>{/each}
  {#if !editor.base.revision}<p class="warning">A source revision is unavailable. <a href={`/specs/${detail.spec.id}`}>Reload</a> before saving.</p>{/if}
  {#if !editor.fields.length}<p>This spec does not have open questions right now.</p>{/if}
  {#if editor.fields.length}<div class="actions"><span>Empty answers are ignored. Exact drafts stay here until saved or discarded.</span><button type="submit" disabled={editor.saving||!editor.base.revision||editor.missing||!!changed||editor.unknown}>{editor.saving?'Saving…':'Save answered questions'}</button></div>{/if}
  {#if editor.recovery.length}<noscript><button name="intent" value="discardRecovery" type="submit">Discard recovered answers without saving</button></noscript>{/if}
 </form>

 {#if changed&&editor.latest?.revision&&!editor.latestStale}
 {@const reviewed=reviewQuestionSnapshot(editor)}
 <noscript>
  <form method="POST" action={`/specs/${encodeURIComponent(detail.spec.id)}?/answerOpenQuestions`} class="feedback warning">
   <h4>Review current version before saving</h4><p>Matching answers are kept. Removed questions stay below as recovery.</p>
   {#if editor.base.revision}<input type="hidden" name="specRevision" value={editor.base.revision}/>{/if}
   {#each reviewed.fields as field}<label class="question-card"><input name="question" type="hidden" value={field.question}/><strong>{field.question}</strong><textarea name="answer" rows="4">{field.answer}</textarea></label>{/each}
   {#each reviewed.recovery as entry}<input type="hidden" name="recoveryQuestion" value={entry.question}/><input type="hidden" name="recoveryAnswer" value={entry.answer}/><strong>Recovered answer · {entry.question}</strong><pre>{entry.answer}</pre>{/each}
   <label><input type="checkbox" name="acknowledgedRevision" value={editor.latest.revision} required/> I reviewed the current questions and decisions above.</label>
   <button type="submit">Save answers against reviewed version</button>
   {#if reviewed.recovery.length}<button type="submit" name="intent" value="discardRecovery" formnovalidate>Discard recovered answers without saving</button>{/if}
  </form>
 </noscript>
 {/if}
 {#if editor.outcome?.evaluation}<section class="feedback"><strong>Continuation guidance</strong><p>{editor.outcome.evaluation.summary}</p><ul>{#each editor.outcome.evaluation.nextActions as action}<li>{action}</li>{/each}</ul><pre>{editor.outcome.evaluation.bundle.recommended_prompt}</pre></section>{/if}
 <span class="sr-only" role="status">{editor.saving?'Saving answers':protectedDraft?'Unsaved answers':''}</span>
</div>
<style>
 .questions{display:flex;flex-direction:column;gap:.75rem}.question-form,fieldset{display:flex;flex-direction:column;gap:.75rem}fieldset{margin:0;padding:0;border:0;min-width:0}.question-card{display:flex;flex-direction:column;gap:.5rem;padding:.75rem;border:1px solid var(--border-subtle);border-radius:.25rem}textarea{width:100%;padding:.625rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text);font: .8125rem/1.5 var(--body-font);resize:vertical}textarea::placeholder{color:var(--text-muted);opacity:1}.actions{display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap}.actions span{font-size:.75rem;color:var(--text-muted)}button{min-height:2rem;padding:.375rem .625rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface-raised);color:var(--text);cursor:pointer}button:disabled{opacity:.55;cursor:default}.feedback,.recovery{padding:.75rem;border:1px solid var(--border-subtle);border-radius:.25rem}.warning{border-color:var(--warning);color:var(--warning)}.success{border-color:var(--accent);color:var(--accent)}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.75rem;max-height:20rem;overflow:auto}p,ul{margin:.5rem 0}strong{font-size:.8125rem}@media(pointer:coarse){button{min-height:2.75rem}}
</style>
