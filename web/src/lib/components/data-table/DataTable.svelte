<script lang="ts" generics="Row">
  import { onMount, tick, untrack } from 'svelte';
  import { HEADER_ROW,type FocusedCell,type RenderedColumn,type TableSort } from './types.ts';
  import { moveGridFocus,reconcileFocus } from './model.ts';
  let {rows,columns,rowKey,sort,selected,focusedCell,simple=false,density='compact',caption='Read-only records',sortHref,onSort,onFocus,onToggle,onSelectAll,onResize,onCopy,onInspect,onEmptyFocus,onViewportWidth}: {
    rows:Row[];columns:RenderedColumn<Row>[];rowKey:(row:Row)=>string;sort:TableSort[];
    selected:ReadonlySet<string>;focusedCell:FocusedCell;simple?:boolean;density?:'compact'|'comfortable';caption?:string;
    sortHref:(key:string)=>string;onSort:(key:string,secondary:boolean)=>void;onFocus:(cell:FocusedCell)=>void;
    onToggle:(id:string,range:boolean)=>void;onSelectAll:()=>void;onResize:(key:string,width:number)=>void;
    onCopy:(cell:FocusedCell)=>void;onInspect?:(row:Row,event:MouseEvent)=>void;onEmptyFocus:()=>void;onViewportWidth:(width:number)=>void;
  }=$props();
  let mounted=$state(false),port:HTMLDivElement,table:HTMLTableElement;
  const enhanced=$derived(mounted&&!simple);
  const ids=$derived(rows.map(rowKey)),keys=$derived(columns.map(column=>column.key));
  const width=$derived(columns.reduce((sum,column)=>sum+column.width,0));
  const all=$derived(rows.length>0&&rows.every(row=>selected.has(rowKey(row))));
  const mixed=$derived(!all&&rows.some(row=>selected.has(rowKey(row))));
  let viewport=$state(0),previousIds=untrack(()=>rows.map(rowKey)),previousKeys=untrack(()=>columns.map(column=>column.key));
  function tab(rowId:string,key:string){return enhanced?(focusedCell.rowId===rowId&&focusedCell.columnKey===key?0:-1):undefined;}
  function target(cell:FocusedCell){return Array.from(table?.querySelectorAll<HTMLElement>('[data-grid-target]')??[]).find(node=>node.dataset.rowKey===cell.rowId&&node.dataset.columnKey===cell.columnKey);}
  function reveal(node:HTMLElement){
    const box=port.getBoundingClientRect(),rect=node.getBoundingClientRect(),header=table.tHead?.getBoundingClientRect().height??32;
    if(rect.top<box.top+header)port.scrollTop-=box.top+header-rect.top;else if(rect.bottom>box.bottom)port.scrollTop+=rect.bottom-box.bottom;
    const fixed=columns.filter(column=>column.key==='select'||column.key==='id'||column.key==='title'&&stickyTitle()).reduce((sum,column)=>sum+column.width,0);
    const cell=node.closest<HTMLElement>('[data-column]');
    if(cell?.dataset.sticky!=='true'){if(rect.left<box.left+fixed)port.scrollLeft-=box.left+fixed-rect.left;else if(rect.right>box.right)port.scrollLeft+=rect.right-box.right;}
  }
  function focusDOM(cell:FocusedCell){const node=target(cell);if(node){node.focus({preventScroll:true});reveal(node);}}
  export function focusCurrent(){focusDOM(focusedCell);}
  function stickyTitle(){return columns.filter(column=>['select','id','title'].includes(column.key)).reduce((sum,column)=>sum+column.width,0)<=viewport*.45;}
  function sticky(column:RenderedColumn<Row>){return column.key==='select'||column.key==='id'||column.key==='title'&&stickyTitle();}
  function left(column:RenderedColumn<Row>){return columns.slice(0,columns.findIndex(item=>item.key===column.key)).reduce((sum,item)=>sum+item.width,0);}
  function focusEvent(event:FocusEvent){if(!enhanced)return;const node=(event.target as Element)?.closest<HTMLElement>('[data-grid-target]');if(node)onFocus({rowId:node.dataset.rowKey!,columnKey:node.dataset.columnKey!});}
  function keydown(event:KeyboardEvent){
    if(!enhanced||event.defaultPrevented||event.isComposing||event.altKey)return;
    const node=(event.target as Element)?.closest<HTMLElement>('[data-grid-target]');if(!node)return;
    const cell={rowId:node.dataset.rowKey!,columnKey:node.dataset.columnKey!};
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='c'){
      const input=event.target as HTMLInputElement;if(window.getSelection()?.toString()||input.isContentEditable||input.tagName==='TEXTAREA'||input.tagName==='INPUT'&&!['checkbox','radio'].includes(input.type))return;
      event.preventDefault();onCopy(cell);return;
    }
    if(event.metaKey||event.ctrlKey&&!['Home','End'].includes(event.key))return;
    if(event.key==='Enter'&&cell.columnKey==='select'){event.preventDefault();if(cell.rowId===HEADER_ROW)onSelectAll();else onToggle(cell.rowId,false);return;}
    if(event.key===' '&&event.shiftKey&&cell.columnKey==='select'&&cell.rowId!==HEADER_ROW){event.preventDefault();onToggle(cell.rowId,true);return;}
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(event.key))return;
    event.preventDefault();const rowHeight=table.tBodies[0]?.rows[0]?.getBoundingClientRect().height??32;
    const next=moveGridFocus(cell,ids,keys,event.key,event.ctrlKey,Math.floor((port.clientHeight-(table.tHead?.getBoundingClientRect().height??32))/rowHeight));
    onFocus(next);focusDOM(next);
  }
  function click(event:MouseEvent){if(!enhanced||window.getSelection()?.toString())return;const node=(event.target as Element).closest<HTMLElement>('[data-grid-target]');if(node&&!node.matches('a,button,input')){const cell={rowId:node.dataset.rowKey!,columnKey:node.dataset.columnKey!};onFocus(cell);focusDOM(cell);}}
  function events(node:HTMLTableElement){node.addEventListener('keydown',keydown);node.addEventListener('focusin',focusEvent);node.addEventListener('click',click);return {destroy(){node.removeEventListener('keydown',keydown);node.removeEventListener('focusin',focusEvent);node.removeEventListener('click',click);}};}
  let drag:{key:string;x:number;width:number}|undefined;
  function resizeStart(event:PointerEvent,column:RenderedColumn<Row>){event.preventDefault();drag={key:column.key,x:event.clientX,width:column.width};(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);}
  function resizeMove(event:PointerEvent){if(drag)onResize(drag.key,drag.width+event.clientX-drag.x);}
  function resizeEnd(){drag=undefined;}
  $effect.pre(()=>{
    const nextIds=ids,nextKeys=keys,current=focusedCell;
    untrack(()=>{if(JSON.stringify([nextIds,nextKeys])===JSON.stringify([previousIds,previousKeys]))return;
      const active=table?.contains(document.activeElement),next=reconcileFocus(current,previousIds,nextIds,previousKeys,nextKeys);previousIds=[...nextIds];previousKeys=[...nextKeys];onFocus(next.cell);
      if(active)void tick().then(()=>{if(next.empty)onEmptyFocus();else focusDOM(next.cell);});
    });
  });
  onMount(()=>{mounted=true;const measure=()=>{viewport=port.clientWidth;onViewportWidth(viewport);};measure();const observer=new ResizeObserver(measure);observer.observe(port);return ()=>observer.disconnect();});
