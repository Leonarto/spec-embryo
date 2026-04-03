<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Filter, Layers3, RotateCcw, SlidersHorizontal } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import type { DashboardData, DashboardTimeWindow } from "../../../../src/services/dashboard.ts";
  import MultiSelectDropdown from "./MultiSelectDropdown.svelte";
  import SelectDropdown from "./SelectDropdown.svelte";

  let {
    dashboard,
    title = "Analysis filters",
    detail = "Slice the analytical views by spec set and lifecycle period.",
    eyebrow = "Analytical slice",
    showTimeWindow = true,
    resultCount = dashboard.analysis.filteredTaskCount,
    resultLabel = "tasks in the current analytical slice",
    hasActiveFilters = dashboard.analysis.hasActiveFilters,
    inactiveDetail = "Without analytical filters, archived tasks stay hidden from active-flow views.",
    activeDetail = "Archived tasks are included while filters are active.",
    clearHref = "",
    extraField,
  } = $props<{
    dashboard: DashboardData;
    title?: string;
    detail?: string;
    eyebrow?: string;
    showTimeWindow?: boolean;
    resultCount?: number;
    resultLabel?: string;
    hasActiveFilters?: boolean;
    inactiveDetail?: string;
    activeDetail?: string;
    clearHref?: string;
    extraField?: Snippet;
  }>();

  const timeWindows: Array<{ value: DashboardTimeWindow; label: string; description: string }> = [
    { value: "7d", label: "Last 7 days", description: "Only recently completed or cancelled work." },
    { value: "30d", label: "Last 30 days", description: "A broader recent delivery slice." },
    { value: "90d", label: "Last 90 days", description: "A quarterly view of lifecycle history." },
  ];

  const specOptions = $derived(
    dashboard.analysis.availableSpecs.map((spec: DashboardData["analysis"]["availableSpecs"][number]) => ({
      value: spec.id,
      label: spec.id,
      description: spec.title,
    })),
  );

  const currentPath = $derived(page.url.pathname);

  async function applyFilters(event: Event): Promise<void> {
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const searchParams = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      if (typeof value !== "string" || value.length === 0) {
        continue;
      }

      searchParams.append(key, value);
    }

    const search = searchParams.toString();
    await goto(search.length > 0 ? `${currentPath}?${search}` : currentPath, {
      keepFocus: true,
      noScroll: true,
      replaceState: true,
    });
  }
</script>

<section class="filters-shell">
  <div class="filters-copy">
    <div class="copy-head">
      <span class="icon-pill">
        <Filter size={15} strokeWidth={1.9} />
      </span>
      <div>
        <p class="eyebrow">{eyebrow}</p>
        <h4>{title}</h4>
      </div>
    </div>
    <p>{detail}</p>
  </div>

  <form class="filters-form" method="GET" action={currentPath} onchange={applyFilters}>
    <div class="field-grid">
      <fieldset class="field-card">
        <legend>
          <Layers3 size={14} strokeWidth={1.9} />
          Specs
        </legend>
        <MultiSelectDropdown
          name="spec"
          options={specOptions}
          selectedValues={dashboard.analysis.selectedSpecIds}
          buttonLabel="Choose specs"
          emptyLabel="All specs"
        />
      </fieldset>

      {#if showTimeWindow}
        <fieldset class="field-card field-card-select">
          <legend>
            <SlidersHorizontal size={14} strokeWidth={1.9} />
            Time window
          </legend>
          <SelectDropdown
            name="window"
            options={timeWindows}
            selectedValue={dashboard.analysis.timeWindow ?? ""}
            buttonLabel="Choose window"
            emptyLabel="All lifecycle history"
          />
        </fieldset>
      {/if}

      {@render extraField?.()}
    </div>

    <div class="filters-footer">
      <div class="result-copy">
        <strong>{resultCount}</strong>
        <span>{resultLabel}</span>
        {#if hasActiveFilters}
          <small>{activeDetail}</small>
        {:else}
          <small>{inactiveDetail}</small>
        {/if}
      </div>

      <div class="button-row">
        <a class="ghost-button" href={clearHref || currentPath}>
          <RotateCcw size={14} strokeWidth={1.9} />
          Clear
        </a>
      </div>
    </div>
  </form>
</section>

<style>
  .filters-shell {
    display: grid;
    gap: 0.85rem;
    margin-bottom: 1rem;
    padding: 0.9rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(255, 252, 246, 0.94), rgba(247, 241, 232, 0.88));
    box-shadow: var(--shadow);
  }

  .filters-copy,
  .filters-form,
  .field-grid {
    display: grid;
    gap: 0.7rem;
  }

  .copy-head,
  .filters-footer,
  .button-row,
  legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filters-footer {
    justify-content: space-between;
    gap: 0.85rem;
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
    grid-template-columns: minmax(0, 1.65fr) repeat(2, minmax(13rem, 0.9fr));
  }

  .field-grid:has(> :only-child) {
    grid-template-columns: 1fr;
  }

  .field-card {
    display: grid;
    gap: 0.55rem;
    min-width: 0;
    padding: 0.72rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.72);
    box-shadow: var(--shadow-soft);
  }

  .field-card-select {
    align-content: start;
  }

  legend,
  legend {
    padding: 0;
    color: var(--muted-soft);
    font-size: 0.78rem;
    font-weight: 600;
  }

  .ghost-button {
    border-radius: 999px;
    border: 1px solid var(--line-strong);
    background: rgba(255, 255, 255, 0.9);
    color: var(--ink);
    box-shadow: var(--shadow-soft);
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

  .ghost-button {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    padding: 0.62rem 0.88rem;
    text-decoration: none;
    cursor: pointer;
  }

  @media (max-width: 980px) {
    .field-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
