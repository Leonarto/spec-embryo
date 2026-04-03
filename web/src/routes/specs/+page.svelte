<script lang="ts">
  import { Archive, CircleCheckBig, Gauge, NotebookText, Orbit, Pause, Sparkles, TimerReset } from "@lucide/svelte";
  import type { DashboardData } from "../../../../src/services/dashboard.ts";
  import AnalysisFilters from "../../lib/components/AnalysisFilters.svelte";

  let { data } = $props();
  const dashboard = $derived(data.dashboard as DashboardData);
  const selectedSpecIds = $derived(new Set(dashboard.analysis.selectedSpecIds));
  const visibleSpecs = $derived(
    dashboard.analysis.selectedSpecIds.length === 0
      ? dashboard.specs
      : dashboard.specs.filter((spec) => selectedSpecIds.has(spec.id)),
  );

  const statusIcons = {
    proposed: Sparkles,
    active: Orbit,
    paused: Pause,
    done: CircleCheckBig,
    archived: NotebookText,
  } as const;
</script>

<svelte:head>
  <title>{dashboard.project.name} Specs</title>
</svelte:head>

<section class="view-header">
  <div class="header-copy">
    <p class="eyebrow">Source-aligned intent</p>
    <h3>Specs View</h3>
  </div>
  <p class="intro">
    Specs stay stable and task-linked here. This view is for seeing intent, current execution weight, and completion shape without losing the narrative layer.
  </p>
</section>

<AnalysisFilters
  {dashboard}
  title="Spec slice filters"
  detail="Use one or more specs to inspect the full work slice for that intent area. Analytical slices include archived tasks so completed work does not disappear."
/>

