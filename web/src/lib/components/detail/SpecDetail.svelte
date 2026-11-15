<script lang="ts">
  import { ArrowLeft, CircleCheckBig, Gauge, NotebookText, Orbit, Pause, Sparkles, Target } from "@lucide/svelte";
  import DocumentBody from "../DocumentBody.svelte";
  import type { SpecDetailResult } from "../../../../../src/services/details.ts";
  import type { SpecDetailActionResult } from "./types.ts";

  let { detail, actionResult } = $props<{ detail: SpecDetailResult; actionResult?: SpecDetailActionResult }>();

  const statusIcons = {
    proposed: Sparkles,
    active: Orbit,
    paused: Pause,
    done: CircleCheckBig,
    archived: NotebookText,
  } as const;
</script>

{#if !detail.found}
  <section class="missing-shell">
    <a class="back-link" href="/specs">
      <ArrowLeft size={14} strokeWidth={1.9} />
      Back to Specs
    </a>
    <p class="eyebrow">Deterministic fallback</p>
    <h2>Spec {detail.id} was not found</h2>
    <p class="intro">The requested spec does not exist in the current managed memory. Pick one of the known IDs below.</p>
    <div class="chip-row">
      {#each detail.availableIds as specId}
        <a class="chip" href={`/specs/${specId}`}>{specId}</a>
      {/each}
    </div>
  </section>
{:else}
  {@const StatusIcon = statusIcons[detail.spec.status as keyof typeof statusIcons] ?? NotebookText}
  <section class="detail-shell">
    <div class="detail-header">
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
            <strong>{detail.linkedTasks.length}</strong>
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

    <section class="detail-grid">
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

        {#if detail.linkedTasks.length === 0}
          <p class="empty">This spec has no linked tasks yet.</p>
        {:else}
          <div class="group-stack">
            {#each detail.linkedTaskGroups as group}
              <section class="task-group">
                <div class="group-head">
                  <p class="linked-id">{group.title}</p>
                  <span class="mini-pill">{group.tasks.length}</span>
                </div>
                <div class="linked-list">
                  {#each group.tasks as task}
                    <a class="linked-card" href={`/tasks/${task.id}`}>
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
            {/each}
          </div>
        {/if}
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
        {#if detail.relatedHandoffs.length === 0}
          <p class="empty">No related handoffs were found for this spec yet.</p>
        {:else}
          <div class="handoff-list">
            {#each detail.relatedHandoffs as handoff}
              <div class="state-card">
                <p class="linked-id">{handoff.id}</p>
                <strong>{handoff.title}</strong>
                <p>{handoff.summary}</p>
                <small>{handoff.createdAt}</small>
              </div>
            {/each}
          </div>
        {/if}
      </article>
    </section>

    <section class="detail-grid detail-grid-secondary">
      <article class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <Sparkles size={15} strokeWidth={1.9} />
            <h3>Answer open questions</h3>
          </div>
        </div>

        {#if detail.openQuestions.length === 0}
          <p class="empty">This spec does not have open questions right now.</p>
        {:else}
          <form class="question-form" method="POST" action="?/answerOpenQuestions">
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
            <h3>Resolved decisions</h3>
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

    <article class="panel panel-body">
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
    font-family: var(--display-font);
  }

  h2 {
    font-size: clamp(1.8rem, 2.4vw, 2.6rem);
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
  .missing-shell,
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
    box-shadow: var(--shadow);
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
    font-family: var(--display-font);
    font-size: 1.3rem;
  }

  .status-pill,
  .chip,
  .mini-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
    border-radius: 999px;
    padding: 0.34rem 0.7rem;
    border: 1px solid var(--line);
    background: var(--surface-interactive);
    box-shadow: var(--shadow-soft);
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
    border-radius: 999px;
    overflow: hidden;
    background: var(--neutral-soft);
  }

  .progress-bar {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 88%, white 12%), var(--accent-soft));
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
    box-shadow: var(--shadow-soft);
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
    box-shadow: var(--shadow-soft);
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
    transform: translateY(-1px);
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

  textarea {
    width: 100%;
    min-height: 7rem;
    resize: vertical;
    box-sizing: border-box;
    padding: 0.85rem 0.95rem;
    border-radius: 1rem;
    border: 1px solid var(--line-strong);
    background: var(--surface-overlay-soft);
    color: inherit;
    font: inherit;
  }

  textarea:focus {
    outline: 2px solid color-mix(in srgb, var(--accent) 24%, transparent);
    border-color: var(--accent-border);
  }

  .primary-button {
    border: 0;
    border-radius: 999px;
    padding: 0.72rem 1rem;
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 86%, black 14%), color-mix(in srgb, var(--accent) 72%, white 18%));
    color: color-mix(in srgb, var(--panel-strong) 14%, white 86%);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 14px 28px rgba(15, 141, 96, 0.18);
  }

  .feedback-error {
    border-color: var(--danger-border);
    background: color-mix(in srgb, var(--danger-soft) 72%, var(--surface-card));
  }

  .feedback-success {
    border-color: var(--accent-border);
    background: color-mix(in srgb, var(--accent-soft) 72%, var(--surface-card));
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
    border-radius: 1rem;
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
</style>
