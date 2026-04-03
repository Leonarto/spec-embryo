<script lang="ts">
  import { ArrowLeft, CircleCheckBig, Gauge, NotebookText, Orbit, Pause, Sparkles, Target } from "@lucide/svelte";
  import DocumentBody from "../../../lib/components/DocumentBody.svelte";
  import type { SpecDetailResult } from "../../../../../src/services/details.ts";

  let { data } = $props();
  const detail = $derived(data.detail as SpecDetailResult);

  const statusIcons = {
    proposed: Sparkles,
    active: Orbit,
    paused: Pause,
    done: CircleCheckBig,
    archived: NotebookText,
  } as const;
</script>

<svelte:head>
  <title>{detail.found ? `${detail.spec.id} · ${detail.spec.title}` : `Missing spec · ${detail.id}`}</title>
</svelte:head>

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
    background: rgba(255, 255, 255, 0.88);
    box-shadow: var(--shadow-soft);
    font-size: 0.77rem;
  }

  .chip-accent {
    background: rgba(15, 141, 96, 0.12);
    border-color: rgba(15, 141, 96, 0.22);
  }

  .chip-warning {
    background: rgba(143, 84, 33, 0.12);
    border-color: rgba(143, 84, 33, 0.22);
  }

  .detail-grid {
    grid-template-columns: minmax(0, 1.3fr) minmax(18rem, 0.85fr);
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
    background: rgba(24, 22, 18, 0.08);
  }

  .progress-bar {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(15, 141, 96, 0.82), rgba(15, 141, 96, 0.34));
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
    background: rgba(255, 255, 255, 0.82);
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
    border-color: rgba(15, 141, 96, 0.18);
    transform: translateY(-1px);
  }

  .state-card span {
    font-size: 0.76rem;
    color: var(--muted);
  }

  .state-card strong {
    line-height: 1.35;
  }

  @media (max-width: 980px) {
    .detail-header,
    .detail-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