<section class="spec-grid">
  {#each visibleSpecs as spec}
    {@const StatusIcon = statusIcons[spec.status as keyof typeof statusIcons] ?? NotebookText}
    <article class:selected={selectedSpecIds.has(spec.id)} class="spec-card">
      <div class="card-head">
        <div>
          <p class="spec-id">{spec.id}</p>
          <h4><a class="title-link" href={`/specs/${spec.id}`}>{spec.title}</a></h4>
        </div>
        <span class="status">
          <StatusIcon size={13} strokeWidth={1.9} />
          {spec.status}
        </span>
      </div>

      <p>{spec.summary}</p>

      <div class="progress-shell">
        <div class="progress-copy">
          <div class="mini-head">
            <Gauge size={14} strokeWidth={1.9} />
            <span>Completion</span>
          </div>
          <strong>{Math.round(spec.progress.completionRatio * 100)}%</strong>
        </div>
        <div class="progress-strip">
          <div class="progress-bar" style={`width: ${Math.max(spec.progress.completionRatio * 100, 6)}%`}></div>
        </div>
      </div>

      <div class="progress-grid">
        <span>done {spec.progress.done}</span>
        <span>in progress {spec.progress.inProgress}</span>
        <span>blocked {spec.progress.blocked}</span>
        <span>review {spec.progress.review}</span>
        <span>todo {spec.progress.todo}</span>
      </div>

      <div class="chip-row">
        {#each spec.taskIds as taskId}
          <a class="chip" href={`/tasks/${taskId}`}>{taskId}</a>
        {/each}
      </div>
    </article>
  {/each}
</section>

<section class="analysis-shell">
  <div class="analysis-copy">
    <p class="eyebrow">Related work slice</p>
    <h3>Tasks In Scope</h3>
    <p class="intro">
      This list follows the active analytical filters instead of the Kanban hygiene rules, so archived work still shows up when it belongs to the selected spec slice.
    </p>
  </div>

  {#if dashboard.analysisTasks.length === 0}
    <div class="analysis-empty">
      <TimerReset size={16} strokeWidth={1.9} />
      <span>No tasks matched the current analytical filters.</span>
    </div>
  {:else}
    <div class="analysis-list">
      {#each dashboard.analysisTasks as task}
        <article class="analysis-card">
          <div class="analysis-head">
            <div>
              <p class="task-id">{task.id}</p>
              <h4><a class="title-link" href={`/tasks/${task.id}`}>{task.title}</a></h4>
            </div>
            <div class="analysis-meta">
              <span class="status-pill">{task.rawStatus.replaceAll("_", " ")}</span>
              {#if task.archivedAt}
                <span class="status-pill archived">
                  <Archive size={12} strokeWidth={1.9} />
                  archived
                </span>
              {/if}
            </div>
          </div>

          <p>{task.summary}</p>

          <div class="chip-row">
            {#each task.specIds as specId}
              <a class="chip" href={`/specs/${specId}`}>{specId}</a>
            {/each}
          </div>

          <div class="progress-grid">
            <span>priority p{task.priority}</span>
            <span>effort {task.effort}u</span>
            {#if task.completedAt}
              <span>completed {task.completedAt.slice(0, 10)}</span>
            {:else if task.cancelledAt}
              <span>cancelled {task.cancelledAt.slice(0, 10)}</span>
            {/if}
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
    font-size: 1.24rem;
  }

  .intro,
  .spec-card p,
  .progress-grid {
    color: var(--muted);
    line-height: 1.45;
  }

  .spec-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
    margin-bottom: 1rem;
  }

  .spec-card {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--line);
    background: var(--panel);
    box-shadow: var(--shadow);
  }

  .spec-card.selected {
    border-color: rgba(15, 141, 96, 0.22);
    background: linear-gradient(180deg, rgba(255, 253, 249, 0.96), rgba(239, 248, 243, 0.9));
  }

  .card-head,
  .mini-head,
  .progress-copy {
    display: flex;
    align-items: center;
  }

  .card-head,
  .progress-copy {
    justify-content: space-between;
    gap: 1rem;
  }

  .mini-head {
    gap: 0.4rem;
    color: var(--muted-soft);
  }

  .spec-id,
  .status {
    margin: 0 0 0.35rem;
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted);
  }

  .status,
  .chip,
  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
    border-radius: 999px;
    padding: 0.34rem 0.66rem;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.88);
    box-shadow: var(--shadow-soft);
  }

  .progress-shell {
    display: grid;
    gap: 0.55rem;
  }

  .progress-copy strong {
    font-family: var(--display-font);
    font-size: 1.15rem;
    line-height: 1;
  }

  .progress-strip {
    height: 0.72rem;
    border-radius: 999px;
    overflow: hidden;
    background: rgba(24, 22, 18, 0.08);
  }

  .progress-bar {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(15, 141, 96, 0.78), rgba(15, 141, 96, 0.36));
  }

  .progress-grid,
  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .analysis-shell {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--line);
    background: var(--panel);
    box-shadow: var(--shadow);
  }

  .analysis-copy {
    display: grid;
    gap: 0.24rem;
  }

  .analysis-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .analysis-card {
    display: grid;
    gap: 0.72rem;
    padding: 0.92rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.82);
    box-shadow: var(--shadow-soft);
  }

  .title-link {
    text-decoration: none;
  }

  .analysis-head,
  .analysis-meta {
    display: flex;
    justify-content: space-between;
    gap: 0.7rem;
    align-items: start;
    flex-wrap: wrap;
  }

  .task-id {
    margin: 0 0 0.28rem;
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted);
  }

  .status-pill.archived {
    background: rgba(143, 84, 33, 0.12);
    border-color: rgba(143, 84, 33, 0.2);
  }

  .analysis-empty {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--muted);
    padding: 0.9rem 1rem;
    border-radius: var(--radius-lg);
    border: 1px dashed var(--line-strong);
    background: rgba(255, 255, 255, 0.6);
  }

  @media (max-width: 900px) {
    .view-header {
      flex-direction: column;
      align-items: start;
    }

    .spec-grid,
    .analysis-list {
      grid-template-columns: 1fr;
    }
  }
</style>
