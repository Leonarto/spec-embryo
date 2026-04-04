<script lang="ts">
  import {
    Blocks,
    CircleCheckBig,
    Filter,
    FolderKanban,
    Hourglass,
    ListChecks,
    Play,
    SquareDashedKanban,
  } from "@lucide/svelte";
  import type { DashboardData, DashboardKanbanColumnId } from "../../../../src/services/dashboard.ts";
  import AnalysisFilters from "../../lib/components/AnalysisFilters.svelte";
  import { countKanbanTasks, filterKanbanBySpecs } from "../../lib/task-board.ts";

  let { data } = $props();
  const dashboard = $derived(data.dashboard as DashboardData);
  const filteredKanban = $derived(filterKanbanBySpecs(dashboard.kanban, dashboard.analysis.selectedSpecIds));
  const filteredTaskCount = $derived(countKanbanTasks(filteredKanban));
  const hasSpecFilters = $derived(dashboard.analysis.selectedSpecIds.length > 0);

  const laneNotes: Record<DashboardKanbanColumnId, string> = {
    blocked: "Work stopped by declared dependencies or explicit blocked state.",
    todo: "Ready to be picked up once attention shifts here.",
    in_progress: "Active implementation slices with current movement.",
    review: "Implementation is complete enough for a real review pass before completion.",
    done: "Completed or intentionally cancelled slices kept as durable project memory.",
  };

  const laneIcons: Record<
    DashboardKanbanColumnId,
    typeof SquareDashedKanban | typeof Play | typeof Blocks | typeof CircleCheckBig | typeof ListChecks
  > = {
    blocked: Blocks,
    todo: SquareDashedKanban,
    in_progress: Play,
    review: ListChecks,
    done: CircleCheckBig,
  };
</script>

<svelte:head>
  <title>{dashboard.project.name} Tasks</title>
</svelte:head>

<section class="view-header">
  <div class="header-copy">
    <p class="eyebrow">Derived work flow</p>
    <h3>Task Kanban</h3>
  </div>
  <p class="intro">
    Effective task state is deterministic here: dependency-blocked `todo` work moves into the blocked lane, and real `review` tasks must clear review before they are marked done.
  </p>
</section>

<AnalysisFilters
  {dashboard}
  eyebrow="Operational focus"
  title="Board spec filters"
  detail="Use one or more specs to focus the Kanban on the active work slice you want to execute. This stays operational, so archived tasks remain hidden even while a spec filter is active."
  showTimeWindow={false}
  resultCount={filteredTaskCount}
  resultLabel="tasks visible on the current board slice"
  hasActiveFilters={hasSpecFilters}
  activeDetail="Archived tasks stay hidden here so the Kanban remains an active-work surface."
  inactiveDetail="Without a spec filter, the board shows all non-archived work across the workspace."
/>

