<script lang="ts">
  import type { Snippet } from "svelte";
  let { title, count, children }: { title: string; count?: number; children?: Snippet } = $props();
</script>

<header class="view-toolbar">
  <div class="view-heading"><h1>{title}</h1>{#if count !== undefined}<span class="count">{count}</span>{/if}</div>
  {#if children}<div class="view-controls">{@render children()}</div>{/if}
</header>

<style>
  .view-toolbar { display: flex; align-items: center; justify-content: space-between; gap: .75rem; min-height: 2.75rem; margin: -.75rem -.75rem .75rem; padding: .375rem .75rem; border-bottom: 1px solid var(--border-subtle); background: var(--surface); }
  .view-heading, .view-controls { display: flex; align-items: center; gap: .75rem; min-width: 0; }
  h1 { margin: 0; font: 650 1.25rem/1.3 var(--body-font); }
  .count { color: var(--text-muted); font-variant-numeric: tabular-nums; }
  .view-controls { flex-wrap: wrap; }
  @media (max-width: 767px) { .view-toolbar { flex-wrap: wrap; } }
</style>
