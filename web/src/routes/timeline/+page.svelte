<script lang="ts">
  import {onMount,tick,untrack} from 'svelte';
  import {goto} from '$app/navigation';
  import type {WorkspaceEnvelope} from '../../../../src/services/workspace.ts';
  import {parseRelationPages,writeRelationPages} from '../../../../src/services/detail-relations.ts';
  import {normalizeViewQuery,serializeViewQuery,type WorkspaceTimelineQuery} from '../../../../src/services/workspace-query.ts';
  import {workspaceURL} from '../../lib/workspace/location.svelte.ts';
  import {useWorkspaceResource} from '../../lib/workspace/resource.svelte.ts';
  import {getInspector} from '../../lib/inspector/controller.svelte.ts';
  import {isPlainActivation,type InspectorOpener} from '../../lib/inspector/history.ts';
  import TimelineToolbar from '../../lib/components/timeline/TimelineToolbar.svelte';
  import TimelineGrid from '../../lib/components/timeline/TimelineGrid.svelte';
  import TimelineTable from '../../lib/components/timeline/TimelineTable.svelte';
  import TimelineDiagnostics from '../../lib/components/timeline/TimelineDiagnostics.svelte';
  import TimelineTrace from '../../lib/components/timeline/TimelineTrace.svelte';
  import {parseTimelineDensity,type Density} from '../../lib/components/timeline/model.ts';
  let {data}=$props();
  const inspector=getInspector(),resource=useWorkspaceResource(()=>data.workspace as WorkspaceEnvelope<'timeline'>);
  const workspace=$derived(resource.snapshot),dashboard=$derived(workspace.data),timeline=$derived(dashboard.timeline);
  const view=$derived(normalizeViewQuery('timeline',workspaceURL().searchParams)),query=$derived(view.timeline!);
  let mounted=$state(false),density=$state<Density>('compact'),logicalIds=$state.raw<string[]>([]),grid=$state<TimelineGrid>(),root:HTMLDivElement;
  const simple=$derived(!mounted||view.simple||timeline.unitsState==='unavailable');
  const ids=$derived(simple?[...new Set(dashboard.fallbackPage.rows.map(row=>row.task.taskId))]:logicalIds);
  let activeId:string|undefined;
  $effect(()=>{const key=workspace.shell.project.key;if(mounted)untrack(()=>{try{density=parseTimelineDensity(localStorage.getItem(`spm-timeline-v1:${key}`));}catch{density='compact';}});});
  $effect(()=>{const key=workspace.shell.project.key,value=density;if(mounted)try{localStorage.setItem(`spm-timeline-v1:${key}`,JSON.stringify({version:1,density:value}));}catch{/* Keep the preference usable in memory. */}});
  function href(update:(query:WorkspaceTimelineQuery,view:ReturnType<typeof normalizeViewQuery>)=>void){const source=workspaceURL(),current=normalizeViewQuery('timeline',source.searchParams),identity=current.inspect?`${current.inspect.kind}:${current.inspect.id}`:undefined;update(current.timeline!,current);const params=serializeViewQuery(current);if(current.inspect&&`${current.inspect.kind}:${current.inspect.id}`===identity)writeRelationPages(params,current.inspect.kind,parseRelationPages(current.inspect.kind,source.searchParams));return `/timeline?${params}`;}
  function navigate(event:MouseEvent){if(!isPlainActivation(event))return;event.preventDefault();void goto((event.currentTarget as HTMLAnchorElement).href,{keepFocus:true,noScroll:true});}
  function resetRelated(value:WorkspaceTimelineQuery){value.relatedDirectPage=1;value.relatedTransitivePage=1;}
  function traceHref(id:string){return href(value=>{value.selectedTaskId=timeline.selection?.taskId===id?undefined:id;resetRelated(value);});}
  function modeHref(mode:'active'|'all'){return href(value=>{value.mode=mode;value.page=1;resetRelated(value);});}
  function pageHref(page:number){return href((value,view)=>{value.page=page;view.simple=true;});}
  function sizeHref(size:number){return href((value,view)=>{value.pageSize=size as 50|100|200;value.page=1;view.simple=true;});}
  function tablePane(){return root?.querySelector<HTMLElement>('.table-scroll');}
  function frame(){return document.querySelector<HTMLElement>('.view-frame');}
  function toolbar(){return root?.querySelector<HTMLElement>('.timeline-toolbar');}
  function tableAnchor(id:string){return root?.querySelector<HTMLAnchorElement>(`.table-scroll [data-task-id="${CSS.escape(id)}"] .task-id`);}
  function focusToolbar(){toolbar()?.focus({preventScroll:true});}
  function capture(id:string,columnKey:string):InspectorOpener {const position=simple?{top:tablePane()?.scrollTop??0,left:tablePane()?.scrollLeft??0}:grid?.scrollPosition()??{top:0,left:0};activeId=id;return {rowId:id,columnKey,rowIndex:ids.indexOf(id),listKey:workspace.requestKey,tableScroll:position,viewScroll:{top:frame()?.scrollTop??0,left:frame()?.scrollLeft??0}};}
  async function focusTask(id:string|undefined){if(!id)return false;if(!simple)return grid?.focusTask(id)??false;const anchor=tableAnchor(id);anchor?.focus({preventScroll:true});return !!anchor;}
  async function focusGroup(id:string){if(!simple)return grid?.focusGroup(id)??false;const node=root?.querySelector<HTMLAnchorElement>(`.table-scroll a[href="/specs/${CSS.escape(id)}"]`);node?.focus({preventScroll:true});return !!node;}
  async function restore(opener:InspectorOpener|undefined){
    await tick();if(opener?.listKey===workspace.requestKey){if(simple){const pane=tablePane();if(pane){pane.scrollTop=opener.tableScroll.top;pane.scrollLeft=opener.tableScroll.left;}}else grid?.restoreScroll(opener.tableScroll);const outer=frame();if(outer){outer.scrollTop=opener.viewScroll.top;outer.scrollLeft=opener.viewScroll.left;}}
    if(opener?.columnKey==='group'&&await focusGroup(opener.rowId))return;
    if(opener&&opener.columnKey!=='group'&&await focusTask(opener.rowId))return;
    const nearest=ids[Math.min(Math.max(opener?.rowIndex??0,0),ids.length-1)];if(await focusTask(nearest)){inspector.announce(opener?.columnKey==='group'?'The inspected group is no longer visible. Focus moved to the first available timeline task.':'The inspected row is no longer visible. Focus moved to the nearest timeline task.');return;}focusToolbar();inspector.announce('No timeline tasks remain in this view. Focus returned to the toolbar.');
  }
  function regionFor(element:Element|null):'toolbar'|'grid'|undefined {if(toolbar()?.contains(element))return 'toolbar';if(element?.closest('.timeline-grid,.table-scroll')){const id=element.closest<HTMLElement>('[data-task-id]')?.dataset.taskId;if(id)activeId=id;return 'grid';}}
  function regionKeys(event:KeyboardEvent){if(inspector.identity||event.key!=='F6'||event.ctrlKey||event.metaKey||event.altKey)return;if(regionFor(document.activeElement)==='toolbar'){event.preventDefault();void focusTask(activeId??ids[0]);}else if(regionFor(document.activeElement)==='grid'){event.preventDefault();focusToolbar();}}
  onMount(()=>{mounted=true;return inspector.registerList({kind:'task',get navigationScope():'page'|'expanded'{return simple?'page':'expanded';},ids:()=>ids,capture,restore:opener=>void restore(opener),focusToolbar,focusGrid:()=>void focusTask(activeId??ids[0]),regionFor});});
