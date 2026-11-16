<script lang="ts">
  import { ArrowLeft, CircleCheckBig, Gauge, NotebookText, Orbit, Pause, Sparkles, Target } from "@lucide/svelte";
  import RelationWindow from "./RelationWindow.svelte";
  import NotFound from "./NotFound.svelte";
  import DocumentBody from "../DocumentBody.svelte";
  import type {DetailRelatedHandoff} from "../../../../../src/services/details.ts";
  import type {BoundedSpecResult,SpecTaskRelationRow} from "../../../../../src/services/detail-relations.ts";
  import type {RelationReader} from "../../inspector/relation-reader.ts";
  import type { SpecDetailActionResult } from "./types.ts";

  let { detail, actionResult,presentation="page",relationReader } = $props<{ detail: BoundedSpecResult;relationReader?:RelationReader; actionResult?: SpecDetailActionResult;presentation?:"page"|"inspector" }>();

  let questionForm=$state<HTMLFormElement>();
  export function hasAnswerDraft():boolean{return !!questionForm&&new FormData(questionForm).getAll('answer').some(value=>typeof value==='string'&&value.length>0);}
  const statusIcons = {
    proposed: Sparkles,
    active: Orbit,
    paused: Pause,
    done: CircleCheckBig,
    archived: NotebookText,
  } as const;
</script>

