<script lang="ts">
  import {parseRelationPages,writeRelationPages} from "../../../../src/services/detail-relations.ts";
  import {workspaceURL} from '../workspace/location.svelte.ts';
  import type { Snippet } from "svelte";
  import type { WorkspaceFilterData } from "../../../../src/services/workspace.ts";
  import { normalizeViewQuery,serializeViewQuery,workspaceListURL,type WorkspaceRoute } from "../../../../src/services/workspace-query.ts";
  import SelectDropdown from "./SelectDropdown.svelte";
  import SpecOptionsPicker from "./SpecOptionsPicker.svelte";
  let { filters,route,title='Filters',detail='',showTimeWindow=true,resultCount,resultLabel='matching records',extraField,showSearch=true,compact=false,onClear,onApply,controlledNames=[] }: {
    filters:WorkspaceFilterData;route:WorkspaceRoute;title?:string;detail?:string;showTimeWindow?:boolean;resultCount:number;resultLabel?:string;extraField?:Snippet<[string,string]>;showSearch?:boolean;compact?:boolean;onClear?:()=>void;onApply?:(event:SubmitEvent)=>void;controlledNames?:string[];
  }=$props();
  const formId='workspace-filters';
  let clearEpoch=$state(0);
  const resetKey=$derived(JSON.stringify([workspaceListURL(workspaceURL()),clearEpoch]));
  const timeWindows=[{value:'7d',label:'Last 7 days',description:'Completed or cancelled lifecycle timestamp.'},{value:'30d',label:'Last 30 days',description:'Completed or cancelled lifecycle timestamp.'},{value:'90d',label:'Last 90 days',description:'Completed or cancelled lifecycle timestamp.'}];
  const query=$derived(normalizeViewQuery(route,workspaceURL().searchParams));
  const preserved=$derived.by(()=>{
    const params=serializeViewQuery(query);
    if(query.inspect)writeRelationPages(params,query.inspect.kind,parseRelationPages(query.inspect.kind,workspaceURL().searchParams));
    for(const name of ['spec','q',...controlledNames])params.delete(name);
    if(route==='specs'){params.delete('status');params.delete('spec_status');}
    if(showTimeWindow)params.delete('window');
    if(route==='tasks'||route==='specs')params.set('page','1');
    if((route==='tasks'||route==='timeline')&&!controlledNames.includes('scope'))params.set('scope',filters.scope);else if(route==='specs'&&!controlledNames.includes('taskScope'))params.set('taskScope',filters.scope);
    return [...params.entries()];
  });
  const clearHref=$derived.by(()=>{
    const clean=normalizeViewQuery(route,new URLSearchParams());
    if(query.inspect){clean.inspect=query.inspect;clean.section=query.section;}
    clean.simple=query.simple;clean.view=query.view;
    const params=serializeViewQuery(clean);
    if(clean.inspect)writeRelationPages(params,clean.inspect.kind,parseRelationPages(clean.inspect.kind,workspaceURL().searchParams));
    return `${workspaceURL().pathname}?${params}`;
  });
</script>
<section class="filters-shell" class:compact aria-label={title}>
  <div class="filters-heading"><strong>{title}</strong><span>{resultCount} {resultLabel}</span></div>
  {#if detail}<p class="filter-detail">{detail}</p>{/if}
  <form id={formId} method="GET" action={workspaceURL().pathname} onsubmit={onApply}>
    {#each preserved as [name,value]}<input type="hidden" {name} {value} />{/each}
  </form>
  <div class="field-grid">
    {#if showSearch&&(route==='tasks'||route==='specs')}<label class="search-label">Search{#key resetKey}<input type="search" name="q" form={formId} value={query.list?.q??''} placeholder="ID, title or summary" />{/key}</label>{/if}
    <SpecOptionsPicker {resetKey} seedQuery={query.options} initial={filters.options} selectedValues={filters.selectedSpecIds} filterForm={formId} {route} />
    {#if showTimeWindow}<SelectDropdown name="window" form={formId} {resetKey} options={timeWindows} selectedValue={filters.timeWindow??''} buttonLabel="Lifecycle window" emptyLabel="All lifecycle history" />{/if}
    {@render extraField?.(formId,resetKey)}
  </div>
  <div class="filter-actions"><button type="submit" form={formId}>Apply filters</button><a href={clearHref} onclick={()=>{clearEpoch++;onClear?.();}}>Clear filters</a><span>{filters.scope==='unarchived'?'Not archived':filters.scope==='archived'?'Archived tasks':'All tasks, including archive'}</span>{#if filters.timeWindow}<span>Lifecycle: {filters.timeWindow}</span>{/if}{#if filters.legacyArchive}<span class="legacy-chip">Incluye archivo · enlace anterior</span>{/if}</div>
  {#if filters.unavailableSpecIds.length}<p class="unavailable" role="status">No se pudieron aplicar estos filtros: {filters.unavailableSpecIds.join(', ')}. {filters.selectedSpecIds.length ? 'Se aplican los filtros de spec disponibles.' : 'Se muestran resultados sin filtro de spec.'}</p>{/if}
</section>
<style>
  .compact :global(.dropdown-panel) { position:static;margin-top:.25rem;max-height:18rem;overflow:auto;box-shadow:none; }
  .compact :global(.dropdown-trigger) { min-height:2rem;padding:.375rem .5rem;border-radius:.25rem;box-shadow:none; }
  .compact :global(.summary-copy strong) { font-size:.8125rem; }
  @media(pointer:coarse) { .compact :global(summary),.compact :global(button),.compact input,.compact .filter-actions a { min-height:2.75rem; } }
  .filters-shell.compact { border:0;margin:0;padding:0; }
  .filters-shell { margin-bottom:.75rem;padding:.75rem;border:1px solid var(--border-subtle);border-radius:.25rem;background:var(--surface); }
  .filters-heading { display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:.5rem; }
  .filters-heading>span,.filter-detail { color:var(--text-muted);font-size:.75rem; }
  .filter-detail { margin:.25rem 0 .5rem; }
  .field-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:.5rem;align-items:end; }
  .search-label { display:grid;gap:.25rem;color:var(--text-muted);font-size:.75rem; }
  input[type="search"] { min-height:2rem;padding:.375rem .5rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text); }
  .filter-actions { display:flex;align-items:center;flex-wrap:wrap;gap:.5rem .75rem;margin-top:.75rem; }
  button { min-height:2rem;padding:.375rem .75rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--accent);cursor:pointer; }
  .filter-actions a { display:inline-flex;align-items:center;min-height:1.5rem;color:var(--accent); }
  .filter-actions span { color:var(--text-muted);font-size:.75rem; }
  .legacy-chip { padding:.125rem .375rem;border:1px solid var(--warning);border-radius:.25rem;color:var(--warning) !important; }
  .unavailable { color:var(--warning);margin:.5rem 0 0;font-size:.75rem; }
</style>
