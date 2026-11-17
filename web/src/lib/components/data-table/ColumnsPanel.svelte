<script lang="ts" generics="Row">
  import type { ColumnDef,RenderedColumn,TablePreferences } from './types.ts';
  import { defaultTablePreferences,moveColumn,resizeColumn } from './preferences.ts';
  let {columns,rendered,preferences,onChange}:{columns:ColumnDef<Row>[];rendered:RenderedColumn<Row>[];preferences:TablePreferences;onChange:(value:TablePreferences)=>void}=$props();
</script>
<div class="panel-head"><strong>Columns</strong><button type="button" onclick={()=>onChange({...defaultTablePreferences(columns),density:preferences.density})}>Reset columns</button></div>
<p id="column-sizing-help">Widths in pixels. Arrow keys step 8. Identity columns stay visible and first.</p>
<div class="column-list">
  {#each preferences.columns as preference,index (preference.key)}
    {@const column=columns.find(column=>column.key===preference.key)!}
    {@const width=rendered.find(column=>column.key===preference.key)?.width??preference.width}
    <div class="column-row">
      <label class="visible"><input type="checkbox" checked={preference.visible} disabled={column.locked} onchange={event=>onChange({...preferences,columns:preferences.columns.map(item=>item.key===column.key?{...item,visible:event.currentTarget.checked}:item)})}/><span class="column-label">{column.label}{#if column.locked}<small> · Locked</small>{/if}</span></label>
      <label class="width"><span class="sr-only">{column.label} width in pixels</span><input type="number" min={column.minWidth} max={column.maxWidth} step="8" value={width} disabled={column.minWidth===column.maxWidth} onchange={event=>onChange(resizeColumn(preferences,columns,column.key,event.currentTarget.valueAsNumber))} onkeydown={event=>{if(event.key==='Enter'){event.preventDefault();onChange(resizeColumn(preferences,columns,column.key,event.currentTarget.valueAsNumber));}}}/></label>
      {#if column.flex}<button type="button" class:active={preference.sizing!=='explicit'} aria-pressed={preference.sizing!=='explicit'} onclick={()=>onChange({...preferences,columns:preferences.columns.map(item=>item.key===column.key?{...item,sizing:'auto'}:item)})}>Auto</button>{:else}<span></span>{/if}
      <button type="button" aria-label={`Move ${column.label} up`} disabled={column.locked||index===0||columns.find(item=>item.key===preferences.columns[index-1]?.key)?.locked} onclick={()=>onChange(moveColumn(preferences,columns,column.key,-1))}>↑</button>
      <button type="button" aria-label={`Move ${column.label} down`} disabled={column.locked||index===preferences.columns.length-1} onclick={()=>onChange(moveColumn(preferences,columns,column.key,1))}>↓</button>
    </div>
  {/each}
</div>
<style>
  .panel-head{display:flex;align-items:center;justify-content:space-between;gap:.5rem}p{margin:.5rem 0;color:var(--text-muted);font-size:.75rem}.column-list{display:grid;gap:.375rem}.column-row{display:grid;grid-template-columns:minmax(7rem,1fr) 4.5rem 2.75rem 1.75rem 1.75rem;gap:.25rem;align-items:center}.visible{display:flex;align-items:center;gap:.375rem;min-width:0;font-size:.75rem}.column-label{min-width:0;overflow-wrap:anywhere}small{color:var(--text-muted);font-size:.6875rem}.width input{width:100%}input[type=number],button{min-height:1.75rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text);padding:.125rem .375rem;font-size:.75rem}button{cursor:pointer}button:disabled{cursor:default;color:var(--text-muted);border-color:var(--border-subtle)}button.active{color:var(--accent);background:var(--selection-bg)}input[type=checkbox]{width:1rem;height:1rem;accent-color:var(--accent)}
@media(pointer:coarse){button,input[type=number]{min-height:2.75rem}.visible{min-height:2.75rem}.visible input[type=checkbox]{width:2.75rem;height:2.75rem;flex-shrink:0}.column-row{grid-template-columns:minmax(5rem,1fr) 4rem 2.75rem 2.75rem 2.75rem}}
</style>
