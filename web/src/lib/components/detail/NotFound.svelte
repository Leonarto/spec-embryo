<script lang="ts">
  import {projectHref} from "../../workspace/project.ts";
  import {workspaceURL as projectSourceURL} from "../../workspace/location.svelte.ts";
  let {kind,id,status=404,message}:{kind:'task'|'spec';id:string;status?:number;message?:string}=$props();
</script>
<section class="not-found"><p class="eyebrow">{status===404?'Not found':'Unable to load'}</p><h1>{status===404?`${kind==='task'?'Task':'Spec'} ${id} was not found`:'Detail could not be loaded'}</h1><p>{message??'This entity is not available in the current managed memory.'}</p><a href={projectHref(kind==='task'?'/tasks':'/specs',projectSourceURL())}>Back to {kind==='task'?'Tasks':'Specs'}</a></section>
<style>.not-found{max-width:42rem;padding:1rem;border:1px solid var(--border-subtle);border-radius:.375rem;background:var(--surface)}h1{font:650 1.375rem/1.35 var(--body-font);margin:.5rem 0}p{color:var(--text-muted)}.eyebrow{font:.75rem var(--mono-font);text-transform:uppercase}a{display:inline-flex;align-items:center;min-height:2rem;color:var(--accent)}@media(pointer:coarse){a{min-height:2.75rem}}</style>