</script>
<svelte:head><title>{workspace.shell.project.name} Timeline</title></svelte:head>
<svelte:window onkeydown={regionKeys}/>
<div class="timeline-workspace" class:enhanced={mounted} bind:this={root}>
  <TimelineToolbar count={timeline.taskCount} filters={dashboard.filters} {query} simple={view.simple} {mounted} {density} {modeHref} viewHref={simple=>href((value,view)=>view.simple=simple)} onDensity={()=>density=density==='compact'?'comfortable':'compact'}/>
  <TimelineDiagnostics diagnostics={timeline.diagnostics}/>
  {#if timeline.selection&&dashboard.relatedSpecPages}<TimelineTrace selection={timeline.selection} pages={dashboard.relatedSpecPages} clearHref={href(value=>{value.selectedTaskId=undefined;resetRelated(value);})} pageHref={(kind,page)=>href(value=>{if(kind==='direct')value.relatedDirectPage=page;else value.relatedTransitivePage=page;})} onNavigate={navigate}/>{/if}
  {#if query.selectedTaskId&&!timeline.selection}<p class="placement-warning" role="status">Trace unavailable in current results · {query.selectedTaskId} <a href={href(value=>{value.selectedTaskId=undefined;resetRelated(value);})}>Clear trace</a></p>{/if}
  {#if timeline.unitsState==='unavailable'}<p class="placement-warning" role="status">Relative placement unavailable. Finite values remain available in the table.</p>{/if}
  {#if simple}<TimelineTable result={dashboard.fallbackPage} {traceHref} {pageHref} {sizeHref} onInspect={(event,id)=>inspector.activate(event,{kind:'task',id})} onNavigate={navigate}/>
  {:else}<TimelineGrid bind:this={grid} {timeline} {density} projectKey={workspace.shell.project.key} {traceHref} onLogicalIds={value=>logicalIds=value} onInspect={(event,id)=>inspector.activate(event,{kind:'task',id})} onSpecInspect={(event,id)=>inspector.activate(event,{kind:'spec',id},'group')} onNavigate={navigate}/>{/if}
</div>
<style>.timeline-workspace{display:flex;flex-direction:column;height:auto;min-height:0}.timeline-workspace.enhanced{height:100%;min-height:0}.placement-warning{color:var(--warning);font-size:.75rem;margin:0 0 .5rem;flex-shrink:0}@media(max-width:767px){.timeline-workspace{min-height:calc(100dvh - 8rem)}.timeline-workspace.enhanced{min-height:0}}</style>
