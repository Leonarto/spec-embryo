<script lang="ts">
  import ViewToolbar from "../../lib/components/ViewToolbar.svelte";
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
  import type { DashboardKanbanColumnId } from "../../../../src/services/dashboard.ts";
  import AnalysisFilters from "../../lib/components/AnalysisFilters.svelte";
  import { groupTaskPage } from "../../lib/task-board.ts";
  import ListPager from "../../lib/components/ListPager.svelte";
  import { useWorkspaceResource } from "../../lib/workspace/resource.svelte.ts";
  import type { WorkspaceEnvelope } from "../../../../src/services/workspace.ts";

  let { data } = $props();
  const resource=useWorkspaceResource(()=>data.workspace as WorkspaceEnvelope<'tasks'>);
  const workspace=$derived(resource.snapshot);
  const dashboard=$derived(workspace.data);
  const filteredKanban=$derived(groupTaskPage(dashboard.result.rows));
  const filteredTaskCount=$derived(dashboard.result.totalMatching);
  const hasSpecFilters=$derived(dashboard.filters.selectedSpecIds.length>0);

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
  <title>{workspace.shell.project.name} Tasks</title>
</svelte:head>

<ViewToolbar title="Tasks" count={filteredTaskCount} />

<AnalysisFilters filters={dashboard.filters} route="tasks" title="Board filters" detail="Global filters and order are applied before this page is grouped into lanes. The Board shows unarchived tasks." showTimeWindow={false} resultCount={filteredTaskCount} resultLabel="matching tasks across all pages" />
<ListPager result={dashboard.result} route="tasks" />

{#if hasSpecFilters}
  <section class="filter-note">
    <div class="note-pill">
      <Filter size={14} strokeWidth={1.9} />
      <span>Filtered by {dashboard.filters.selectedSpecIds.join(", ")}</span>
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
            <strong>{column.tasks.length} on this page</strong>
          </div>
        </div>
        <span class="lane-note">{laneNotes[column.id]}</span>
      </header>

      {#if column.tasks.length === 0}
        <p class="empty">No tasks in this lane on this page.</p>
      {:else}
        <div class="card-stack">
          {#each column.tasks as task (task.id)}
            <article class="task-card" data-entity-id={task.id}>
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



  h4 {
    margin: 0;
    font-family: var(--display-font);
  }


  h4 {
    font-size: 1.14rem;
    line-height: 1.08;
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
  }
</style>
