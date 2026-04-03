<script lang="ts">
  import { page } from "$app/state";
  import { Filter, Layers3, RotateCcw, SlidersHorizontal } from "@lucide/svelte";
  import type { DashboardData, DashboardTimeWindow } from "../../../../src/services/dashboard.ts";

  let { dashboard, title = "Analysis filters", detail = "Slice the analytical views by spec set and lifecycle period." } = $props<{
    dashboard: DashboardData;
    title?: string;
    detail?: string;
  }>();

  const timeWindows: Array<{ value: DashboardTimeWindow; label: string }> = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
  ];

  const currentPath = $derived(page.url.pathname);
  const selectedSpecIds = $derived(new Set(dashboard.analysis.selectedSpecIds));
</script>

<section class="filters-shell">
  <div class="filters-copy">
    <div class="copy-head">
      <span class="icon-pill">
        <Filter size={15} strokeWidth={1.9} />
      </span>
      <div>
        <p class="eyebrow">Analytical slice</p>
        <h4>{title}</h4>
      </div>
    </div>
    <p>{detail}</p>
  </div>

  <form class="filters-form" method="GET" action={currentPath}>
    <div class="field-grid">
      <fieldset class="field-card">
        <legend>
          <Layers3 size={14} strokeWidth={1.9} />
          Specs
        </legend>
        <div class="spec-options">
          {#each dashboard.analysis.availableSpecs as spec}
            <label class:selected={selectedSpecIds.has(spec.id)}>
              <input type="checkbox" name="spec" value={spec.id} checked={selectedSpecIds.has(spec.id)} />
              <span>{spec.id}</span>
              <small>{spec.title}</small>
            </label>
          {/each}
        </div>
      </fieldset>

      <label class="field-card field-card-select">
        <span class="field-label">
          <SlidersHorizontal size={14} strokeWidth={1.9} />
          Time window
        </span>
        <select name="window">
          <option value="">All lifecycle history</option>
          {#each timeWindows as window}
            <option value={window.value} selected={dashboard.analysis.timeWindow === window.value}>
              {window.label}
            </option>
          {/each}
        </select>
      </label>
    </div>

    <div class="filters-footer">
      <div class="result-copy">
        <strong>{dashboard.analysis.filteredTaskCount}</strong>
        <span>tasks in the current analytical slice</span>
        {#if dashboard.analysis.includesArchived}
          <small>Archived tasks are included while filters are active.</small>
        {:else}
          <small>Without analytical filters, archived tasks stay hidden from active-flow views.</small>
        {/if}
      </div>

      <div class="button-row">
        <a class="ghost-button" href={currentPath}>
          <RotateCcw size={14} strokeWidth={1.9} />
          Clear
        </a>
        <button type="submit">Apply filters</button>
      </div>
    </div>
  </form>
</section>

<style>
  .filters-shell {
    display: grid;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(255, 252, 246, 0.94), rgba(247, 241, 232, 0.88));
    box-shadow: var(--shadow);
  }

  .filters-copy,
  .filters-form,
  .field-grid,
  .spec-options {
    display: grid;
    gap: 0.8rem;
  }

  .copy-head,
  .field-label,
  .filters-footer,
  .button-row,
  legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filters-footer {
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .copy-head {
    align-items: start;
  }

  .icon-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.05rem;
    height: 2.05rem;
    border-radius: 0.85rem;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.84);
    color: var(--muted-soft);
    flex-shrink: 0;
  }

  .eyebrow {
    margin: 0 0 0.22rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.68rem;
    color: var(--muted);
  }

  h4,
  p,
  fieldset,
  legend {
    margin: 0;
  }

  h4 {
    font-family: var(--display-font);
    font-size: 1.02rem;
  }

  p,
  .result-copy span,
  .result-copy small {
    color: var(--muted);
    line-height: 1.45;
  }

  .field-grid {
    grid-template-columns: minmax(0, 1.85fr) minmax(14rem, 0.9fr);
  }

  .field-card {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
    padding: 0.85rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.72);
    box-shadow: var(--shadow-soft);
  }

  .field-card-select {
    align-content: start;
  }

  legend,
  .field-label {
    padding: 0;
    color: var(--muted-soft);
    font-size: 0.82rem;
    font-weight: 600;
  }

  .spec-options {
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  }

  .spec-options label {
    display: grid;
    gap: 0.14rem;
    padding: 0.72rem 0.78rem;
    border-radius: 1rem;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.84);
    cursor: pointer;
    transition:
      border-color 120ms ease,
      transform 120ms ease,
      box-shadow 120ms ease,
      background 120ms ease;
  }

  .spec-options label.selected {
    border-color: rgba(15, 141, 96, 0.28);
    background: rgba(15, 141, 96, 0.08);
    box-shadow: var(--shadow-soft);
  }

  .spec-options label:hover {
    transform: translateY(-1px);
    border-color: rgba(24, 22, 18, 0.16);
  }

  .spec-options input {
    accent-color: var(--accent);
    margin: 0 0 0.18rem;
  }

  .spec-options span {
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .spec-options small {
    color: var(--muted);
    line-height: 1.35;
  }

  select,
  button,
  .ghost-button {
    border-radius: 999px;
    border: 1px solid var(--line-strong);
    background: rgba(255, 255, 255, 0.9);
    color: var(--ink);
    box-shadow: var(--shadow-soft);
  }

  select {
    min-width: 0;
    width: 100%;
    padding: 0.75rem 0.9rem;
  }

  .result-copy {
    display: grid;
    gap: 0.08rem;
  }

  .result-copy strong {
    font-family: var(--display-font);
    font-size: 1.08rem;
    line-height: 1;
  }

  .button-row {
    flex-wrap: wrap;
    justify-content: end;
  }

  button,
  .ghost-button {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    padding: 0.72rem 1rem;
    text-decoration: none;
    cursor: pointer;
  }

  button {
    background: linear-gradient(180deg, rgba(15, 141, 96, 0.16), rgba(255, 255, 255, 0.94));
  }

  @media (max-width: 980px) {
    .field-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
