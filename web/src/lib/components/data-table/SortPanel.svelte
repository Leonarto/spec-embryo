<script lang="ts" generics="Row">
  import {untrack} from 'svelte';
  import type {ColumnDef,TableSort} from './types.ts';
  let {columns,sort,onChange}:{columns:ColumnDef<Row>[];sort:TableSort[];onChange:(sort:TableSort[])=>void}=$props();
  let primary=$state(untrack(()=>sort[0]?.key??'id')),direction=$state<'asc'|'desc'>(untrack(()=>sort[0]?.direction??'asc'));
  let secondary=$state(untrack(()=>sort[1]?.key??'')),secondaryDirection=$state<'asc'|'desc'>(untrack(()=>sort[1]?.direction??'asc'));
  let signature=untrack(()=>JSON.stringify(sort));
  $effect(()=>{const source=sort,key=JSON.stringify(source);if(key!==signature){signature=key;primary=source[0]?.key??'id';direction=source[0]?.direction??'asc';secondary=source[1]?.key??'';secondaryDirection=source[1]?.direction??'asc';}});
</script>
<form onsubmit={event=>{event.preventDefault();onChange([{key:primary,direction},...(secondary&&secondary!==primary?[{key:secondary,direction:secondaryDirection}]:[])]);}}>
  <strong>Sort this query</strong>
  <label>Primary column<select bind:value={primary}>{#each columns.filter(column=>column.sortKey) as column}<option value={column.sortKey}>{column.label}</option>{/each}</select></label>
  <label>Primary direction<select bind:value={direction}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
  <label>Secondary column<select bind:value={secondary}><option value="">None</option>{#each columns.filter(column=>column.sortKey&&column.sortKey!==primary) as column}<option value={column.sortKey}>{column.label}</option>{/each}</select></label>
  <label>Secondary direction<select bind:value={secondaryDirection}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
  <div><button type="submit">Apply sort</button><button type="button" onclick={()=>{secondary='';onChange([{key:primary,direction}]);}}>Remove secondary</button></div>
  <p>ID is the final tie-break. Empty values stay last.</p>
</form>
<style>
  form{display:grid;gap:.5rem}label{display:grid;gap:.25rem;font-size:.75rem;color:var(--text-muted)}select,button{min-height:2rem;padding:.25rem .5rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text)}div{display:flex;gap:.5rem;flex-wrap:wrap}p{margin:0;color:var(--text-muted);font-size:.75rem}button{cursor:pointer}
@media(pointer:coarse){select,button{min-height:2.75rem}}
</style>