{#if hasSpecFilters}
  <section class="filter-note">
    <div class="note-pill">
      <Filter size={14} strokeWidth={1.9} />
      <span>Filtered by {dashboard.analysis.selectedSpecIds.join(", ")}</span>
    </div>
    <p>
      This board intentionally ignores archived tasks even when a spec filter is active, so the selected slice stays operational instead of becoming historical analysis.
    </p>
  </section>
{/if}

<section class="board">
  {#each filteredKanban as column}
    {@const LaneIcon = laneIcons[column.id]}
    <article class="lane">
      <header class="lane-header">
        <div class="lane-title">
          <span class="icon-pill">
            <LaneIcon size={15} strokeWidth={1.9} />
          </span>
          <div>
            <p class="lane-name">{column.title}</p>
            <strong>{column.tasks.length}</strong>
          </div>
        </div>
        <span class="lane-note">{laneNotes[column.id]}</span>
      </header>

      {#if column.tasks.length === 0}
        <p class="empty">No tasks in this lane.</p>
      {:else}
        <div class="card-stack">
          {#each column.tasks as task}
            <article class="task-card">
              <div class="card-top">
                <a class="task-id" href={`/tasks/${task.id}`}>
                  <FolderKanban size={13} strokeWidth={1.9} />
                  {task.id}
                </a>
                <span class="meta">p{task.priority}</span>
                <span class="meta">
                  <Hourglass size={12} strokeWidth={1.9} />
                  {task.effort}u
                </span>
              </div>

              <h4>{task.title}</h4>
              <p>{task.summary}</p>

              <div class="chip-row">
                {#each task.specIds as specId}
                  <a class="chip" href={`/specs/${specId}`}>{specId}</a>
                {/each}
              </div>

              <div class="detail-grid">
                <span>raw {task.rawStatus.replaceAll("_", " ")}</span>
                <span>{task.downstreamCount} downstream</span>
              </div>

              {#if task.unmetDependencies.length > 0}
                <div class="chip-row">
                  {#each task.unmetDependencies as dependencyId}
                    <a class="chip chip-danger" href={`/tasks/${dependencyId}`}>waits for {dependencyId}</a>
                  {/each}
                </div>
              {/if}
            </article>
          {/each}
        </div>
      {/if}
    </article>
  {/each}
</section>

<style>
  .view-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: end;
    margin-bottom: 1rem;
  }

  .header-copy {
    display: grid;
    gap: 0.18rem;
  }

  .eyebrow {
    margin: 0 0 0.35rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.68rem;
    color: var(--muted);
  }

  h3,
  h4 {
    margin: 0;
    font-family: var(--display-font);
  }

  h3 {
    font-size: clamp(1.55rem, 1.8vw, 2rem);
  }

  h4 {
    font-size: 1.14rem;
    line-height: 1.08;
  }

  .intro {
    max-width: 34rem;
    color: var(--muted);
    line-height: 1.45;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(5, minmax(17rem, 1fr));
    gap: 0.85rem;
    overflow-x: auto;
    padding-bottom: 0.2rem;
  }

  .filter-note {
    display: grid;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.92rem 1rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--accent-border);
    background: linear-gradient(180deg, color-mix(in srgb, var(--accent-soft) 88%, var(--surface-hero)), var(--surface-overlay));
    box-shadow: var(--shadow-soft);
  }

  .filter-note p {
    margin: 0;
    color: var(--muted);
    line-height: 1.45;
  }

  .note-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    width: fit-content;
    border-radius: 999px;
    padding: 0.35rem 0.68rem;
    border: 1px solid var(--accent-border);
    background: var(--surface-interactive);
    color: var(--muted-soft);
    font-size: 0.78rem;
    box-shadow: var(--shadow-soft);
  }

  .lane {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    min-width: 17rem;
    padding: 0.9rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--line);
    background: var(--panel);
    box-shadow: var(--shadow);
  }

  .lane-header,
  .lane-title {
    display: grid;
    gap: 0.55rem;
  }

  .lane-title {
    grid-template-columns: auto 1fr;
    align-items: center;
  }

  .icon-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.05rem;
    height: 2.05rem;
    border-radius: 0.9rem;
    border: 1px solid var(--line);
    background: var(--surface-interactive);
    color: var(--muted-soft);
  }

  .lane-name {
    margin: 0 0 0.2rem;
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted);
  }

  .lane-header strong {
    font-family: var(--display-font);
    font-size: 1.35rem;
    line-height: 1;
  }

  .lane-note,
  .task-card p,
  .empty {
    color: var(--muted);
    line-height: 1.45;
  }

  .card-stack {
    display: grid;
    gap: 0.8rem;
  }

  .task-card {
    display: grid;
    gap: 0.72rem;
    padding: 0.88rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    background: var(--surface-card);
    box-shadow: var(--shadow-soft);
  }

  .card-top,
  .detail-grid,
  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.42rem;
    align-items: center;
  }

  .task-id,
  .meta,
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border-radius: 999px;
    padding: 0.31rem 0.6rem;
    font-size: 0.75rem;
    border: 1px solid var(--line);
    background: var(--surface-interactive);
  }

  .task-id {
    font-weight: 700;
    text-decoration: none;
  }

  .chip-danger {
    background: var(--danger-soft);
    border-color: var(--danger-border);
  }

  .detail-grid {
    color: var(--muted);
    font-size: 0.78rem;
  }

  @media (max-width: 900px) {
    .view-header {
      flex-direction: column;
      align-items: start;
    }
  }
</style>
