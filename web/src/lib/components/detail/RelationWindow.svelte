<script lang="ts" generics="Item">
 import {onMount,tick,untrack,type Snippet} from 'svelte';
 import {relationPageHref,type DetailRelation,type RelationWindow as Window} from '../../../../../src/services/detail-relations.ts';
 import type {RelationReader} from '../../inspector/relation-reader.ts';
 import {isPlainActivation} from '../../inspector/history.ts';
 let {window:accepted,name,label,baseHref,reader,children}:{window:Window<Item>;name:DetailRelation;label:string;baseHref:string;reader?:RelationReader;children:Snippet<[readonly Item[]]>}=$props();
 let mounted=$state(false),root:HTMLDivElement,range:HTMLParagraphElement;
 const request=$derived(reader?.state.relations[name]),requested=$derived(reader?.state.desiredPages[name]??accepted.page);
 const first=$derived(accepted.total?(accepted.page-1)*100+1:0),last=$derived(Math.min(accepted.page*100,accepted.total));
 function href(page:number){const url=new URL(relationPageHref(reader?.url??new URL(baseHref,'http://spm.local'),name,page));return url.pathname+url.search+url.hash;}
 function activate(event:MouseEvent,page:number){if(!mounted||!reader?.enhanced||!isPlainActivation(event))return;event.preventDefault();if(!reader.state.pending&&page>=1&&page<=accepted.totalPages)reader.page(name,page);}
 $effect.pre(()=>{const current=accepted;untrack(()=>{const active=document.activeElement as HTMLElement|null;if(root?.contains(active))void tick().then(()=>{if(document.activeElement===document.body||active&&!active.isConnected||active?.getAttribute('aria-disabled')==='true')range?.focus({preventScroll:true});});});});
 onMount(()=>mounted=true);
</script>
<div class="relation-window" id={name} data-relation-window={name} data-limited="true" tabindex="-1" role="group" aria-label={label} aria-busy={request?.pending||reader?.state.pending} bind:this={root}>
 <div class="window-controls">
  <p tabindex="-1" bind:this={range}>{label}: {first}–{last} of {accepted.total}</p>
  {#if accepted.totalPages>1}
   <a href={href(Math.max(1,accepted.page-1))} aria-label={`Previous ${label}`} aria-disabled={accepted.page===1||reader?.state.pending} tabindex={accepted.page===1?-1:undefined} onclick={event=>activate(event,accepted.page-1)}>Previous</a>
   <span>Page {accepted.page} of {accepted.totalPages}</span>
   <a href={href(Math.min(accepted.totalPages,accepted.page+1))} aria-label={`Next ${label}`} aria-disabled={accepted.page===accepted.totalPages||reader?.state.pending} tabindex={accepted.page===accepted.totalPages?-1:undefined} onclick={event=>activate(event,accepted.page+1)}>Next</a>
   <a href={href(accepted.totalPages)} aria-label={`Last ${label} page`} aria-disabled={accepted.page===accepted.totalPages||reader?.state.pending} tabindex={accepted.page===accepted.totalPages?-1:undefined} onclick={event=>activate(event,accepted.totalPages)}>Last</a>
  {/if}
  {#if reader?.state.pending}<span role="status">Refreshing details; page controls are waiting.</span>{:else if request?.pending}<span role="status">Loading page {requested}; showing page {accepted.page}.</span>{:else if request?.error}<span role="alert">{request.error==='revision'?'The source changed. Refresh details before loading this page.':`Could not load page ${requested}; showing page ${accepted.page}.`}</span>{#if request.error!=='revision'}<button type="button" onclick={()=>reader?.retry(name)}>Retry page {requested}</button>{/if}{/if}
 </div>
 {@render children(accepted.items)}
</div>
<style>.relation-window{min-width:0}.window-controls{display:flex;align-items:center;gap:.375rem;flex-wrap:wrap;margin-bottom:.375rem;font-size:.75rem}.window-controls p{flex-basis:100%;margin:0;color:var(--text-muted)}button,a{min-height:1.5rem;display:inline-flex;align-items:center}button{padding:.125rem .375rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text);cursor:pointer}a{color:var(--accent)}a[aria-disabled=true]{color:var(--text-muted)}[role=alert]{color:var(--warning)}a:focus-visible,button:focus-visible,p:focus-visible{outline:2px solid var(--focus);outline-offset:2px}@media(pointer:coarse){button,a{min-height:2.75rem}}</style>
