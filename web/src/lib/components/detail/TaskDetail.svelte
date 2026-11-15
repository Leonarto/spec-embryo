<script lang="ts">
  import { AlertTriangle, Archive, ArrowLeft, Blocks, Clock3, FolderKanban, GitBranchPlus, Link2, NotebookText, Target } from "@lucide/svelte";
  import RelationWindow from "./RelationWindow.svelte";
  import NotFound from "./NotFound.svelte";
  import DocumentBody from "../DocumentBody.svelte";
  import type {DetailLinkedTask,DetailLinkedSpec,DetailRelatedHandoff, TaskDetailResult } from "../../../../../src/services/details.ts";

  let { detail,presentation="page" } = $props<{ detail: TaskDetailResult;presentation?:"page"|"inspector" }>();
</script>

{#if !detail.found}
  <NotFound kind="task" id={detail.id}/>
{:else}
  <section class="detail-shell" class:inspector={presentation==='inspector'}>
    <div class="detail-header" data-detail-section="overview">
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

    <section class="detail-grid" data-detail-section="relations">
      <article class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <Link2 size={15} strokeWidth={1.9} />
            <h3>Dependencies and blockers</h3>
          </div>
        </div>

        <div class="state-stack">
          <div class="state-card" class:empty-group={detail.dependencies.length === 0}>
            <div class="panel-title">
              <GitBranchPlus size={14} strokeWidth={1.9} />
              <strong>Declared dependencies</strong>
            </div>
            {#if detail.dependencies.length === 0}
              <p class="empty">{presentation==='inspector'?'None':'This task has no declared dependencies.'}</p>
            {:else}
              <RelationWindow items={detail.dependencies} identityKey={`task:${detail.task.id}:dependencies`} name="dependencies" label="Declared dependencies" fullHref={`/tasks/${detail.task.id}#dependencies`} limited={presentation==='inspector'}>
{#snippet children(visible:readonly DetailLinkedTask[])}
<div class="linked-list">
                {#each visible as dependency}
                  <a class="linked-card" data-relation-item href={`/tasks/${dependency.id}`}>
                    <p class="linked-id">{dependency.id}</p>
                    <h4>{dependency.title}</h4>
                    <p>{dependency.summary}</p>
                  </a>
                {/each}
              </div>
{/snippet}
</RelationWindow>
            {/if}
          </div>

          <div class="state-card" class:empty-group={detail.unmetDependencyIds.length === 0}>
            <div class="panel-title">
              <AlertTriangle size={14} strokeWidth={1.9} />
              <strong>Unmet dependencies</strong>
            </div>
            {#if detail.unmetDependencyIds.length === 0}
              <p class="empty">{presentation==='inspector'?'None':'No unmet dependencies right now.'}</p>
            {:else}
              <RelationWindow items={detail.unmetDependencyIds} identityKey={`task:${detail.task.id}:unmetDependencies`} name="unmetDependencies" label="Unmet dependencies" fullHref={`/tasks/${detail.task.id}#unmetDependencies`} limited={presentation==='inspector'}>
{#snippet children(visible:readonly string[])}
<div class="chip-row">
                {#each visible as dependencyId}
                  <span class="chip chip-warning" data-relation-item>{dependencyId}</span>
                {/each}
              </div>
{/snippet}
</RelationWindow>
            {/if}
          </div>

          <div class="state-card" class:empty-group={detail.blockingTasks.length === 0}>
            <div class="panel-title">
              <Blocks size={14} strokeWidth={1.9} />
              <strong>Downstream tasks waiting here</strong>
            </div>
            {#if detail.blockingTasks.length === 0}
              <p class="empty">{presentation==='inspector'?'None':'No downstream tasks currently depend on this task.'}</p>
            {:else}
              <RelationWindow items={detail.blockingTasks} identityKey={`task:${detail.task.id}:blockingTasks`} name="blockingTasks" label="Downstream tasks" fullHref={`/tasks/${detail.task.id}#blockingTasks`} limited={presentation==='inspector'}>
{#snippet children(visible:readonly DetailLinkedTask[])}
<div class="linked-list">
                {#each visible as blockingTask}
                  <a class="linked-card" data-relation-item href={`/tasks/${blockingTask.id}`}>
                    <p class="linked-id">{blockingTask.id}</p>
                    <h4>{blockingTask.title}</h4>
                    <p>{blockingTask.summary}</p>
                  </a>
                {/each}
              </div>
{/snippet}
</RelationWindow>
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
            <RelationWindow items={detail.linkedSpecs} identityKey={`task:${detail.task.id}:linkedSpecs`} name="linkedSpecs" label="Linked specs" fullHref={`/tasks/${detail.task.id}#linkedSpecs`} limited={presentation==='inspector'}>
{#snippet children(visible:readonly DetailLinkedSpec[])}
<div class="chip-row">
              {#each visible as spec}
                <a class="chip" data-relation-item href={`/specs/${spec.id}`}>{spec.id}</a>
              {/each}
            </div>
{/snippet}
</RelationWindow>
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
              <RelationWindow items={detail.relatedHandoffs} identityKey={`task:${detail.task.id}:handoffs`} name="handoffs" label="Related handoffs" fullHref={`/tasks/${detail.task.id}#handoffs`} limited={presentation==='inspector'}>
{#snippet children(visible:readonly DetailRelatedHandoff[])}
<div class="handoff-list">
                {#each visible as handoff}
                  <div class="handoff-card" data-relation-item>
                    <p class="linked-id">{handoff.id}</p>
                    <strong>{handoff.title}</strong>
                    <p>{handoff.summary}</p>
                    <small>{handoff.createdAt}</small>
                  </div>
                {/each}
              </div>
{/snippet}
</RelationWindow>
            {/if}
          </div>
        </div>
      </article>
    </section>

    <article class="panel panel-body" data-detail-section="document">
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
  .empty,
  .meta-list {
    color: var(--muted);
    line-height: 1.5;
  }

  .detail-shell,
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
    min-height:1.5rem;
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
  .chip {
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
    box-shadow:none;
  }

  .linked-card:hover {
    border-color: var(--accent-border);
    background:var(--surface-raised);
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
  .inspector .empty-group {display:flex;flex-wrap:wrap;align-items:baseline;gap:.375rem;}
  .inspector .empty-group .empty::before {content:"· ";}
  .inspector h3 {font-size:.875rem;}.inspector h4 {font-size:.8125rem;}
  .inspector .chip {padding:.125rem .375rem;min-height:1.5rem;}
  a:focus-visible {outline:2px solid var(--focus);outline-offset:2px;}
  @media(pointer:coarse) {a,.back-link,.inspector .chip {min-height:2.75rem;}}
</style>
