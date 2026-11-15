<script lang="ts">
import {Blocks,CircleCheckBig,FolderKanban,Hourglass,ListChecks,Play,SquareDashedKanban} from '@lucide/svelte';
import {groupTaskPage} from '../task-board.ts';
import type {WorkspaceTaskRow} from '../../../../src/services/workspace.ts';
let {rows}:{rows:WorkspaceTaskRow[]}=$props();
const filteredKanban=$derived(groupTaskPage(rows));
const laneNotes={blocked:'Work stopped by dependencies or explicit blocked state.',todo:'Ready to be picked up.',in_progress:'Active implementation.',review:'Ready for a real review.',done:'Completed or intentionally cancelled.'};
const laneIcons={blocked:Blocks,todo:SquareDashedKanban,in_progress:Play,review:ListChecks,done:CircleCheckBig};
</script>
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
    font-family: var(--body-font);
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
    font-family: var(--body-font);
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

  @media(pointer:coarse) { a { min-height:2.75rem; } }
</style>
