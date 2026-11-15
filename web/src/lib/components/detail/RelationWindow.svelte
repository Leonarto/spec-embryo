<script lang="ts" generics="Item">
  import {onMount,tick,untrack,type Snippet} from 'svelte';
  let {items,identityKey,name,label,fullHref,limited=false,children}:{items:readonly Item[];identityKey:string;name:string;label:string;fullHref:string;limited?:boolean;children:Snippet<[readonly Item[]]>}=$props();
  const size=100;
  let mounted=$state(false),page=$state(1),root:HTMLDivElement,range=$state<HTMLParagraphElement>(null!);
  let previous=untrack(()=>identityKey);
  const last=$derived(Math.max(1,Math.ceil(items.length/size))),effective=$derived(Math.min(page,last));
  const visible=$derived(limited?items.slice((effective-1)*size,effective*size):items);
  $effect.pre(()=>{const key=identityKey,count=items.length;untrack(()=>{const owned=root?.contains(document.activeElement),active=document.activeElement as HTMLElement|null;if(key!==previous){previous=key;page=1;}else page=Math.min(page,Math.max(1,Math.ceil(count/size)));if(owned)void tick().then(()=>{if(document.activeElement===document.body||active&&!active.isConnected)(range??root)?.focus({preventScroll:true});});});});
  function change(next:number,control:HTMLButtonElement){page=Math.max(1,Math.min(last,next));void tick().then(()=>{if(control.isConnected&&!control.disabled)control.focus({preventScroll:true});else(range??root)?.focus({preventScroll:true});});}
  onMount(()=>mounted=true);
</script>
<div class="relation-window" id={name} data-relation-window={name} data-limited={limited} tabindex="-1" role="group" aria-label={label} bind:this={root}>
  {#if limited&&items.length>size}
    <div class="window-controls"><p tabindex="-1" bind:this={range}>{label}: {(effective-1)*size+1}–{Math.min(effective*size,items.length)} of {items.length}</p>{#if mounted}<button type="button" aria-label={`Previous ${label}`} disabled={effective===1} onclick={event=>change(effective-1,event.currentTarget)}>Previous</button><button type="button" aria-label={`Next ${label}`} disabled={effective===last} onclick={event=>change(effective+1,event.currentTarget)}>Next</button>{/if}<a data-inspector-full href={fullHref}>Open complete collection ↗</a></div>
  {/if}
  {@render children(visible)}
</div>
<style>.relation-window{min-width:0}.window-controls{display:flex;align-items:center;gap:.375rem;flex-wrap:wrap;margin-bottom:.375rem;font-size:.75rem}.window-controls p{flex-basis:100%;margin:0;color:var(--text-muted)}button,a{min-height:1.5rem;display:inline-flex;align-items:center}button{padding:.125rem .375rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text);cursor:pointer}button:disabled{color:var(--text-muted);cursor:default}a{color:var(--accent)}@media(pointer:coarse){button,a{min-height:2.75rem}}</style>
