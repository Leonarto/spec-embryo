<script lang="ts">
  let {count,onCopyRows,onCopyIds,onClear,feedback,fallback}:{count:number;onCopyRows:()=>void;onCopyIds:()=>void;onClear:()=>void;feedback:string;fallback?:string}=$props();
</script>
<div class="selection-bar"><strong>{count} selected</strong><button type="button" disabled={!count} onclick={onCopyRows}>Copy rows TSV</button><button type="button" disabled={!count} onclick={onCopyIds}>Copy IDs</button><button type="button" disabled={!count} onclick={onClear}>Clear selection</button><span>Arrows: cells · Tab: leave · Ctrl/Cmd+C: copy</span></div>
<p class="sr-only" role="status">{feedback}</p>
{#if fallback!==undefined}<div class="clipboard-fallback" role="alert"><label>Clipboard unavailable. Select and copy this text<textarea readonly value={fallback} rows="4"></textarea></label></div>{/if}
<style>
  .selection-bar{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;min-height:2.5rem;padding:.25rem .5rem;border:1px solid var(--border-subtle);border-top:0;background:var(--surface);font-size:.75rem}.selection-bar strong{color:var(--accent);min-width:5rem}.selection-bar span{color:var(--text-muted);margin-left:auto}button{min-height:1.5rem;border:1px solid var(--border-control);border-radius:.25rem;padding:.125rem .5rem;background:var(--surface);color:var(--text);cursor:pointer}button:disabled{color:var(--text-muted);border-color:var(--border-subtle);cursor:default}.clipboard-fallback{padding:.5rem;border:1px solid var(--warning);background:var(--surface);color:var(--warning)}label{display:grid;gap:.25rem;font-size:.75rem}textarea{width:100%;resize:vertical;background:var(--surface);color:var(--text);border:1px solid var(--border-control);font: .75rem var(--mono-font)}
@media(pointer:coarse){button{min-height:2.75rem}}
</style>
