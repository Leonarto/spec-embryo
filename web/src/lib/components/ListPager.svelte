<script lang="ts">
  import {retainListRelationIntent} from "../inspector/list-relations.ts";
  import {workspaceURL} from '../workspace/location.svelte.ts';
  import type { WorkspaceListQuery,WorkspaceRoute } from "../../../../src/services/workspace-query.ts";
  import { normalizeViewQuery,serializeViewQuery } from "../../../../src/services/workspace-query.ts";
  let {result,route,compact=false}: {result:{totalMatching:number;page:number;requestedPage:number;pageSize:number;normalizedQuery:WorkspaceListQuery};route:WorkspaceRoute;compact?:boolean}=$props();
  const last=$derived(Math.max(1,Math.ceil(result.totalMatching/result.pageSize)));
  function params(target:number){const query=normalizeViewQuery(route,workspaceURL().searchParams);query.list={...result.normalizedQuery,page:target};return retainListRelationIntent(workspaceURL().searchParams,serializeViewQuery(query));}
  function href(target:number){return `${workspaceURL().pathname}?${params(target)}`;}
  const hidden=$derived([...params(1).entries()].filter(([name])=>name!=='pageSize'));
</script>
<nav class="list-pager" class:compact aria-label="List pagination">
  {#if result.requestedPage!==result.page}<span class="page-notice" role="status">La página solicitada ya no existe; mostrando página {result.page}.</span>{/if}
  <span class="range">{result.totalMatching?(result.page-1)*result.pageSize+1:0}–{Math.min(result.page*result.pageSize,result.totalMatching)} of {result.totalMatching}</span>
  <div class="page-links">
    {#if result.page>1}<a href={href(1)}>First</a><a href={href(result.page-1)}>Previous</a>{:else}<span>First</span><span>Previous</span>{/if}
    <span>Page {result.page} / {last}</span>
    {#if result.page<last}<a href={href(result.page+1)}>Next</a><a href={href(last)}>Last</a>{:else}<span>Next</span><span>Last</span>{/if}
  </div>
  <form method="GET" action={workspaceURL().pathname}>
    {#each hidden as [name,value]}<input type="hidden" {name} {value} />{/each}
    <label>Per page<select name="pageSize" value={result.pageSize}>{#each [50,100,200] as size}<option value={size}>{size}</option>{/each}</select></label><button type="submit">Apply</button>
  </form>
</nav>
<style>
  .list-pager,.page-links,form,label { display:flex;align-items:center;gap:.5rem;flex-wrap:wrap; }
  .list-pager { justify-content:space-between;margin:.75rem 0;padding:.5rem .75rem;background:var(--surface);border:1px solid var(--border-subtle);border-radius:.25rem;font-size:.75rem; }
  .list-pager.compact { margin:0;border-top:0;border-radius:0; }
  .range { font-variant-numeric:tabular-nums; }
  .page-notice { flex-basis:100%;color:var(--warning); }
  .page-links a { display:inline-flex;align-items:center;min-height:1.5rem;color:var(--accent); }
  .page-links>span,label { color:var(--text-muted); }
  select,button { min-height:1.5rem;padding:.125rem .375rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text); }
@media(pointer:coarse){a,select,button{min-height:2.75rem}.page-links a{min-height:2.75rem}}
</style>
