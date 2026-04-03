<script lang="ts">
  import { page } from "$app/state";
  import { CircleCheckBig, Gauge, NotebookText, Orbit, Pause, RotateCcw, SlidersHorizontal, Sparkles, TimerReset } from "@lucide/svelte";
  import type { DashboardData } from "../../../../src/services/dashboard.ts";
  import AnalysisFilters from "../../lib/components/AnalysisFilters.svelte";
  import MultiSelectDropdown from "../../lib/components/MultiSelectDropdown.svelte";

  let { data } = $props();
  const dashboard = $derived(data.dashboard as DashboardData);
  const selectedSpecIds = $derived(new Set(dashboard.analysis.selectedSpecIds));
  const currentPath = $derived(page.url.pathname);
  const currentSearch = $derived(page.url.searchParams);

  const statusIcons = {
    proposed: Sparkles,
    active: Orbit,
    paused: Pause,
    done: CircleCheckBig,
    archived: NotebookText,
  } as const;

  const specStatusOrder = {
    active: 0,
    proposed: 1,
    paused: 2,
    done: 3,
    archived: 4,
  } as const;

  const statusOptions = [
    { value: "active", label: "Active", description: "Live product intent still being extended or executed." },
    { value: "proposed", label: "Proposed", description: "Planned work that is drafted but not yet activated." },
    { value: "paused", label: "Paused", description: "Known intent that is intentionally on hold." },
    { value: "done", label: "Done", description: "Completed slices that remain as durable project history." },
    { value: "archived", label: "Archived", description: "Historical specs that are no longer part of the active product arc." },
  ] as const;

  const selectedStatuses = $derived(
    Array.from(new Set(currentSearch.getAll("spec_status").map((status) => status.trim()).filter((status) => status in specStatusOrder))),
  );
  const selectedStatusSet = $derived(new Set(selectedStatuses));
  const visibleSpecs = $derived(
    dashboard.specs
      .filter((spec) => (dashboard.analysis.selectedSpecIds.length === 0 ? true : selectedSpecIds.has(spec.id)))
      .filter((spec) => (selectedStatuses.length === 0 ? true : selectedStatusSet.has(spec.status)))
      .sort(
        (left, right) =>
          specStatusOrder[left.status as keyof typeof specStatusOrder] -
            specStatusOrder[right.status as keyof typeof specStatusOrder] ||
          left.id.localeCompare(right.id),
      ),
  );
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
  detail="Use one or more specs, lifecycle windows, and spec states to narrow the intent surface. Specs stay ordered from active work through historical work."
  resultCount={visibleSpecs.length}
  resultLabel="specs in the current view"
  hasActiveFilters={dashboard.analysis.hasActiveFilters || selectedStatuses.length > 0}
  inactiveDetail="Without filters, the full spec inventory stays visible in status-first order."
  activeDetail="Analytical spec and state filters are active."
  clearHref={currentPath}
