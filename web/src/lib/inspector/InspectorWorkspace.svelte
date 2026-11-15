<script lang="ts">
  import {onMount,type Snippet} from 'svelte';
  import type {InspectorController} from './controller.svelte.ts';
  import InspectorHost from './InspectorHost.svelte';
  import {inspectorMode,inspectorWidth,maximumDockedWidth,parseInspectorWidth,inspectorWidthStorageKey} from './geometry.ts';
  let {controller,projectKey,children}:{controller:InspectorController;projectKey:string;children:Snippet}=$props();
  let mounted=$state(false),container:HTMLDivElement,viewport=$state(0),available=$state(0),width=$state(440);
  const mode=$derived(inspectorMode(viewport,available,width)),maxWidth=$derived(maximumDockedWidth(available));
  function changeWidth(value:number){width=Math.min(maxWidth,inspectorWidth(value));try{localStorage.setItem(inspectorWidthStorageKey(projectKey),JSON.stringify({version:1,width}));}catch{/* Session-only sizing remains available. */}}
  onMount(()=>{mounted=true;try{width=parseInspectorWidth(localStorage.getItem(inspectorWidthStorageKey(projectKey)));}catch{}const measure=()=>{viewport=window.innerWidth;available=container.clientWidth;};measure();const observer=new ResizeObserver(measure);observer.observe(container);window.addEventListener('resize',measure);return ()=>{observer.disconnect();window.removeEventListener('resize',measure);};});
</script>
<div class="inspector-layout" class:enhanced={mounted} class:docked={mounted&&!!controller.identity&&mode==='docked'} bind:this={container}>
  <InspectorHost {controller} {mode} {width} {maxWidth} onWidth={changeWidth}/>
  <div class="inspector-page">{@render children()}</div>
</div>
<style>.inspector-layout{display:flex;flex-direction:column;min-width:0;height:auto}.inspector-page{min-width:0;min-height:0}.enhanced{height:100%;flex-direction:row}.enhanced .inspector-page{flex:1;height:100%;order:0}.enhanced :global(.inspector-host){order:1}.docked{gap:8px}.docked .inspector-page :global(.specs-toolbar),.docked .inspector-page :global(.view-toolbar){margin-right:0}@media(max-width:767px){.enhanced{height:100%;}}</style>
