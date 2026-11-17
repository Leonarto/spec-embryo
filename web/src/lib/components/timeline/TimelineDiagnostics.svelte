<script lang="ts">
  import type {TimelineDiagnostics} from '../../../../../src/services/workspace-timeline-contract.ts';
  let {diagnostics:d}:{diagnostics:TimelineDiagnostics}=$props();
  const visible=$derived(d.missingReferences.count>0||d.outsideViewReferenceCount>0||d.hasCycles||d.invalidPlacements.count>0||d.nonFiniteTotal);
</script>
{#if visible}<details class="diagnostics"><summary>Graph diagnostics{#if d.missingReferences.count} · {d.missingReferences.count} missing references{/if}{#if d.outsideViewReferenceCount} · {d.outsideViewReferenceCount} references outside this view{/if}{#if d.hasCycles} · cycles detected{/if}{#if d.invalidPlacements.count||d.nonFiniteTotal} · relative placement unavailable{/if}</summary>
  <p>Scope: filtered timeline · {d.graphTaskCount} unique tasks. Dependencies outside current filters are separate from missing references.</p>
  {#if d.hasCycles}<p>{d.backEdges.count} DFS back-edge occurrences. Cycles were detected; relative positions use a deterministic fallback and are not a reliable schedule. This is not a count of cycles.</p>{/if}
  {#each [{label:'Missing references',category:d.missingReferences},{label:'Detected back edges',category:d.backEdges}] as entry}
    {#if entry.category.count}<h2>{entry.label}</h2><ul>{#each entry.category.samples as edge}<li>{edge.taskId} → {edge.dependencyId} (dependency {edge.dependencyIndex+1})</li>{/each}</ul>{#if entry.category.omittedCount}<p>{entry.category.omittedCount} additional occurrences omitted.</p>{/if}{/if}
  {/each}
  {#if d.invalidPlacements.count}<h2>Unavailable placement</h2><ul>{#each d.invalidPlacements.samples as entry}<li>{entry.taskId}: {entry.fields.join(', ')}</li>{/each}</ul>{#if d.invalidPlacements.omittedCount}<p>{d.invalidPlacements.omittedCount} additional tasks omitted.</p>{/if}{/if}
  {#if d.nonFiniteTotal}<p>The derived total is not finite. No relative bars or ruler are displayed.</p>{/if}
</details>{/if}
<style>.diagnostics{flex-shrink:0;border:1px solid var(--warning);border-radius:.25rem;padding:.375rem .625rem;margin-bottom:.5rem;font-size:.75rem;background:var(--surface);max-height:18rem;overflow:auto}.diagnostics summary{color:var(--warning);cursor:pointer;min-height:24px}.diagnostics p{color:var(--text-muted);margin:.5rem 0}.diagnostics h2{font:600 .75rem var(--body-font);margin:.75rem 0 .25rem}.diagnostics ul{margin:.25rem 0;padding-left:1.25rem;font-variant-numeric:tabular-nums}@media(pointer:coarse){.diagnostics summary{min-height:44px}}</style>
