<script lang="ts">
  import type { Snippet } from "svelte";
  let { label, children, onclick, disabled = false, expanded, controls, busy = false }: {
    label: string; children: Snippet; onclick?: (event: MouseEvent) => void;
    disabled?: boolean; expanded?: boolean; controls?: string; busy?: boolean;
  } = $props();
</script>

<button type="button" class="icon-button" aria-label={label} title={label} aria-expanded={expanded} aria-controls={controls} aria-busy={busy} {onclick} {disabled}>
  {@render children()}
</button>

<style>
  .icon-button { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 2rem; height: 2rem; padding: .25rem; background: var(--surface); color: var(--text-muted); border: 1px solid transparent; border-radius: .25rem; cursor: pointer; }
  .icon-button:hover { color: var(--text); background: var(--surface-raised); }
  .icon-button:disabled { cursor: wait; color: var(--text-muted); }
  @media (pointer: coarse) { .icon-button { min-width: 2.75rem; min-height: 2.75rem; } }
</style>
