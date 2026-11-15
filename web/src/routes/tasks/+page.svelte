<script lang="ts">
  import {onMount,untrack} from 'svelte';
  import {page} from '$app/state';
  import {goto} from '$app/navigation';
  import type {WorkspaceEnvelope,WorkspaceTaskRow} from '../../../../src/services/workspace.ts';
  import {normalizeViewQuery,serializeViewQuery,type TaskSortKey,type WorkspaceTaskQuery} from '../../../../src/services/workspace-query.ts';
  import {TASK_STATUSES} from '../../../../src/domain.ts';
  import {useWorkspaceResource} from '../../lib/workspace/resource.svelte.ts';
  import AnalysisFilters from '../../lib/components/AnalysisFilters.svelte';
  import MultiSelectDropdown from '../../lib/components/MultiSelectDropdown.svelte';
  import SelectDropdown from '../../lib/components/SelectDropdown.svelte';
  import Popover from '../../lib/components/Popover.svelte';
  import ListPager from '../../lib/components/ListPager.svelte';
  import TaskBoard from '../../lib/components/TaskBoard.svelte';
  import DataTable from '../../lib/components/data-table/DataTable.svelte';
  import ColumnsPanel from '../../lib/components/data-table/ColumnsPanel.svelte';
  import SortPanel from '../../lib/components/data-table/SortPanel.svelte';
  import SelectionBar from '../../lib/components/data-table/SelectionBar.svelte';
  import {taskColumns} from '../../lib/components/data-table/task-columns.ts';
  import {defaultTablePreferences,parseTablePreferences,renderedColumns,resizeColumn,tableStorageKey} from '../../lib/components/data-table/preferences.ts';
  import {defaultFocus,reconcileSelection,toggleRowSelection,toggleTableSort} from '../../lib/components/data-table/model.ts';
  import {idsToText,rowsToTsv,spreadsheetText} from '../../lib/components/data-table/clipboard.ts';
  import {HEADER_ROW,type FocusedCell,type TableSort} from '../../lib/components/data-table/types.ts';
  let {data}=$props();
  const resource=useWorkspaceResource(()=>data.workspace as WorkspaceEnvelope<'tasks'>);
  const workspace=$derived(resource.snapshot),dashboard=$derived(workspace.data),rows=$derived(dashboard.result.rows);
  const query=$derived(dashboard.result.normalizedQuery as WorkspaceTaskQuery);
  const view=$derived(dashboard.view),simple=$derived(normalizeViewQuery('tasks',page.url.searchParams).simple);
  let mounted=$state(false),coarse=$state(false),viewport=$state(0),preferences=$state(defaultTablePreferences(taskColumns));
  const columns=$derived(renderedColumns(preferences,taskColumns,viewport).map(column=>column.key==='select'&&coarse?{...column,width:44}:column));
  let selected=$state(new Set<string>()),anchor=$state<string|undefined>(),focused=$state<FocusedCell>(untrack(()=>defaultFocus(rows.map(row=>row.id),columns.map(column=>column.key))));
  let feedback=$state(''),fallback=$state<string|undefined>(),search=$state(untrack(()=>query.q)),table=$state<DataTable<WorkspaceTaskRow>>(),toolbar:HTMLElement,searchInput:HTMLInputElement;
  let searchTimer:ReturnType<typeof setTimeout>|undefined;
  let sourceURL=untrack(()=>page.url.href),selectionKey=untrack(()=>listIntent());
  const statusOptions=TASK_STATUSES.map(value=>({value,label:value.replaceAll('_',' ')}));
  const scopes=[{value:'unarchived',label:'Not archived'},{value:'all',label:'All tasks'},{value:'archived',label:'Archived'}];
  const presetLabels:Record<string,string>={unarchived:'Not archived',all:'All',archived:'Archived',in_progress:'In progress',review:'Review',blocked:'Blocked',custom:'Custom'};
  const preset=$derived(query.statuses.length===0?query.scope:query.scope==='unarchived'&&query.statuses.length===1&&['in_progress','review','blocked'].includes(query.statuses[0]!)?query.statuses[0]:'custom');
  function listIntent(){const value=normalizeViewQuery('tasks',page.url.searchParams);return JSON.stringify([value.view,value.list]);}
  function href(update:(value:ReturnType<typeof normalizeViewQuery>)=>void){const value=normalizeViewQuery('tasks',page.url.searchParams);value.list={...query};update(value);return `/tasks?${serializeViewQuery(value)}`;}
  function navigate(url:string,replaceState=false){return goto(url,{replaceState,keepFocus:true,noScroll:true});}
  function sortChange(sort:TableSort[]){void navigate(href(value=>{value.list={...query,page:1,sort:sort.map(item=>({...item,key:item.key as TaskSortKey}))};}));}
  function sortHref(key:string){return href(value=>{value.list={...query,page:1,sort:toggleTableSort(query.sort,key).map(item=>({...item,key:item.key as TaskSortKey}))};});}
  function toggle(id:string,range:boolean){const next=toggleRowSelection(rows.map(row=>row.id),selected,anchor,id,range);selected=next.selected;anchor=next.anchor;}
  function selectAll(){selected=rows.length&&rows.every(row=>selected.has(row.id))?new Set():new Set(rows.map(row=>row.id));anchor=rows[0]?.id;}
  function clearSelection(){selected=new Set();anchor=undefined;fallback=undefined;feedback='Selection cleared.';}
  async function copy(text:string|undefined){if(text===undefined){feedback='Select rows to copy.';return;}fallback=undefined;try{await navigator.clipboard.writeText(text);feedback='Copied to clipboard.';}catch{fallback=text;feedback='Clipboard unavailable. Copy the text in the labeled field.';}}
  function copyRows(){void copy(rowsToTsv(rows,columns,row=>row.id,selected));}
  function copyCell(cell:FocusedCell){if(selected.size){copyRows();return;}const column=columns.find(column=>column.key===cell.columnKey),row=rows.find(row=>row.id===cell.rowId);if(column&&column.copyable!==false)void copy(spreadsheetText(cell.rowId===HEADER_ROW?column.label:row?column.textValue(row):''));}
  function searchChanged(){clearTimeout(searchTimer);searchTimer=setTimeout(()=>{void navigate(href(value=>{value.list={...query,q:search,page:1};}),true);},150);}
  function setPreset(value:string){if(value==='custom')return;void navigate(href(next=>{const scoped=['all','archived','unarchived'].includes(value);next.list={...query,page:1,scope:scoped?value as WorkspaceTaskQuery['scope']:'unarchived',statuses:scoped?[]:[value as WorkspaceTaskQuery['statuses'][number]]};if(['all','archived'].includes(value))next.view='table';}));}
  function apply(event:SubmitEvent){event.preventDefault();clearTimeout(searchTimer);const form=event.currentTarget as HTMLFormElement;const params=new URLSearchParams(new FormData(form) as unknown as URLSearchParams);void navigate(`/tasks?${params}`);}
  function regionKeys(event:KeyboardEvent){if(event.key!=='F6'||event.ctrlKey||event.metaKey||event.altKey)return;const active=document.activeElement;if(toolbar?.contains(active)){event.preventDefault();table?.focusCurrent();}else if((active as Element)?.closest('[data-table-grid]')){event.preventDefault();searchInput?.focus();}}
  $effect(()=>{const next=page.url.href;if(next!==sourceURL){sourceURL=next;clearTimeout(searchTimer);search=normalizeViewQuery('tasks',page.url.searchParams).list?.q??'';}});
  $effect(()=>{const key=listIntent();if(key!==selectionKey){selectionKey=key;untrack(clearSelection);}else{const next=reconcileSelection(rows.map(row=>row.id),untrack(()=>selected),untrack(()=>anchor));if(next.removed){selected=next.selected;anchor=next.anchor;feedback=`${next.removed} selected rows left this page.`;}}});
  $effect(()=>{const key=workspace.shell.project.key;if(mounted){preferences=parseTablePreferences(localStorageValue(tableStorageKey(key,'task')),taskColumns);}});
  function localStorageValue(key:string){try{return localStorage.getItem(key);}catch{return null;}}
  $effect(()=>{const value=preferences,key=workspace.shell.project.key;if(mounted)try{localStorage.setItem(tableStorageKey(key,'task'),JSON.stringify(value));}catch{/* Ephemeral preferences remain usable. */}});
  onMount(()=>{mounted=true;const media=matchMedia('(pointer:coarse)'),update=()=>coarse=media.matches;update();media.addEventListener('change',update);return ()=>{clearTimeout(searchTimer);media.removeEventListener('change',update);};});
