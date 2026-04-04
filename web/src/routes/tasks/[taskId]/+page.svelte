<script lang="ts">
  import { AlertTriangle, Archive, ArrowLeft, Blocks, Clock3, FolderKanban, GitBranchPlus, Link2, NotebookText, Target } from "@lucide/svelte";
  import DocumentBody from "../../../lib/components/DocumentBody.svelte";
  import type { TaskDetailResult } from "../../../../../src/services/details.ts";

  let { data } = $props();
  const detail = $derived(data.detail as TaskDetailResult);
</script>

<svelte:head>
  <title>{detail.found ? `${detail.task.id} · ${detail.task.title}` : `Missing task · ${detail.id}`}</title>
</svelte:head>

{#if !detail.found}
  <section class="missing-shell">
    <a class="back-link" href="/tasks">
      <ArrowLeft size={14} strokeWidth={1.9} />
      Back to Tasks
    </a>
    <p class="eyebrow">Deterministic fallback</p>
    <h2>Task {detail.id} was not found</h2>
    <p class="intro">The requested task does not exist in the current managed memory. Pick one of the known IDs below.</p>
    <div class="chip-row">
      {#each detail.availableIds as taskId}
        <a class="chip" href={`/tasks/${taskId}`}>{taskId}</a>
      {/each}
    </div>
  </section>
{:else}
  <section class="detail-shell">
    <div class="detail-header">
      <div class="header-copy">
        <a class="back-link" href="/tasks">
          <ArrowLeft size={14} strokeWidth={1.9} />
          Back to Tasks
        </a>
        <p class="eyebrow">Task detail</p>
        <div class="title-row">
          <div>
            <p class="item-id">{detail.task.id}</p>
            <h2>{detail.task.title}</h2>
          </div>
          <span class="status-pill">{detail.task.status.replaceAll("_", " ")}</span>
        </div>
        <p class="intro">{detail.task.summary}</p>
      </div>

      <div class="meta-panel">
        <div class="meta-grid">
          <div>
            <span>Priority</span>
            <strong>p{detail.task.priority}</strong>
          </div>
          <div>
            <span>Dependencies</span>
            <strong>{detail.dependencies.length}</strong>
          </div>
          <div>
            <span>Current state</span>
            <strong>{detail.currentState.isActiveTask ? "Active" : detail.currentState.isBlockedTask ? "Blocked" : "Inactive"}</strong>
          </div>
        </div>
        <div class="chip-row">
          {#each detail.task.tags as tag}
            <span class="chip">{tag}</span>
          {/each}
          {#if detail.task.ownerRole}
            <span class="chip">owner {detail.task.ownerRole}</span>
          {/if}
          {#if detail.task.createdAt}
            <span class="chip">created {detail.task.createdAt.slice(0, 10)}</span>
          {/if}
          {#if detail.task.archivedAt}
            <span class="chip chip-warning">
              <Archive size={12} strokeWidth={1.9} />
              archived
            </span>
          {/if}
        </div>
      </div>
    </div>

    <section class="detail-grid">
      <article class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <Link2 size={15} strokeWidth={1.9} />
            <h3>Dependencies and blockers</h3>
          </div>
        </div>

        <div class="state-stack">
          <div class="state-card">
            <div class="panel-title">
              <GitBranchPlus size={14} strokeWidth={1.9} />
              <strong>Declared dependencies</strong>
            </div>
            {#if detail.dependencies.length === 0}
              <p class="empty">This task has no declared dependencies.</p>
            {:else}
              <div class="linked-list">
                {#each detail.dependencies as dependency}
                  <a class="linked-card" href={`/tasks/${dependency.id}`}>
                    <p class="linked-id">{dependency.id}</p>
                    <h4>{dependency.title}</h4>
                    <p>{dependency.summary}</p>
                  </a>
                {/each}
              </div>
            {/if}
          </div>

          <div class="state-card">
            <div class="panel-title">
              <AlertTriangle size={14} strokeWidth={1.9} />
              <strong>Unmet dependencies</strong>
            </div>
            {#if detail.unmetDependencyIds.length === 0}
              <p class="empty">No unmet dependencies right now.</p>
            {:else}
              <div class="chip-row">
                {#each detail.unmetDependencyIds as dependencyId}
                  <span class="chip chip-warning">{dependencyId}</span>
                {/each}
              </div>
            {/if}
          </div>

          <div class="state-card">
            <div class="panel-title">
              <Blocks size={14} strokeWidth={1.9} />
              <strong>Downstream tasks waiting here</strong>
            </div>
            {#if detail.blockingTasks.length === 0}
              <p class="empty">No downstream tasks currently depend on this task.</p>
            {:else}
              <div class="linked-list">
                {#each detail.blockingTasks as blockingTask}
                  <a class="linked-card" href={`/tasks/${blockingTask.id}`}>
                    <p class="linked-id">{blockingTask.id}</p>
                    <h4>{blockingTask.title}</h4>
                    <p>{blockingTask.summary}</p>
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <FolderKanban size={15} strokeWidth={1.9} />
            <h3>Context and links</h3>
          </div>
        </div>

        <div class="state-stack">
          <div class="state-card">
            <div class="panel-title">
              <Target size={14} strokeWidth={1.9} />
              <strong>Current state</strong>
            </div>
            <p>{detail.currentState.focus}</p>
            <div class="chip-row">
              <span class={`chip ${detail.currentState.isActiveTask ? "chip-accent" : ""}`}>
                {detail.currentState.isActiveTask ? "Active task" : "Not active"}
              </span>
              {#if detail.currentState.isBlockedTask}
                <span class="chip chip-warning">Blocked in current state</span>
              {/if}
            </div>
          </div>

          <div class="state-card">
            <div class="panel-title">
              <NotebookText size={14} strokeWidth={1.9} />
              <strong>Linked specs</strong>
            </div>
            <div class="chip-row">
              {#each detail.linkedSpecs as spec}
                <a class="chip" href={`/specs/${spec.id}`}>{spec.id}</a>
              {/each}
            </div>
          </div>

          <div class="state-card">
            <div class="panel-title">
              <Clock3 size={14} strokeWidth={1.9} />
              <strong>Lifecycle</strong>
            </div>
            <div class="meta-list">
              {#if detail.task.completedAt}
                <span>completed {detail.task.completedAt}</span>
              {/if}
              {#if detail.task.cancelledAt}
                <span>cancelled {detail.task.cancelledAt}</span>
              {/if}
              {#if detail.task.archivedAt}
                <span>archived {detail.task.archivedAt}</span>
              {/if}
              {#if detail.task.archiveReason}
                <span>archive reason {detail.task.archiveReason}</span>
              {/if}
              {#if !detail.task.completedAt && !detail.task.cancelledAt && !detail.task.archivedAt}
                <span>No closed-state lifecycle timestamps yet.</span>
              {/if}
            </div>
          </div>

          <div class="state-card">
            <div class="panel-title">
              <NotebookText size={14} strokeWidth={1.9} />
              <strong>Related handoffs</strong>
            </div>
            {#if detail.relatedHandoffs.length === 0}
              <p class="empty">No related handoffs were found for this task yet.</p>
            {:else}
              <div class="handoff-list">
                {#each detail.relatedHandoffs as handoff}
                  <div class="handoff-card">
                    <p class="linked-id">{handoff.id}</p>
                    <strong>{handoff.title}</strong>
                    <p>{handoff.summary}</p>
                    <small>{handoff.createdAt}</small>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </article>
    </section>

    <article class="panel panel-body">
      <div class="panel-head">
        <div class="panel-title">
          <NotebookText size={15} strokeWidth={1.9} />
          <h3>Source narrative</h3>
        </div>
      </div>
      <DocumentBody sections={detail.bodySections} emptyLabel="This task does not have narrative sections yet." />
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
  .empty,
  .meta-list {
    color: var(--muted);
    line-height: 1.5;
  }

  .detail-shell,
  .missing-shell,
  .detail-grid,
  .meta-panel,
  .state-stack,
  .linked-list,
  .handoff-list,
  .meta-list {
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
  .linked-card,
  .chip {
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
  .chip {
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-bottom: 1rem;
  }

  .panel {
    gap: 0.9rem;
  }

  .linked-card,
  .state-card,
  .handoff-card {
    display: grid;
    gap: 0.65rem;
    padding: 0.9rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    background: var(--surface-card-soft);
    box-shadow: var(--shadow-soft);
  }

  .linked-card:hover {
    border-color: var(--accent-border);
    transform: translateY(-1px);
  }

  .meta-list {
    gap: 0.45rem;
  }

  @media (max-width: 980px) {
    .detail-header,
    .detail-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