>
  {#snippet extraField()}
    <fieldset class="field-card">
      <legend>
        <SlidersHorizontal size={14} strokeWidth={1.9} />
        Spec states
      </legend>
      <MultiSelectDropdown
        name="spec_status"
        options={statusOptions}
        selectedValues={selectedStatuses}
        buttonLabel="Choose states"
        emptyLabel="All states"
      />
    </fieldset>
  {/snippet}
</AnalysisFilters>

<section class="spec-grid-shell">
  {#if visibleSpecs.length === 0}
    <div class="analysis-empty">
      <TimerReset size={16} strokeWidth={1.9} />
      <span>No specs matched the current state and analytical filters.</span>
    </div>
  {:else}
    <div class="spec-grid">
      {#each visibleSpecs as spec}
        {@const StatusIcon = statusIcons[spec.status as keyof typeof statusIcons] ?? NotebookText}
        <article class:selected={selectedSpecIds.has(spec.id)} class="spec-card">
          <div class="card-head">
            <div class="card-copy">
              <div class="card-topline">
                <p class="spec-id">{spec.id}</p>
                <div class="card-meta">
                  <span class="mini-pill neutral">{spec.linkedTaskCount} tasks</span>
                  <span class={`status ${spec.status}`}>
                    <StatusIcon size={13} strokeWidth={1.9} />
                    {spec.status}
                  </span>
                </div>
              </div>
              <h4><a class="title-link" href={`/specs/${spec.id}`} title={spec.title}>{spec.title}</a></h4>
            </div>
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

  .spec-grid-shell {
    display: grid;
    gap: 0.9rem;
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--line);
    background: var(--panel);
    box-shadow: var(--shadow);
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

  .spec-card.selected {
    border-color: rgba(15, 141, 96, 0.22);
    background: linear-gradient(180deg, rgba(255, 253, 249, 0.96), rgba(239, 248, 243, 0.9));
  }

  .card-head,
  .mini-head,
  .progress-copy,
  .card-topline,
  .analysis-topline {
    display: flex;
    align-items: center;
  }

  .card-head,
  .progress-copy,
  .card-topline,
  .analysis-topline {
    justify-content: space-between;
    gap: 1rem;
  }

  .card-copy,
  .analysis-copy {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
  }

  .mini-head {
    gap: 0.4rem;
    color: var(--muted-soft);
  }

  .spec-id,
  .status {
    margin: 0;
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted);
  }

  .card-meta,
  .analysis-meta {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.38rem;
    flex-wrap: wrap;
  }

  .status,
  .mini-pill,
  .chip,
  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
    border-radius: 999px;
    padding: 0.18rem 0.48rem;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.88);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.34) inset,
      var(--pill-glow, var(--shadow-soft));
    font-size: 0.71rem;
    line-height: 1.1;
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

  .title-link {
    text-decoration: none;
  }

  .mini-pill.neutral {
    border-color: rgba(24, 22, 18, 0.1);
    background: rgba(255, 255, 255, 0.82);
    --pill-glow: 0 10px 20px rgba(24, 22, 18, 0.05);
  }

  .status.active {
    color: #0d6e4b;
    border-color: rgba(15, 141, 96, 0.2);
    background: rgba(15, 141, 96, 0.14);
    --pill-glow: 0 0 16px rgba(15, 141, 96, 0.14);
  }

  .status.proposed {
    color: #3456a0;
    border-color: rgba(70, 107, 202, 0.2);
    background: rgba(70, 107, 202, 0.12);
    --pill-glow: 0 0 16px rgba(70, 107, 202, 0.12);
  }

  .status.paused {
    color: #755733;
    border-color: rgba(125, 96, 58, 0.22);
    background: rgba(125, 96, 58, 0.14);
    --pill-glow: 0 0 16px rgba(125, 96, 58, 0.12);
  }

  .status.done {
    color: #0c6d4a;
    border-color: rgba(17, 122, 84, 0.18);
    background: rgba(17, 122, 84, 0.12);
    --pill-glow: 0 0 16px rgba(17, 122, 84, 0.1);
  }

  .status.archived {
    color: #6e5434;
    border-color: rgba(117, 92, 58, 0.18);
    background: rgba(117, 92, 58, 0.14);
    --pill-glow: 0 0 16px rgba(117, 92, 58, 0.1);
  }

  .status-pill.review {
    color: #8f5421;
    border-color: rgba(143, 84, 33, 0.22);
    background: rgba(143, 84, 33, 0.14);
    --pill-glow: 0 0 16px rgba(143, 84, 33, 0.14);
  }

  .status-pill.blocked {
    color: #8d2d2d;
    border-color: rgba(151, 45, 45, 0.22);
    background: rgba(151, 45, 45, 0.12);
    --pill-glow: 0 0 16px rgba(151, 45, 45, 0.14);
  }

  .status-pill.todo {
    color: #5d5549;
    border-color: rgba(84, 78, 67, 0.14);
    background: rgba(84, 78, 67, 0.1);
    --pill-glow: 0 0 14px rgba(84, 78, 67, 0.08);
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

    .spec-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
