<script lang="ts">
  import { untrack, type Snippet } from "svelte";
  import { Check, ChevronDown, ListFilter } from "@lucide/svelte";

  export interface MultiSelectOption {
    value: string;
    label: string;
    description?: string;
    href?: string;
  }

  let {
    name,
    options,
    selectedValues = [],
    buttonLabel = "Select items",
    emptyLabel = "No filters applied",
    form,
    panelHeader,
    panelFooter,
    onSelectionChange,
    resetKey = "",
  } = $props<{
    name: string;
    options: readonly MultiSelectOption[];
    selectedValues?: string[];
    buttonLabel?: string;
    emptyLabel?: string;
    form?: string;
    panelHeader?: Snippet;
    panelFooter?: Snippet;
    onSelectionChange?: (values: string[]) => void;
    resetKey?: string;
  }>();

  let currentValues=$state(untrack(()=>[...selectedValues]));
  let sourceKey=untrack(()=>JSON.stringify([selectedValues,resetKey]));
  $effect(()=>{const next=selectedValues,key=JSON.stringify([next,resetKey]);if(key!==sourceKey){sourceKey=key;currentValues=[...next];}});
  const selectedSet = $derived(new Set(currentValues));
  const selectedOptions = $derived(options.filter((option: MultiSelectOption) => selectedSet.has(option.value)));
  const summaryText = $derived(
    currentValues.length === 0
      ? emptyLabel
      : currentValues.length === 1
        ? selectedOptions[0]?.label ?? currentValues[0] ?? emptyLabel
        : `${currentValues.length} selected`,
  );
  const visibleIds = $derived(new Set(options.map((option: MultiSelectOption) => option.value)));
  let details: HTMLDetailsElement;
  function dismiss(event: KeyboardEvent) { if (event.key === "Escape" && !event.defaultPrevented && details?.open && details.contains(document.activeElement)) { event.preventDefault(); details.open = false; details.querySelector("summary")?.focus(); } }
  function outside(event: PointerEvent) { if (details?.open && event.target instanceof Node && !details.contains(event.target)) details.open = false; }
  function toggle(value: string, checked: boolean) {
    const next = new Set(currentValues);
    if (checked) next.add(value); else next.delete(value);
    currentValues=[...next];
    onSelectionChange?.(currentValues);
  }
</script>

