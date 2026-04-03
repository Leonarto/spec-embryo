<script lang="ts">
  import {
    Blocks,
    CircleCheckBig,
    FolderKanban,
    Hourglass,
    ListChecks,
    Play,
    SquareDashedKanban,
  } from "@lucide/svelte";
  import type { DashboardData, DashboardKanbanColumnId } from "../../../../src/services/dashboard.ts";

  let { data } = $props();
  const dashboard = $derived(data.dashboard as DashboardData);

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

<section class="board">
  {#each dashboard.kanban as column}
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
                <span class="task-id">
                  <FolderKanban size={13} strokeWidth={1.9} />
                  {task.id}
                </span>
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
                  <span class="chip">{specId}</span>
                {/each}
              </div>

              <div class="detail-grid">
                <span>raw {task.rawStatus.replaceAll("_", " ")}</span>
                <span>{task.downstreamCount} downstream</span>
              </div>

              {#if task.unmetDependencies.length > 0}
                <div class="chip-row">
                  {#each task.unmetDependencies as dependencyId}
                    <span class="chip chip-danger">waits for {dependencyId}</span>
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
    background: rgba(255, 255, 255, 0.84);
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
    background: rgba(255, 255, 255, 0.84);
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
    background: rgba(255, 255, 255, 0.9);
  }

  .task-id {
    font-weight: 700;
  }

  .chip-danger {
    background: var(--danger-soft);
    border-color: rgba(151, 45, 45, 0.22);
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
