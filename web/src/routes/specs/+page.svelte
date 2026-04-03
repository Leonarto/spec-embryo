<script lang="ts">
  import { CircleCheckBig, Gauge, NotebookText, Orbit, Pause, Sparkles } from "@lucide/svelte";
  import type { DashboardData } from "../../../../src/services/dashboard.ts";

  let { data } = $props();
  const dashboard = $derived(data.dashboard as DashboardData);

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

<section class="spec-grid">
  {#each dashboard.specs as spec}
    {@const StatusIcon = statusIcons[spec.status as keyof typeof statusIcons] ?? NotebookText}
    <article class="spec-card">
      <div class="card-head">
        <div>
          <p class="spec-id">{spec.id}</p>
          <h4>{spec.title}</h4>
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
          <span class="chip">{taskId}</span>
        {/each}
      </div>
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
  .chip {
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

  @media (max-width: 900px) {
    .view-header {
      flex-direction: column;
      align-items: start;
    }

    .spec-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