<svelte:window onkeydown={dismiss} onpointerdown={outside} />
<details class="dropdown-shell" bind:this={details}>
  <summary class="dropdown-trigger">
    <div class="summary-copy">
      <span class="summary-label">
        <ListFilter size={14} strokeWidth={1.9} />
        {buttonLabel}
      </span>
      <strong>{summaryText}</strong>
    </div>

    <div class="summary-meta">
      {#if currentValues.length > 0}
        <span class="count-pill">{currentValues.length}</span>
      {/if}
      <span class="chevron">
        <ChevronDown size={16} strokeWidth={1.9} />
      </span>
    </div>
  </summary>

  <div class="dropdown-panel">
    {@render panelHeader?.()}
    {#each currentValues.filter((value: string) => !visibleIds.has(value)) as value}
      <input type="hidden" name={name} {value} {form} />
    {/each}
    <div class="option-list">
      {#each options as option}
        <div class="option-entry">
        <label class:selected={selectedSet.has(option.value)}>
          <input type="checkbox" name={name} value={option.value} {form} checked={selectedSet.has(option.value)} onchange={(event) => toggle(option.value, event.currentTarget.checked)} />
          <span class="checkbox-mark">
            <Check size={12} strokeWidth={2.2} />
          </span>
          <span class="option-copy">
            <strong>{option.label}</strong>
            {#if option.description}
              <small>{option.description}</small>
            {/if}
          </span>
        </label>
        {#if option.href}<a class="option-link" href={option.href}>Open {option.label}</a>{/if}
        </div>
      {/each}
    </div>
    {@render panelFooter?.()}
  </div>
</details>

<style>
  .dropdown-shell {
    position: relative;
    display: grid;
  }

  .dropdown-trigger {
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-width: 0;
    padding: 0.78rem 0.88rem;
    border-radius: 1rem;
    border: 1px solid var(--line);
    background: var(--surface-interactive);
    box-shadow: var(--shadow-soft);
    cursor: pointer;
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease,
      background 120ms ease,
      transform 120ms ease;
  }

  .dropdown-trigger::-webkit-details-marker {
    display: none;
  }

  .dropdown-shell[open] .dropdown-trigger,
  .dropdown-trigger:hover {
    border-color: var(--accent-border);
    background: var(--surface-interactive-hover);
    box-shadow:
      0 0 0 1px var(--inset-highlight) inset,
      0 12px 30px rgba(24, 22, 18, 0.08);
  }

  .summary-copy,
  .summary-label,
  .summary-meta,
  .option-copy {
    display: flex;
    gap: 0.42rem;
  }

  .summary-copy {
    min-width: 0;
    flex-direction: column;
    gap: 0.14rem;
  }

  .summary-label,
  .summary-meta {
    align-items: center;
  }

  .summary-label {
    color: var(--muted-soft);
    font-size: 0.78rem;
    font-weight: 600;
  }

  .summary-copy strong {
    min-width: 0;
    color: var(--ink);
    font-size: 0.9rem;
    font-weight: 600;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .summary-meta {
    flex-shrink: 0;
  }

  .count-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.55rem;
    height: 1.55rem;
    padding: 0 0.45rem;
    border-radius: 999px;
    border: 1px solid var(--accent-border);
    background: var(--accent-soft);
    color: var(--accent-ink);
    box-shadow: 0 0 16px rgba(15, 141, 96, 0.12);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .chevron {
    color: var(--muted);
    transition: transform 120ms ease;
  }

  .dropdown-shell[open] .chevron {
    transform: rotate(180deg);
  }

  .dropdown-panel {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    z-index: 15;
    padding: 0.5rem;
    border-radius: 1.05rem;
    border: 1px solid var(--line);
    background: var(--surface-overlay);
    box-shadow:
      0 0 0 1px var(--inset-highlight) inset,
      0 22px 50px rgba(24, 22, 18, 0.12);
    backdrop-filter: blur(14px);
  }

  .option-list {
    display: grid;
    gap: 0.42rem;
    max-height: 18rem;
    overflow: auto;
    padding-right: 0.1rem;
  }

  .option-list label {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr);
    align-items: start;
    gap: 0.6rem;
    padding: 0.68rem 0.72rem;
    border-radius: 0.95rem;
    border: 1px solid var(--line);
    background: var(--surface-card-soft);
    cursor: pointer;
    transition:
      border-color 120ms ease,
      transform 120ms ease,
      box-shadow 120ms ease,
      background 120ms ease;
  }

  .option-list label:hover {
    transform: translateY(-1px);
    border-color: var(--line-strong);
  }

  .option-list label:has(input:checked) {
    border-color: var(--accent-border);
    background: var(--accent-soft);
    box-shadow:
      0 0 0 1px var(--inset-highlight) inset,
      0 10px 24px rgba(15, 141, 96, 0.08);
  }
  .option-entry { min-width: 0; }
  .option-link { display: inline-flex; align-items: center; min-height: 1.5rem; margin: .125rem .5rem; color: var(--accent); font-size: .75rem; }
  .option-list label:focus-within { outline: 2px solid var(--focus); outline-offset: 2px; }

  .option-list input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .checkbox-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.05rem;
    height: 1.05rem;
    margin-top: 0.12rem;
    border-radius: 0.32rem;
    border: 1px solid var(--line-strong);
    background: var(--surface-overlay-soft);
    color: transparent;
    transition:
      background 120ms ease,
      color 120ms ease,
      border-color 120ms ease,
      box-shadow 120ms ease;
  }

  .option-list input:checked + .checkbox-mark {
    border-color: var(--accent-border);
    background: var(--accent-strong-soft);
    color: var(--accent-ink);
    box-shadow: 0 0 14px rgba(15, 141, 96, 0.12);
  }

  .option-copy {
    min-width: 0;
    flex-direction: column;
    gap: 0.12rem;
  }

  .option-copy strong {
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .option-copy small {
    color: var(--muted);
    line-height: 1.35;
  }
</style>
