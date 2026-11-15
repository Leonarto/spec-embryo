<script lang="ts">
  import type { Snippet } from 'svelte';
  let {label,children,wide=false}:{label:string;children:Snippet;wide?:boolean}=$props();
  let details:HTMLDetailsElement,panel:HTMLDivElement;
  let position=$state<{left:number;top:number;maxHeight:number}>();
  function place(){if(!details?.open||!panel)return;const rect=details.querySelector('summary')!.getBoundingClientRect(),width=panel.getBoundingClientRect().width;const top=Math.min(rect.bottom+4,window.innerHeight-96);position={left:Math.max(8,Math.min(rect.right-width,window.innerWidth-width-8)),top,maxHeight:window.innerHeight-top-8};}
  export function close(){if(details)details.open=false;}
  function keyboard(event:KeyboardEvent){if(event.key==='Escape'&&!event.defaultPrevented&&details?.open&&details.contains(document.activeElement)){event.preventDefault();close();details.querySelector('summary')?.focus();}}
  function outside(event:PointerEvent){if(details?.open&&event.target instanceof Node&&!details.contains(event.target))close();}
</script>
<svelte:window onkeydown={keyboard} onpointerdown={outside} onresize={place}/>
<details class:wide bind:this={details} ontoggle={()=>{if(details.open)requestAnimationFrame(place);}}><summary>{label}<span aria-hidden="true">⌄</span></summary><div class="popover-panel" bind:this={panel} style:position={position?'fixed':undefined} style:left={position?`${position.left}px`:undefined} style:top={position?`${position.top}px`:undefined} style:max-height={position?`${position.maxHeight}px`:undefined} style:right={position?'auto':undefined}>{@render children()}</div></details>
<style>
  details{position:relative;flex-shrink:0}summary{display:flex;gap:.5rem;align-items:center;justify-content:space-between;min-height:2rem;padding:.25rem .5rem;list-style:none;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);cursor:pointer;font-size:.8125rem}summary::-webkit-details-marker{display:none}summary:hover{background:var(--surface-raised)}
  .popover-panel{box-sizing:border-box;position:absolute;z-index:25;right:0;top:calc(100% + .25rem);width:min(22rem,calc(100vw - 2rem));padding:.75rem;border:1px solid var(--border-control);border-radius:.375rem;background:var(--surface);box-shadow:var(--shadow-overlay);max-height:min(36rem,calc(100dvh - 9rem));overflow:auto;overscroll-behavior:contain}.wide .popover-panel{width:min(34rem,calc(100vw - 2rem));overflow:auto}
  @media(max-width:767px){.popover-panel,.wide .popover-panel{position:fixed;left:.5rem;right:.5rem;top:10rem;width:calc(100vw - 1rem);max-height:calc(100dvh - 11rem)}}
  @media(pointer:coarse){summary{min-height:2.75rem}}
</style>
