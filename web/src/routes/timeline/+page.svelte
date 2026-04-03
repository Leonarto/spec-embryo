<script lang="ts">
  import { Archive, ArrowRight, ChartNoAxesGantt, Clock3, FolderKanban, Orbit, TimerReset } from "@lucide/svelte";
  import type { DashboardData } from "../../../../src/services/dashboard.ts";
  import AnalysisFilters from "../../lib/components/AnalysisFilters.svelte";

  let { data } = $props();
  const dashboard = $derived(data.dashboard as DashboardData);

  const totalUnits = $derived(Math.max(dashboard.timeline.totalUnits, 1));
  const ruler = $derived(Array.from({ length: totalUnits }, (_, index) => index + 1));
</script>

<svelte:head>
  <title>{dashboard.project.name} Timeline</title>
</svelte:head>

<section class="view-header">
  <div class="header-copy">
    <p class="eyebrow">Deterministic sequence</p>
    <h3>Gantt View</h3>
  </div>
  <p class="intro">
    Timeline position is derived from declared dependencies. Bar width uses default effort units so the sequence is readable now without pretending to know dates.
  </p>
</section>

<AnalysisFilters
  {dashboard}
  title="Timeline slice filters"
  detail="Use spec sets and lifecycle windows to see the relevant slice of work in dependency order. Archived tasks join the slice while filters are active."
/>

<section class="timeline-shell">
  {#if dashboard.timeline.items.length === 0}
    <div class="timeline-empty">
      <TimerReset size={16} strokeWidth={1.9} />
      <span>No timeline items matched the current analytical filters.</span>
    </div>
  {:else}
    <div class="timeline-ruler" style={`--total:${totalUnits}`}>
      {#each ruler as unit}
        <span>{unit}</span>
      {/each}
    </div>

    <div class="timeline-list">
      {#each dashboard.timeline.items as item}
        {@const task = dashboard.analysisTasks.find((entry) => entry.id === item.taskId) ?? dashboard.tasks.find((entry) => entry.id === item.taskId)}
        <article class="timeline-row">
          <div class="row-meta">
            <div class="meta-head">
              <a class="task-id" href={`/tasks/${item.taskId}`}>
                <FolderKanban size={13} strokeWidth={1.9} />
                {item.taskId}
              </a>
              <span class="effort-pill">
                <Clock3 size={12} strokeWidth={1.9} />
                {item.effort}u
              </span>
              {#if task?.archivedAt}
                <span class="effort-pill archived-pill">
                  <Archive size={12} strokeWidth={1.9} />
                  archived
                </span>
              {/if}
            </div>
            <h4>{item.title}</h4>
            <div class="chip-row">
              {#each item.specIds as specId}
                <a class="chip" href={`/specs/${specId}`}>{specId}</a>
              {/each}
            </div>
            <div class="span-copy">
              <span>
                <ArrowRight size={12} strokeWidth={1.9} />
                {item.start} -> {item.end}
              </span>
              <span>
                <Orbit size={12} strokeWidth={1.9} />
                {item.effectiveStatus.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <div class="bar-track" style={`--total:${totalUnits}`}>
            <div
              class="bar {item.effectiveStatus} {task?.archivedAt ? 'bar-archived' : ''}"
              style={`left:${(item.start / totalUnits) * 100}%; width:${((item.end - item.start) / totalUnits) * 100}%`}
            >
              <span>{item.start} -> {item.end}</span>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
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
    font-size: 1.08rem;
    line-height: 1.08;
  }

  .intro,
  .task-id {
    color: var(--muted);
    line-height: 1.45;
  }

  .timeline-shell {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--line);
    background: var(--panel);
    box-shadow: var(--shadow);
  }

  .timeline-ruler {
    display: grid;
    grid-template-columns: repeat(var(--total), minmax(0, 1fr));
    gap: 0.25rem;
    padding-left: 18rem;
  }

  .timeline-ruler span {
    display: inline-flex;
    justify-content: center;
    font-size: 0.72rem;
    color: var(--muted);
  }

  .timeline-list {
    display: grid;
    gap: 0.85rem;
  }

  .timeline-empty {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--muted);
    padding: 0.9rem 1rem;
    border-radius: var(--radius-lg);
    border: 1px dashed var(--line-strong);
    background: rgba(255, 255, 255, 0.62);
  }

  .timeline-row {
    display: grid;
    grid-template-columns: 17rem minmax(0, 1fr);
    gap: 1rem;
    align-items: center;
  }

  .row-meta {
    display: grid;
    gap: 0.5rem;
  }

  .meta-head,
  .chip-row,
  .span-copy {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }

  .task-id,
  .effort-pill,
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
    border-radius: 999px;
    padding: 0.3rem 0.62rem;
    font-size: 0.75rem;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.88);
    box-shadow: var(--shadow-soft);
  }

  .task-id {
    text-decoration: none;
  }

  .archived-pill {
    background: rgba(143, 84, 33, 0.12);
    border-color: rgba(143, 84, 33, 0.2);
  }

  .span-copy {
    color: var(--muted);
    font-size: 0.78rem;
  }

  .span-copy span {
    display: inline-flex;
    align-items: center;
    gap: 0.28rem;
  }

  .bar-track {
    position: relative;
    height: 2.75rem;
    border-radius: 1rem;
    background:
      linear-gradient(90deg, rgba(24, 22, 18, 0.05) 1px, transparent 1px),
      rgba(255, 255, 255, 0.74);
    background-size: calc(100% / var(--total)) 100%;
    border: 1px solid var(--line);
    overflow: hidden;
  }

  .bar {
    position: absolute;
    top: 0.35rem;
    bottom: 0.35rem;
    min-width: 3rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.8rem;
    color: var(--ink);
    font-size: 0.78rem;
    border: 1px solid transparent;
    box-shadow: var(--shadow-soft);
  }

  .bar.todo {
    background: rgba(24, 22, 18, 0.12);
  }

  .bar.in_progress {
    background: var(--accent-soft);
    border-color: rgba(15, 141, 96, 0.25);
  }

  .bar.blocked {
    background: var(--danger-soft);
    border-color: rgba(151, 45, 45, 0.25);
  }

  .bar.review {
    background: rgba(143, 84, 33, 0.18);
    border-color: rgba(143, 84, 33, 0.25);
  }

  .bar.done {
    background: rgba(15, 141, 96, 0.22);
    border-color: rgba(15, 141, 96, 0.2);
  }

  .bar.bar-archived {
    box-shadow: inset 0 0 0 1px rgba(143, 84, 33, 0.18), var(--shadow-soft);
  }

  @media (max-width: 980px) {
    .view-header {
      flex-direction: column;
      align-items: start;
    }

    .timeline-ruler {
      padding-left: 0;
    }

    .timeline-row {
      grid-template-columns: 1fr;
    }
  }
</style>