</script>
<svelte:head><title>{workspace.shell.project.name} Tasks</title></svelte:head>
<svelte:window onkeydown={regionKeys}/>
<div class="tasks-workspace">
  <header class="tasks-toolbar" bind:this={toolbar}>
    <div class="toolbar-main">
      <h1>Tasks <span>{dashboard.result.totalMatching}</span></h1>
      <nav class="view-switch" aria-label="Task view"><a aria-current={view==='table'?'page':undefined} href={href(value=>{value.view='table';})}>Table</a><a aria-current={view==='board'?'page':undefined} href={href(value=>{value.view='board';value.simple=false;value.list={...query,page:1,scope:'unarchived'};})}>Board</a></nav>
      <label class="search"><span class="sr-only">Search tasks by ID, title or summary</span><input bind:this={searchInput} type="search" name="q" form="workspace-filters" bind:value={search} oninput={searchChanged} placeholder="Search tasks…" /></label>
      <Popover label="Filters" wide>
        <AnalysisFilters filters={dashboard.filters} route="tasks" title="Task filters" showSearch={false} compact controlledNames={['status','scope','priority']} detail="Filters apply across every page. Status uses effective task status." resultCount={dashboard.result.totalMatching} onApply={apply} onClear={()=>{search='';clearTimeout(searchTimer);}}>
          {#snippet extraField(formId,resetKey)}
            <MultiSelectDropdown name="status" options={statusOptions} selectedValues={query.statuses} form={formId} {resetKey} buttonLabel="Status" emptyLabel="All statuses" />
            <SelectDropdown name="scope" options={view==='board'?scopes.slice(0,1):scopes} selectedValue={query.scope} form={formId} {resetKey} buttonLabel="Archive scope" />
            <label class="priority">Priority (comma separated){#key resetKey}<input name="priority" form={formId} value={query.priorities.join(', ')} placeholder="Any finite number" />{/key}</label>
          {/snippet}
        </AnalysisFilters>
      </Popover>
      {#if mounted&&view==='table'}<Popover label="Columns"><ColumnsPanel columns={taskColumns} rendered={columns} {preferences} onChange={value=>preferences=value}/></Popover><Popover label="Sort"><SortPanel columns={taskColumns} sort={query.sort} onChange={sortChange}/></Popover><button type="button" class="density" aria-label={`Density: ${preferences.density}. Switch to ${preferences.density==='compact'?'comfortable':'compact'}`} onclick={()=>preferences={...preferences,density:preferences.density==='compact'?'comfortable':'compact'}}>↕ {preferences.density==='compact'?'32':'40'}</button>{/if}
    </div>
    <div class="toolbar-secondary">{#if mounted}<label class="preset">View preset<select aria-label="View preset" value={preset} onchange={event=>setPreset(event.currentTarget.value)}><option value="unarchived">Not archived</option><option value="in_progress">In progress</option><option value="review">Review</option><option value="blocked">Blocked</option><option value="all">All{view==='board'?' · Table':''}</option><option value="archived">Archived{view==='board'?' · Table':''}</option>{#if preset==='custom'}<option value="custom">Custom</option>{/if}</select></label>{:else}<span class="preset">View preset: <strong>{presetLabels[preset]??'Custom'}</strong></span>{/if}{#if preset==='custom'}<span class="scope">{query.scope==='unarchived'?'Not archived':query.scope==='archived'?'Archived':'All tasks'}</span>{/if}{#if query.q}<span class="chip">Search: {query.q}</span>{/if}{#each query.statuses as status}<span class="chip">{status.replaceAll('_',' ')}</span>{/each}{#each query.specIds as id}<span class="chip">{id}</span>{/each}{#each query.priorities as priority}<span class="chip">Priority {priority}</span>{/each}{#if query.window}<span class="chip">{query.window}</span>{/if}<a class="simple-link" href={href(value=>{value.simple=!simple;value.view='table';})}>{simple?'Enhanced table':'Simple table'}</a></div>
  </header>
  {#if dashboard.filters.unavailableSpecIds.length}<p class="unavailable" role="status">Could not apply spec filters: {dashboard.filters.unavailableSpecIds.join(', ')}. {dashboard.filters.selectedSpecIds.length?'Available spec filters still apply.':'Showing results without a spec filter.'}</p>{/if}
  {#if view==='table'}
    <DataTable bind:this={table} {rows} {columns} rowKey={row=>row.id} sort={query.sort} {selected} focusedCell={focused} {simple} density={preferences.density} caption="Tasks" {sortHref} onSort={(key,secondary)=>sortChange(toggleTableSort(query.sort,key,secondary))} onFocus={cell=>focused=cell} onToggle={toggle} onSelectAll={selectAll} onResize={(key,width)=>preferences=resizeColumn(preferences,taskColumns,key,width)} onCopy={copyCell} onEmptyFocus={()=>{searchInput?.focus();feedback='The focused task is no longer on this page.';}} onViewportWidth={width=>viewport=width}/>
    {#if mounted}<SelectionBar count={selected.size} onCopyRows={copyRows} onCopyIds={()=>void copy(idsToText(rows,row=>row.id,selected))} onClear={clearSelection} {feedback} {fallback}/>{/if}
    <ListPager result={dashboard.result} route="tasks" compact/>
  {:else}<p class="board-note">Board shows unarchived tasks. Lane counts reflect this page.</p><ListPager result={dashboard.result} route="tasks"/><TaskBoard {rows}/>{/if}
</div>
<style>
  .tasks-workspace{display:flex;flex-direction:column;min-height:0;height:100%;gap:0}.tasks-toolbar{margin:-.75rem -.75rem .5rem;padding:.375rem .75rem;border-bottom:1px solid var(--border-subtle);background:var(--surface);flex-shrink:0}.toolbar-main,.toolbar-secondary{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}.toolbar-main{min-height:2.5rem}h1{font:650 1.125rem/1.3 var(--body-font);margin:0 .25rem 0 0;white-space:nowrap}h1 span{font-size:.8125rem;color:var(--text-muted);font-weight:400;margin-left:.375rem;font-variant-numeric:tabular-nums}.view-switch{display:flex;border:1px solid var(--border-control);border-radius:.25rem;overflow:hidden}.view-switch a{font-size:.75rem;padding:.375rem .5rem;min-height:2rem;text-decoration:none;color:var(--text-muted);display:flex;align-items:center}.view-switch a[aria-current]{background:var(--selection-bg);color:var(--accent)}.search{flex:1;min-width:10rem;max-width:26rem;margin-right:auto}.search input{width:100%;min-height:2rem;padding:.375rem .625rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text);font: .8125rem var(--body-font)}.density,select,.priority input{min-height:2rem;padding:.25rem .5rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text);font-size:.75rem}.density{cursor:pointer}.toolbar-secondary{min-height:2.5rem;font-size:.75rem;color:var(--text-muted)}.preset{display:flex;align-items:center;gap:.375rem}.preset select{min-height:1.75rem}.chip{padding:.125rem .375rem;border:1px solid var(--border-subtle);border-radius:.25rem;background:var(--surface-raised);color:var(--text)}.scope{margin-right:.25rem}.simple-link{margin-left:auto;display:inline-flex;min-height:1.5rem;align-items:center;color:var(--text-muted)}.priority{display:grid;font-size:.75rem;gap:.25rem;color:var(--text-muted)}.unavailable{margin:0 0 .5rem;font-size:.75rem;color:var(--warning)}.board-note{font-size:.75rem;color:var(--text-muted);margin:0}.tasks-workspace:has(.board-note){height:auto}@media(max-width:767px){.search{order:2;max-width:none;flex-basis:100%}.tasks-toolbar{margin:0 0 .5rem;padding:.375rem}.tasks-workspace{height:auto;min-height:calc(100dvh - 8rem)}}@media(pointer:coarse){.search input,.view-switch a,.density,select{min-height:2.75rem}}
</style>