{#if !detail.found}
  <NotFound kind="spec" id={detail.id}/>
{:else}
  {@const StatusIcon = statusIcons[detail.spec.status as keyof typeof statusIcons] ?? NotebookText}
  <section class="detail-shell" class:inspector={presentation==='inspector'}>
    <div class="detail-header" data-detail-section="overview">
      <div class="header-copy">
        <a class="back-link" href="/specs">
          <ArrowLeft size={14} strokeWidth={1.9} />
          Back to Specs
        </a>
        <p class="eyebrow">Spec detail</p>
        <div class="title-row">
          <div>
            <p class="item-id">{detail.spec.id}</p>
            <h2>{detail.spec.title}</h2>
          </div>
          <span class="status-pill">
            <StatusIcon size={14} strokeWidth={1.9} />
            {detail.spec.status}
          </span>
        </div>
        <p class="intro">{detail.spec.summary}</p>
      </div>

      <div class="meta-panel">
        <div class="meta-grid">
          <div>
            <span>Linked tasks</span>
            <strong>{detail.linkedTasks.total}</strong>
          </div>
          <div>
            <span>Completion</span>
            <strong>{Math.round(detail.progress.completionRatio * 100)}%</strong>
          </div>
          <div>
            <span>Current focus</span>
            <strong>{detail.currentState.isActiveSpec ? "Active" : "Inactive"}</strong>
          </div>
        </div>
        <div class="chip-row">
          {#each detail.spec.tags as tag}
            <span class="chip">{tag}</span>
          {/each}
          {#if detail.spec.owner}
            <span class="chip">owner {detail.spec.owner}</span>
          {/if}
          {#if detail.spec.updatedAt}
            <span class="chip">updated {detail.spec.updatedAt.slice(0, 10)}</span>
          {/if}
        </div>
      </div>
    </div>

    <section class="detail-grid" data-detail-section="relations">
      <article class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <Gauge size={15} strokeWidth={1.9} />
            <h3>Progress and linked tasks</h3>
          </div>
          <div class="progress-line">
            <div class="progress-bar" style={`width:${Math.max(detail.progress.completionRatio * 100, 5)}%`}></div>
          </div>
        </div>

        <div class="progress-grid">
          <span>done {detail.progress.done}</span>
          <span>review {detail.progress.review}</span>
          <span>in progress {detail.progress.inProgress}</span>
          <span>blocked {detail.progress.blocked}</span>
          <span>todo {detail.progress.todo}</span>
        </div>

        <RelationWindow window={detail.linkedTasks} name="linkedTasks" label="Linked tasks" baseHref={`/specs/${detail.spec.id}`} reader={relationReader}>
{#snippet children(visible:readonly SpecTaskRelationRow[])}
{#if visible.length===0}
          <p class="empty">This spec has no linked tasks yet.</p>
        {:else}
<div class="group-stack">
            {#each detail.linkedTaskGroups as group}
{@const tasks=visible.filter(entry=>entry.groupId===group.id)}
{#if tasks.length}
              <section class="task-group">
                <div class="group-head">
                  <p class="linked-id">{group.title}</p>
                  <span class="mini-pill">{group.total}</span>
                </div>
                <div class="linked-list">
                  {#each tasks as task, occurrence (`${detail.linkedTasks.page}:${occurrence}:${task.id}`)}
                    <a class="linked-card" data-relation-item href={`/tasks/${task.id}`}>
                      <div class="linked-head">
                        <div>
                          <p class="linked-id">{task.id}</p>
                          <h4>{task.title}</h4>
                        </div>
                        <span class="mini-pill">{task.statusLabel}</span>
                      </div>
                      <p>{task.summary}</p>
                      <div class="chip-row">
                        <span class="chip">p{task.priority}</span>
                        <span class="chip">{task.effort}u</span>
                        {#if task.archivedAt}
                          <span class="chip chip-warning">archived</span>
                        {/if}
                      </div>
                    </a>
                  {/each}
                </div>
              </section>
            {/if}
{/each}
          </div>
{/if}
{/snippet}
</RelationWindow>
      </article>

      <article class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <Target size={15} strokeWidth={1.9} />
            <h3>Current state relevance</h3>
          </div>
        </div>
        <div class="state-stack">
          <div class="state-card">
            <span>Focus</span>
            <strong>{detail.currentState.focus}</strong>
          </div>
          <div class="chip-row">
            <span class={`chip ${detail.currentState.isActiveSpec ? "chip-accent" : ""}`}>
              {detail.currentState.isActiveSpec ? "Active in current state" : "Not active in current state"}
            </span>
          </div>
        </div>

        <div class="panel-head">
          <div class="panel-title">
            <NotebookText size={15} strokeWidth={1.9} />
            <h3>Related handoffs</h3>
          </div>
        </div>
        <RelationWindow window={detail.relatedHandoffs} name="relatedHandoffs" label="Related handoffs" baseHref={`/specs/${detail.spec.id}`} reader={relationReader}>
{#snippet children(visible:readonly DetailRelatedHandoff[])}
{#if visible.length===0}
          <p class="empty">No related handoffs were found for this spec yet.</p>
        {:else}
<div class="handoff-list">
            {#each visible as handoff, occurrence (`${detail.relatedHandoffs.page}:${occurrence}:${handoff.id}`)}
              <div class="state-card" data-relation-item>
                <p class="linked-id">{handoff.id}</p>
                <strong>{handoff.title}</strong>
                <p>{handoff.summary}</p>
                <small>{handoff.createdAt}</small>
              </div>
            {/each}
          </div>
{/if}
{/snippet}
</RelationWindow>
      </article>
    </section>

    <section class="detail-grid detail-grid-secondary">
      <article class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <Sparkles size={15} strokeWidth={1.9} />
            <h3 id="open-questions">Answer open questions</h3>
          </div>
        </div>

        {#if presentation==='inspector'}
          <div class="readonly-questions" data-detail-section="questions">{#each detail.openQuestions as question}<p>{question.question}</p>{/each}<a data-inspector-full href={`/specs/${detail.spec.id}#open-questions`}>Answer questions on the canonical page</a></div>
        {:else if detail.openQuestions.length === 0}
          <p class="empty">This spec does not have open questions right now.</p>
        {:else}
          <form bind:this={questionForm} class="question-form" method="POST" action="?/answerOpenQuestions">
            <div class="question-list">
              {#each detail.openQuestions as question}
                <label class="question-card">
                  <input type="hidden" name="question" value={question.question} />
                  <div class="question-head">
                    <p class="linked-id">{question.id}</p>
                    <span class="mini-pill">open</span>
                  </div>
                  <strong>{question.question}</strong>
                  <textarea
                    name="answer"
                    rows="4"
                    placeholder="Add the durable answer that should be written back into the spec."
                  ></textarea>
                </label>
              {/each}
            </div>

            <div class="question-actions">
              <p class="helper-copy">You can answer one or many questions here. Empty answers are ignored on save.</p>
              <button class="primary-button" type="submit">Save answered questions</button>
            </div>
          </form>
        {/if}

        {#if actionResult?.action === "answerOpenQuestions" && actionResult.error}
          <div class="feedback-card feedback-error">
            <p class="linked-id">save error</p>
            <strong>{actionResult.error}</strong>
          </div>
        {/if}

        {#if actionResult?.action === "answerOpenQuestions" && actionResult.success}
          <div class="feedback-stack">
            <div class="feedback-card feedback-success">
              <p class="linked-id">saved</p>
              <strong>{actionResult.savedCount} answer{actionResult.savedCount === 1 ? "" : "s"} recorded</strong>
              {#if actionResult.answeredQuestions && actionResult.answeredQuestions.length > 0}
                <div class="chip-row">
                  {#each actionResult.answeredQuestions as question}
                    <span class="chip">{question}</span>
                  {/each}
                </div>
              {/if}
            </div>

            {#if actionResult.evaluation}
              <div class="feedback-card">
                <div class="panel-head">
                  <div class="panel-title">
                    <Target size={15} strokeWidth={1.9} />
                    <h3>Continuation guidance</h3>
                  </div>
                  <span class={`mini-pill ${actionResult.evaluation.status === "ready-for-follow-up" ? "mini-pill-success" : "mini-pill-warm"}`}>
                    {actionResult.evaluation.status === "ready-for-follow-up" ? "ready" : "needs more input"}
                  </span>
                </div>
                <p>{actionResult.evaluation.summary}</p>
                <ul class="plain-list">
                  {#each actionResult.evaluation.nextActions as action}
                    <li>{action}</li>
                  {/each}
                </ul>
                <div class="prompt-block">
                  <p class="linked-id">agent evaluation prompt</p>
                  <pre>{actionResult.evaluation.bundle.recommended_prompt}</pre>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </article>

      <article class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <NotebookText size={15} strokeWidth={1.9} />
            <h3 data-detail-section="decisions">Resolved decisions</h3>
          </div>
          <span class="mini-pill">{detail.resolvedDecisions.length}</span>
        </div>

        {#if detail.resolvedDecisions.length === 0}
          <p class="empty">This spec does not have resolved decisions recorded yet.</p>
        {:else}
          <div class="decision-list">
            {#each detail.resolvedDecisions as decision}
              <div class="decision-card">
                <p class="linked-id">{decision.id}</p>
                {#if decision.question}
                  <strong>{decision.question}</strong>
                {/if}
                <p>{decision.answer}</p>
              </div>
            {/each}
          </div>
        {/if}
      </article>
    </section>

    <article class="panel panel-body" data-detail-section="document">
      <div class="panel-head">
        <div class="panel-title">
          <NotebookText size={15} strokeWidth={1.9} />
          <h3>Source narrative</h3>
        </div>
      </div>
      <DocumentBody sections={detail.bodySections} emptyLabel="This spec does not have narrative sections yet." />
    </article>
  </section>
{/if}

<style>
  .eyebrow,
  .item-id,
  .linked-id {
    margin: 0 0 0.32rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.7rem;
    color: var(--muted);
  }

  h2,
  h3,
  h4,
  p {
    margin: 0;
  }

  h2,
  h3,
  h4 {
    font-family: var(--body-font);
  }

  h2 {
    font-size: clamp(1.375rem, 2vw, 1.875rem);
  }

  h3 {
    font-size: 1.1rem;
  }

  h4 {
    font-size: 1rem;
  }

  .intro,
  .panel p,
  .panel small,
  .empty {
    color: var(--muted);
    line-height: 1.5;
  }

  .detail-shell,
  .detail-grid,
  .meta-panel,
  .linked-list,
  .group-stack,
  .handoff-list,
  .state-stack {
    display: grid;
    gap: 1rem;
  }

  .detail-header {
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(18rem, 0.9fr);
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .header-copy {
    display: grid;
    gap: 0.7rem;
  }

  .back-link,
  .linked-card {
    text-decoration: none;
  }

  .back-link {
    min-height:1.5rem;
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    width: fit-content;
    color: var(--muted-soft);
  }

  .title-row,
  .linked-head,
  .panel-head,
  .panel-title,
  .chip-row,
  .meta-grid {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .title-row,
  .linked-head,
  .meta-grid {
    justify-content: space-between;
  }

  .meta-panel,
  .panel {
    padding: 1rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--line);
    background: var(--panel);
    box-shadow:none;
  }

  .meta-grid div {
    display: grid;
    gap: 0.18rem;
    min-width: 8rem;
  }

  .meta-grid span {
    font-size: 0.76rem;
    color: var(--muted);
  }

  .meta-grid strong {
    font-family: var(--body-font);
    font-size: 1.3rem;
  }

  .status-pill,
  .chip,
  .mini-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
    border-radius:.25rem;
    padding: 0.34rem 0.7rem;
    border: 1px solid var(--line);
    background: var(--surface-interactive);
    box-shadow:none;
    font-size: 0.77rem;
  }

  .chip-accent {
    background: var(--accent-soft);
    border-color: var(--accent-border);
  }

  .chip-warning {
    background: var(--warning-soft);
    border-color: var(--warning-border);
  }

  .detail-grid {
    grid-template-columns: minmax(0, 1.3fr) minmax(18rem, 0.85fr);
    margin-bottom: 1rem;
  }

  .detail-grid-secondary {
    margin-bottom: 1rem;
  }

  .panel {
    gap: 0.9rem;
  }

  .progress-line {
    width: 7rem;
    height: 0.6rem;
    border-radius:.25rem;
    overflow: hidden;
    background: var(--neutral-soft);
  }

  .progress-bar {
    height: 100%;
    border-radius:.25rem;
    background:var(--accent);
  }

  .progress-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    color: var(--muted);
    font-size: 0.8rem;
  }

  .linked-card,
  .state-card {
    display: grid;
    gap: 0.65rem;
    padding: 0.9rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    background: var(--surface-card-soft);
    box-shadow:none;
  }

  .question-form,
  .question-list,
  .feedback-stack,
  .decision-list {
    display: grid;
    gap: 0.8rem;
  }

  .question-card,
  .decision-card,
  .feedback-card {
    display: grid;
    gap: 0.55rem;
    padding: 0.9rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    background: var(--surface-card-soft);
    box-shadow:none;
  }

  .task-group {
    display: grid;
    gap: 0.72rem;
  }

  .group-head {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
    align-items: center;
  }

  .linked-card:hover {
    border-color: var(--accent-border);
    background:var(--surface-raised);
  }

  .state-card span {
    font-size: 0.76rem;
    color: var(--muted);
  }

  .state-card strong {
    line-height: 1.35;
  }

  .question-head,
  .question-actions {
    display: flex;
    gap: 0.7rem;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .helper-copy {
    font-size: 0.85rem;
    color: var(--muted);
  }

  .readonly-questions {display:grid;gap:.5rem}.readonly-questions a{display:inline-flex;align-items:center;min-height:1.5rem;color:var(--accent)}
  textarea {
    width: 100%;
    min-height: 7rem;
    resize: vertical;
    box-sizing: border-box;
    padding: 0.85rem 0.95rem;
    border-radius:.25rem;
    border: 1px solid var(--line-strong);
    background: var(--surface-overlay-soft);
    color: inherit;
    font: inherit;
  }

  textarea:focus {
    outline:2px solid var(--focus);
    border-color: var(--accent-border);
  }

  .primary-button {
    border:1px solid var(--accent);
    border-radius:.25rem;
    padding: 0.72rem 1rem;
    background:var(--accent);
    color:var(--surface);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    box-shadow:none;
  }

  .feedback-error {
    border-color: var(--danger-border);
    background:var(--danger-soft);
  }

  .feedback-success {
    border-color: var(--accent-border);
    background:var(--selection-bg);
  }

  .plain-list {
    margin: 0;
    padding-left: 1rem;
    color: var(--muted);
    display: grid;
    gap: 0.4rem;
  }

  .prompt-block {
    display: grid;
    gap: 0.45rem;
    padding: 0.8rem;
    border-radius:.25rem;
    background: var(--surface-card-soft);
    border: 1px solid var(--line);
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: var(--mono-font);
    font-size: 0.8rem;
    line-height: 1.45;
  }

  .mini-pill-success {
    color: var(--accent-ink);
    border-color: var(--accent-border);
    background: var(--accent-soft);
  }

  .mini-pill-warm {
    color: var(--warning-ink);
    border-color: var(--warning-border);
    background: var(--warning-soft);
  }

  @media (max-width: 980px) {
    .detail-header,
    .detail-grid {
      grid-template-columns: 1fr;
    }
  }
  .detail-shell,.panel,.detail-grid {min-width:0;overflow-wrap:anywhere;}
  .inspector {gap:.75rem;font-size:.8125rem;}
  .inspector .detail-header,.inspector .detail-grid {grid-template-columns:minmax(0,1fr);gap:.75rem;margin:0;}
  .inspector .header-copy {gap:.375rem;}
  .inspector .header-copy .back-link,.inspector .header-copy .eyebrow,.inspector .header-copy .title-row {display:none;}
  .inspector .meta-panel {padding:.375rem .5rem;border:0;background:var(--surface-raised);gap:.375rem;}
  .inspector .meta-grid {gap:.375rem .75rem;}.inspector .meta-grid div {display:flex;align-items:baseline;gap:.375rem;min-width:0;}.inspector .meta-grid strong {font-size:.8125rem;}
  .inspector .panel {padding:.625rem;gap:.5rem;}.inspector .panel-head {gap:.375rem;}
  .inspector .state-stack,.inspector .linked-list,.inspector .handoff-list {gap:0;}
  .inspector .state-card,.inspector .linked-card,.inspector .handoff-card {padding:.5rem 0;gap:.25rem;border:0;border-bottom:1px solid var(--border-subtle);border-radius:0;background:transparent;}
  .inspector .state-card:last-child,.inspector .linked-card:last-child,.inspector .handoff-card:last-child {border-bottom:0;}
  .inspector .linked-card:hover {background:var(--surface-raised);}
  .inspector h3 {font-size:.875rem;}.inspector h4 {font-size:.8125rem;}
  .inspector .chip {padding:.125rem .375rem;min-height:1.5rem;}
  a:focus-visible,button:focus-visible {outline:2px solid var(--focus);outline-offset:2px;}
  @media(pointer:coarse) {a,.back-link,.readonly-questions a,.inspector .chip {min-height:2.75rem;}button {min-height:2.75rem;}}
</style>