</script>
<div class="table-scroll" bind:this={port} data-table-grid>
  <table bind:this={table} use:events role={enhanced?'grid':undefined} aria-label={caption} aria-rowcount={enhanced?rows.length+1:undefined} aria-colcount={enhanced?columns.length:undefined} class:comfortable={density==='comfortable'} style:width={`${width}px`}>
    <caption class="sr-only">{caption}. Read-only.{#if enhanced} Navigation within this page: arrows move cells, Home/End move to row ends, Ctrl+Home/End move to page bounds, Tab leaves the grid.{/if}</caption>
    <colgroup>{#each columns as column (column.key)}<col style:width={`${column.width}px`} />{/each}</colgroup>
    <thead><tr role={enhanced?'row':undefined} aria-rowindex={enhanced?1:undefined}>
      {#each columns as column,index (column.key)}
        {@const rank=sort.findIndex(item=>item.key===column.sortKey)}
        <th scope="col" role={enhanced?'columnheader':undefined} aria-sort={rank===0?(sort[0]?.direction==='asc'?'ascending':'descending'):undefined} aria-colindex={enhanced?index+1:undefined} data-grid-target={column.kind!=='selection'&&!column.sortKey?true:undefined} data-row-key={HEADER_ROW} data-column-key={column.key} tabindex={column.kind!=='selection'&&!column.sortKey?tab(HEADER_ROW,column.key):undefined} data-column={column.key} data-sticky={sticky(column)} class:sticky={sticky(column)} style:left={sticky(column)?`${left(column)}px`:undefined} class:numeric={column.align==='right'}>
          {#if column.kind==='selection'}
            {#if mounted}<input type="checkbox" aria-label={`Select all ${rows.length} rows on this page`} checked={all} indeterminate={mixed} aria-checked={mixed?'mixed':all} data-grid-target data-row-key={HEADER_ROW} data-column-key={column.key} tabindex={tab(HEADER_ROW,column.key)} onclick={onSelectAll} />{:else}<span class="sr-only">Row selection requires JavaScript</span>{/if}
          {:else if column.sortKey}
            {#if mounted}<button class="sort-control" type="button" data-grid-target data-row-key={HEADER_ROW} data-column-key={column.key} tabindex={tab(HEADER_ROW,column.key)} onclick={event=>onSort(column.sortKey!,event.shiftKey)} aria-label={`Sort by ${column.label}${rank>=0?`, ${rank===0?'primary':'secondary'} ${sort[rank]?.direction==='asc'?'ascending':'descending'}`:''}`}><span>{column.headerLabel??column.label}</span>{#if rank>=0}<span class="sort-rank" aria-hidden="true">{rank+1}{sort[rank]?.direction==='asc'?'↑':'↓'}</span>{/if}</button>
            {:else}<a class="sort-control" href={sortHref(column.sortKey)}>{column.headerLabel??column.label}{rank>=0?` ${rank+1}${sort[rank]?.direction==='asc'?'↑':'↓'}`:''}</a>{/if}
            {#if mounted&&column.maxWidth>column.minWidth}<span class="resize-handle" role="separator" aria-orientation="vertical" aria-label={`Resize ${column.label}; numeric controls in Columns`} aria-valuemin={column.minWidth} aria-valuemax={column.maxWidth} aria-valuenow={column.width} tabindex="-1" onpointerdown={event=>resizeStart(event,column)} onpointermove={resizeMove} onpointerup={resizeEnd} onpointercancel={resizeEnd}></span>{/if}
          {:else}<span>{column.label}</span>{/if}
        </th>
      {/each}
    </tr></thead>
    <tbody>
      {#each rows as row,rowIndex (rowKey(row))}
        {@const id=rowKey(row)}
        <tr role={enhanced?'row':undefined} aria-rowindex={enhanced?rowIndex+2:undefined} aria-selected={enhanced?selected.has(id):undefined} class:selected={selected.has(id)} data-entity-id={id}>
          {#each columns as column,index (column.key)}
            <td role={enhanced?'gridcell':undefined} aria-colindex={enhanced?index+1:undefined} class:sticky={sticky(column)} data-column={column.key} data-sticky={sticky(column)} style:left={sticky(column)?`${left(column)}px`:undefined} class:numeric={column.align==='right'} class:mono={column.mono} data-grid-target={column.kind==='selection'||column.kind==='identity'?undefined:true} data-row-key={id} data-column-key={column.key} tabindex={column.kind==='selection'||column.kind==='identity'?undefined:tab(id,column.key)} title={column.kind==='selection'?undefined:column.textValue(row)}>
              {#if column.kind==='selection'}
                {#if mounted}<input type="checkbox" aria-label={`Select ${id}`} checked={selected.has(id)} data-grid-target data-row-key={id} data-column-key={column.key} tabindex={tab(id,column.key)} onclick={event=>onToggle(id,event.shiftKey)} />{/if}
              {:else if column.kind==='identity'}
                <a class="identity" href={column.href?.(row)} data-grid-target data-row-key={id} data-column-key={column.key} tabindex={tab(id,column.key)} onclick={event=>{if(onInspect&&event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onInspect(row,event);}}}>{#if column.cell}{@render column.cell(row)}{:else}{column.textValue(row)}{/if}</a>
              {:else}
                <span class={`cell-value tone-${column.tone?.(row)??'neutral'}`}>{#if column.symbol}<span aria-hidden="true">{column.symbol(row)}</span>{/if}{#if column.cell}{@render column.cell(row)}{:else}<span class="value-text">{column.textValue(row)}</span>{/if}</span>
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
{#if !rows.length}<p class="empty-table">No matching records. Change or clear the filters.</p>{/if}
<style>
  .table-scroll { min-height:0;flex:1;overflow:auto;position:relative;border:1px solid var(--border-subtle);background:var(--surface);scrollbar-gutter:stable;overflow-anchor:none; }
  table { border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:.8125rem;line-height:1.538;color:var(--text); }
  th,td { box-sizing:border-box;min-width:0;height:2rem;padding:0 .5rem;border-right:1px solid var(--border-subtle);border-bottom:1px solid var(--border-subtle);vertical-align:middle;text-align:left;overflow:hidden;white-space:nowrap;text-overflow:ellipsis; }
  th { position:sticky;top:0;z-index:4;background:var(--surface-raised);font-size:.75rem;font-weight:600; }
  td { background:var(--surface); }
  .sticky { position:sticky;z-index:2; } th.sticky { z-index:5; }
  tr.selected td { background:var(--selection-bg); } tbody tr:hover td { background:var(--surface-raised); } tbody tr.selected:hover td { background:var(--selection-bg); }
  td:focus-visible,td:focus-within { outline:2px solid var(--focus);outline-offset:-2px;z-index:3; }
  th:focus-within { outline:2px solid var(--focus);outline-offset:-2px; }
  th[data-column="select"],td[data-column="select"] { padding:0;text-align:center; }
  input[type="checkbox"] { display:block;width:1.5rem;height:1.5rem;margin:auto;accent-color:var(--accent);cursor:pointer; }
  .sort-control { display:flex;align-items:center;gap:.375rem;justify-content:space-between;width:100%;height:1.875rem;min-width:0;padding:0;border:0;background:transparent;color:inherit;text-decoration:none;cursor:pointer;font:inherit; }
  .sort-rank { color:var(--accent);font: .6875rem var(--mono-font); }
  .resize-handle { position:absolute;right:0;top:0;bottom:0;width:6px;cursor:col-resize;touch-action:none; }
  .resize-handle:hover { background:var(--focus); }
  .identity { display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-height:1.5rem;line-height:1.5rem;text-decoration:none;color:var(--accent); }
  td[data-column="title"] .identity { color:var(--text); }
  .identity:hover { text-decoration:underline; }
  .cell-value { display:flex;align-items:center;gap:.25rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
  .value-text { min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
  .numeric { text-align:right;font-variant-numeric:tabular-nums; }.numeric .cell-value { justify-content:end; }
  .mono { font-family:var(--mono-font);font-size:.8125rem; }
  .tone-neutral { color:var(--text-muted); }.tone-accent { color:var(--accent); }.tone-info { color:var(--focus); }.tone-warning { color:var(--warning); }.tone-danger { color:var(--danger); }
  .comfortable td { height:2.5rem; }
  .empty-table { margin:0;padding:1rem;border:1px solid var(--border-subtle);background:var(--surface);color:var(--text-muted); }
  @media(pointer:coarse) { input[type="checkbox"] { width:2.75rem;height:2.75rem; } td,th,.comfortable td { height:2.75rem; }.identity,.sort-control { min-height:2.75rem;line-height:2.75rem; } }
</style>
