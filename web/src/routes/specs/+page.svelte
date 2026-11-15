<script lang="ts">
  import {onMount,untrack} from 'svelte';
  import {page} from '$app/state';
  import {goto} from '$app/navigation';
  import type {WorkspaceEnvelope,WorkspaceSpecRow} from '../../../../src/services/workspace.ts';
  import {normalizeViewQuery,serializeViewQuery,type SpecSortKey,type WorkspaceSpecQuery} from '../../../../src/services/workspace-query.ts';
  import {SPEC_STATUSES} from '../../../../src/domain.ts';
  import {useWorkspaceResource} from '../../lib/workspace/resource.svelte.ts';
  import AnalysisFilters from '../../lib/components/AnalysisFilters.svelte';
  import MultiSelectDropdown from '../../lib/components/MultiSelectDropdown.svelte';
  import SelectDropdown from '../../lib/components/SelectDropdown.svelte';
  import Popover from '../../lib/components/Popover.svelte';
  import ListPager from '../../lib/components/ListPager.svelte';
  import DataTable from '../../lib/components/data-table/DataTable.svelte';
  import ColumnsPanel from '../../lib/components/data-table/ColumnsPanel.svelte';
  import SortPanel from '../../lib/components/data-table/SortPanel.svelte';
  import SelectionBar from '../../lib/components/data-table/SelectionBar.svelte';
  import {specColumns} from '../../lib/components/data-table/spec-columns.ts';
  import {defaultTablePreferences,parseTablePreferences,renderedColumns,resizeColumn,tableStorageKey} from '../../lib/components/data-table/preferences.ts';
  import {defaultFocus,reconcileSelection,toggleRowSelection,toggleTableSort} from '../../lib/components/data-table/model.ts';
  import {idsToText,rowsToTsv,spreadsheetText} from '../../lib/components/data-table/clipboard.ts';
  import {HEADER_ROW,type FocusedCell,type TableSort} from '../../lib/components/data-table/types.ts';
  let {data}=$props();
  const resource=useWorkspaceResource(()=>data.workspace as WorkspaceEnvelope<'specs'>);
  const workspace=$derived(resource.snapshot),dashboard=$derived(workspace.data),rows=$derived(dashboard.result.rows);
  const query=$derived(dashboard.result.normalizedQuery as WorkspaceSpecQuery);
  const simple=$derived(normalizeViewQuery('specs',page.url.searchParams).simple);
  let mounted=$state(false),coarse=$state(false),viewport=$state(0),preferences=$state(defaultTablePreferences(specColumns));
  const columns=$derived(renderedColumns(preferences,specColumns,viewport).map(column=>column.key==='select'&&coarse?{...column,width:44}:column));
  let selected=$state(new Set<string>()),anchor=$state<string|undefined>(),focused=$state<FocusedCell>(untrack(()=>defaultFocus(rows.map(row=>row.id),columns.map(column=>column.key))));
  let feedback=$state(''),fallback=$state<string|undefined>(),search=$state(untrack(()=>query.q)),table=$state<DataTable<WorkspaceSpecRow>>(),toolbar:HTMLElement,searchInput:HTMLInputElement;
  let searchTimer:ReturnType<typeof setTimeout>|undefined;
  let sourceURL=untrack(()=>page.url.href),selectionKey=untrack(()=>listIntent());
  const statusOptions=SPEC_STATUSES.map(value=>({value,label:value.replaceAll('_',' ')}));
  const scopes=[{value:'all',label:'All linked tasks'},{value:'unarchived',label:'Not archived'},{value:'archived',label:'Archived'}];
  function listIntent(){const value=normalizeViewQuery('specs',page.url.searchParams);return JSON.stringify(value.list);}
  function href(update:(value:ReturnType<typeof normalizeViewQuery>)=>void){const value=normalizeViewQuery('specs',page.url.searchParams);value.list={...query};update(value);return `/specs?${serializeViewQuery(value)}`;}
  function navigate(url:string,replaceState=false){return goto(url,{replaceState,keepFocus:true,noScroll:true});}
  function sortChange(sort:TableSort[]){void navigate(href(value=>{value.list={...query,page:1,sort:sort.map(item=>({...item,key:item.key as SpecSortKey}))};}));}
  function sortHref(key:string){return href(value=>{value.list={...query,page:1,sort:toggleTableSort(query.sort,key).map(item=>({...item,key:item.key as SpecSortKey}))};});}
  function toggle(id:string,range:boolean){const next=toggleRowSelection(rows.map(row=>row.id),selected,anchor,id,range);selected=next.selected;anchor=next.anchor;}
  function selectAll(){selected=rows.length&&rows.every(row=>selected.has(row.id))?new Set():new Set(rows.map(row=>row.id));anchor=rows[0]?.id;}
  function clearSelection(){selected=new Set();anchor=undefined;fallback=undefined;feedback='Selection cleared.';}
  async function copy(text:string|undefined){if(text===undefined){feedback='Select rows to copy.';return;}fallback=undefined;try{await navigator.clipboard.writeText(text);feedback='Copied to clipboard.';}catch{fallback=text;feedback='Clipboard unavailable. Copy the text in the labeled field.';}}
  function copyRows(){void copy(rowsToTsv(rows,columns,row=>row.id,selected));}
  function copyCell(cell:FocusedCell){if(selected.size){copyRows();return;}const column=columns.find(column=>column.key===cell.columnKey),row=rows.find(row=>row.id===cell.rowId);if(column&&column.copyable!==false)void copy(spreadsheetText(cell.rowId===HEADER_ROW?column.label:row?column.textValue(row):''));}
  function searchChanged(){clearTimeout(searchTimer);searchTimer=setTimeout(()=>{void navigate(href(value=>{value.list={...query,q:search,page:1};}),true);},150);}
  function apply(event:SubmitEvent){event.preventDefault();clearTimeout(searchTimer);const form=event.currentTarget as HTMLFormElement;const params=new URLSearchParams(new FormData(form) as unknown as URLSearchParams);void navigate(`/specs?${params}`);}
  function regionKeys(event:KeyboardEvent){if(event.key!=='F6'||event.ctrlKey||event.metaKey||event.altKey)return;const active=document.activeElement;if(toolbar?.contains(active)){event.preventDefault();table?.focusCurrent();}else if((active as Element)?.closest('[data-table-grid]')){event.preventDefault();searchInput?.focus();}}
  $effect(()=>{const next=page.url.href;if(next!==sourceURL){sourceURL=next;clearTimeout(searchTimer);search=normalizeViewQuery('specs',page.url.searchParams).list?.q??'';}});
  $effect(()=>{const key=listIntent();if(key!==selectionKey){selectionKey=key;untrack(clearSelection);}else{const next=reconcileSelection(rows.map(row=>row.id),untrack(()=>selected),untrack(()=>anchor));if(next.removed){selected=next.selected;anchor=next.anchor;feedback=`${next.removed} selected rows left this page.`;}}});
  $effect(()=>{const key=workspace.shell.project.key;if(mounted){preferences=parseTablePreferences(localStorageValue(tableStorageKey(key,'spec')),specColumns);}});
  function localStorageValue(key:string){try{return localStorage.getItem(key);}catch{return null;}}
  $effect(()=>{const value=preferences,key=workspace.shell.project.key;if(mounted)try{localStorage.setItem(tableStorageKey(key,'spec'),JSON.stringify(value));}catch{/* Ephemeral preferences remain usable. */}});
  onMount(()=>{mounted=true;const media=matchMedia('(pointer:coarse)'),update=()=>coarse=media.matches;update();media.addEventListener('change',update);return ()=>{clearTimeout(searchTimer);media.removeEventListener('change',update);};});
