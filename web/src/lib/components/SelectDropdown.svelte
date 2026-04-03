<script lang="ts">
  import { Check, ChevronDown, ListFilter } from "@lucide/svelte";

  export interface SelectDropdownOption {
    value: string;
    label: string;
    description?: string;
  }

  let {
    name,
    options,
    selectedValue = "",
    buttonLabel = "Choose item",
    emptyLabel = "All items",
  } = $props<{
    name: string;
    options: readonly SelectDropdownOption[];
    selectedValue?: string;
    buttonLabel?: string;
    emptyLabel?: string;
  }>();

  const selectedOption = $derived(options.find((option: SelectDropdownOption) => option.value === selectedValue));
  const summaryText = $derived(selectedOption?.label ?? emptyLabel);
</script>

<details class="dropdown-shell">
  <summary class="dropdown-trigger">
    <div class="summary-copy">
      <span class="summary-label">
        <ListFilter size={14} strokeWidth={1.9} />
        {buttonLabel}
      </span>
      <strong>{summaryText}</strong>
    </div>

    <span class="summary-meta">
      <span class="chevron">
        <ChevronDown size={16} strokeWidth={1.9} />
      </span>
    </span>
  </summary>

  <div class="dropdown-panel">
    <div class="option-list">
      <label class:selected={selectedValue === ""}>
        <input type="radio" name={name} value="" checked={selectedValue === ""} />
        <span class="checkbox-mark">
          <Check size={12} strokeWidth={2.2} />
        </span>
        <span class="option-copy">
          <strong>{emptyLabel}</strong>
          <small>Do not constrain this field.</small>
        </span>
      </label>

      {#each options as option}
        <label class:selected={selectedValue === option.value}>
          <input type="radio" name={name} value={option.value} checked={selectedValue === option.value} />
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
      {/each}
    </div>
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
    padding: 0.72rem 0.84rem;
    border-radius: 1rem;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.86);
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
    border-color: rgba(15, 141, 96, 0.2);
    background: rgba(255, 255, 255, 0.94);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.34) inset,
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
    border: 1px solid rgba(24, 22, 18, 0.12);
    background: rgba(255, 252, 246, 0.98);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.4) inset,
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
    background: rgba(255, 255, 255, 0.82);
    cursor: pointer;
    transition:
      border-color 120ms ease,
      transform 120ms ease,
      box-shadow 120ms ease,
      background 120ms ease;
  }

  .option-list label:hover {
    transform: translateY(-1px);
    border-color: rgba(24, 22, 18, 0.16);
  }

  .option-list label.selected {
    border-color: rgba(15, 141, 96, 0.26);
    background: rgba(15, 141, 96, 0.08);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.34) inset,
      0 10px 24px rgba(15, 141, 96, 0.08);
  }

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
    border-radius: 999px;
    border: 1px solid var(--line-strong);
    background: rgba(255, 255, 255, 0.94);
    color: transparent;
    transition:
      background 120ms ease,
      color 120ms ease,
      border-color 120ms ease,
      box-shadow 120ms ease;
  }

  .option-list label.selected .checkbox-mark {
    border-color: rgba(15, 141, 96, 0.22);
    background: rgba(15, 141, 96, 0.14);
    color: #0d6e4b;
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