</script>

<svelte:head><title>{workspace.shell.project.name} Specs</title></svelte:head>
<svelte:window onkeydown={regionKeys}/>
<div class="specs-workspace">
  <header class="specs-toolbar" bind:this={toolbar}>
    <div class="toolbar-main">
      <h1>Specs <span>{dashboard.result.totalMatching}</span></h1>
      <label class="search"><span class="sr-only">Search specs by ID, title or summary</span><input bind:this={searchInput} type="search" name="q" form="workspace-filters" bind:value={search} oninput={searchChanged} placeholder="Search specs…" /></label>
      <Popover label="Filters" wide>
        <AnalysisFilters filters={dashboard.filters} route="specs" title="Spec filters" showSearch={false} compact controlledNames={['status','taskScope']} detail="Spec status is independent from the linked-task scope used for progress." resultCount={dashboard.result.totalMatching} resultLabel="matching specs" onApply={apply} onClear={()=>{search='';clearTimeout(searchTimer);}}>
          {#snippet extraField(formId,resetKey)}
            <MultiSelectDropdown name="status" options={statusOptions} selectedValues={query.statuses} form={formId} {resetKey} buttonLabel="Spec status" emptyLabel="All spec statuses" />
            <SelectDropdown name="taskScope" options={scopes} selectedValue={query.taskScope} form={formId} {resetKey} buttonLabel="Progress task scope" emptyLabel="All linked tasks" />
          {/snippet}
        </AnalysisFilters>
      </Popover>
      {#if mounted}<Popover label="Columns"><ColumnsPanel columns={specColumns} rendered={columns} {preferences} onChange={value=>preferences=value}/></Popover><Popover label="Sort"><SortPanel columns={specColumns} sort={query.sort} onChange={sortChange}/></Popover><button type="button" class="density" aria-label={`Density: ${preferences.density}. Switch to ${preferences.density==='compact'?'comfortable':'compact'}`} onclick={()=>preferences={...preferences,density:preferences.density==='compact'?'comfortable':'compact'}}>↕ {preferences.density==='compact'?'32':'40'}</button>{/if}
    </div>
    <div class="toolbar-secondary">
      <span class="progress-scope">{dashboard.progressIsSubset?'Subset progress':'Global progress'} · {query.taskScope==='all'?'All linked tasks':query.taskScope==='archived'?'Archived linked tasks':'Not archived linked tasks'}{#if query.window} · {query.window}{/if}</span>
      {#if query.q}<span class="chip">Search: {query.q}</span>{/if}{#each query.statuses as status}<span class="chip">Spec: {status}</span>{/each}{#each query.specIds as id}<span class="chip">{id}</span>{/each}
      <a class="simple-link" href={href(value=>{value.simple=!simple;})}>{simple?'Enhanced table':'Simple table'}</a>
    </div>
  </header>
  {#if dashboard.filters.unavailableSpecIds.length}<p class="unavailable" role="status">Could not apply spec filters: {dashboard.filters.unavailableSpecIds.join(', ')}. {dashboard.filters.selectedSpecIds.length?'Available spec filters still apply.':'Showing results without a spec filter.'}</p>{/if}
  <DataTable bind:this={table} {rows} {columns} rowKey={row=>row.id} sort={query.sort} {selected} focusedCell={focused} {simple} density={preferences.density} caption="Specs" {sortHref} onSort={(key,secondary)=>sortChange(toggleTableSort(query.sort,key,secondary))} onFocus={cell=>focused=cell} onToggle={toggle} onSelectAll={selectAll} onResize={(key,width)=>preferences=resizeColumn(preferences,specColumns,key,width)} onCopy={copyCell} onEmptyFocus={()=>{searchInput?.focus();feedback='The focused spec is no longer on this page.';}} onViewportWidth={width=>viewport=width}/>
  {#if mounted}<SelectionBar count={selected.size} onCopyRows={copyRows} onCopyIds={()=>void copy(idsToText(rows,row=>row.id,selected))} onClear={clearSelection} {feedback} {fallback}/>{/if}
  <ListPager result={dashboard.result} route="specs" compact/>
</div>
<style>
  .specs-workspace{display:flex;flex-direction:column;min-height:0;height:100%;gap:0}.specs-toolbar{margin:-.75rem -.75rem .5rem;padding:.375rem .75rem;border-bottom:1px solid var(--border-subtle);background:var(--surface);flex-shrink:0}.toolbar-main,.toolbar-secondary{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}.toolbar-main{min-height:2.5rem}h1{font:650 1.125rem/1.3 var(--body-font);margin:0 .25rem 0 0;white-space:nowrap}h1 span{font-size:.8125rem;color:var(--text-muted);font-weight:400;margin-left:.375rem;font-variant-numeric:tabular-nums}.search{flex:1;min-width:10rem;max-width:26rem;margin-right:auto}.search input{width:100%;min-height:2rem;padding:.375rem .625rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text);font: .8125rem var(--body-font)}.density{min-height:2rem;padding:.25rem .5rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text);font-size:.75rem;cursor:pointer}.toolbar-secondary{min-height:2.5rem;font-size:.75rem;color:var(--text-muted)}.progress-scope{color:var(--text)}.chip{padding:.125rem .375rem;border:1px solid var(--border-subtle);border-radius:.25rem;background:var(--surface-raised);color:var(--text)}.simple-link{margin-left:auto;display:inline-flex;min-height:1.5rem;align-items:center;color:var(--text-muted)}.unavailable{margin:0 0 .5rem;font-size:.75rem;color:var(--warning)}@media(max-width:767px){.search{order:2;max-width:none;flex-basis:100%}.specs-toolbar{margin:0 0 .5rem;padding:.375rem}.specs-workspace{height:auto;min-height:calc(100dvh - 8rem)}}@media(pointer:coarse){.search input,.density{min-height:2.75rem}}
</style>
