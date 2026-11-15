<script lang="ts">
  import {workspaceURL} from '../workspace/location.svelte.ts';
  import {onMount,tick,untrack} from 'svelte';
  import type {InspectorSection} from '../../../../src/services/workspace-detail.ts';
  import type {InspectorController} from './controller.svelte.ts';
  import type {InspectorMode} from './geometry.ts';
  import {stepInspectorWidth} from './geometry.ts';
  import {canonicalDetailHref,inspectorURL,isPlainActivation,withoutInspector} from './history.ts';
  import Popover from '../components/Popover.svelte';
  let {controller,mode,width,maxWidth,onWidth}:{controller:InspectorController;mode:InspectorMode;width:number;maxWidth:number;onWidth:(width:number)=>void}=$props();
  let mounted=$state(false),host=$state<HTMLDivElement>(null!),heading=$state<HTMLHeadingElement>(null!),reader=$state<HTMLDivElement>(null!),copyNotice=$state(''),copyFallback=$state<string|undefined>();
  const identity=$derived(controller.identity),detailState=$derived(controller.state),Component=$derived(controller.component);
  const modal=$derived(mounted&&!!identity&&mode!=='docked');
  const snapshot=$derived(detailState.snapshot),found=$derived(snapshot?.detail.found);
  const title=$derived(snapshot?.detail.found?(snapshot.kind==='task'?snapshot.detail.task.title:snapshot.detail.spec.title):identity?.id??'Inspector');
  const status=$derived(snapshot?.detail.found?(snapshot.kind==='task'?snapshot.detail.task.status:snapshot.detail.spec.status):'');
  const visibleIds=$derived(controller.visibleIds),index=$derived(identity?visibleIds.indexOf(identity.id):-1);
  const sections=$derived<InspectorSection[]>(identity?.kind==='spec'?['overview','relations','document','questions','decisions']:['overview','relations','document']);
  let scrolledSection='';
  $effect(()=>{const key=`${identity?.kind}:${identity?.id}:${controller.section}`;if(snapshot&&Component&&key!==scrolledSection){scrolledSection=key;void tick().then(()=>controller.scrollSection(controller.section));}});
  let previousMode=untrack(()=>mode),drag:{x:number;width:number;pointer:number;element:HTMLElement}|undefined;
  function endDrag(){if(drag?.element.hasPointerCapture(drag.pointer))drag.element.releasePointerCapture(drag.pointer);drag=undefined;}
  function pointerStart(event:PointerEvent){if(mode!=='docked')return;event.preventDefault();const element=event.currentTarget as HTMLElement;drag={x:event.clientX,width,pointer:event.pointerId,element};element.setPointerCapture(event.pointerId);}
  function pointerMove(event:PointerEvent){if(drag)onWidth(Math.max(360,Math.min(maxWidth,drag.width+drag.x-event.clientX)));}
  function widthKey(event:KeyboardEvent){if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();onWidth(stepInspectorWidth(width,event.key,maxWidth));}}
  function focusables(){return Array.from(host.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,summary,[tabindex]')).filter(node=>node.tabIndex>=0&&!node.hasAttribute('disabled')&&node.getClientRects().length&&!node.closest('[inert]'));}
  function keyboard(event:KeyboardEvent){
    if(!identity||event.defaultPrevented)return;const active=document.activeElement as HTMLElement|null;
    if(event.key==='Escape'){
      const popup=active?.closest<HTMLDetailsElement>('details[open]');if(popup){if(host.contains(popup)){event.preventDefault();popup.open=false;popup.querySelector('summary')?.focus();}return;}
      if(modal||host.contains(active)||controller.regionFor(active)){event.preventDefault();void controller.close();}return;
    }
    if(event.key==='Tab'&&modal){const targets=focusables(),first=targets[0],last=targets.at(-1);if(!first){event.preventDefault();heading.focus();return;}const index=active?targets.indexOf(active):-1;if(event.shiftKey&&(index<=0)||!event.shiftKey&&(index<0||active===last)){event.preventDefault();(event.shiftKey?last:first)?.focus();}return;}
    if(event.key==='F6'&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
      if(modal){if(host.contains(active)){event.preventDefault();heading.focus();}return;}
      const current=host.contains(active)?'inspector':controller.regionFor(active);if(!current||!controller.hasList)return;
      const regions=['toolbar','grid','inspector'],next=regions[(regions.indexOf(current)+(event.shiftKey?2:1))%3];event.preventDefault();if(next==='toolbar')controller.focusToolbar();else if(next==='grid')controller.focusGrid();else controller.focusHeading();
    }
  }
  function containment(event:FocusEvent){if(modal&&event.target instanceof Node&&!host.contains(event.target))heading?.focus({preventScroll:true});}
  function relationClicks(node:HTMLDivElement){const handler=(event:MouseEvent)=>{if(!isPlainActivation(event))return;const anchor=(event.target as Element).closest<HTMLAnchorElement>('a[href]');if(!anchor||!node.contains(anchor)||anchor.hasAttribute('download')||anchor.target&&anchor.target!=='_self')return;
    const url=new URL(anchor.href);if(url.origin!==workspaceURL().origin)return;
    if(anchor.hasAttribute('data-inspector-full')){event.preventDefault();void controller.fullPage(anchor.href);return;}
    const match=/^\/(tasks|specs)\/((?:TASK|SPEC)-[A-Za-z0-9][A-Za-z0-9_-]*)$/.exec(url.pathname);if(match){event.preventDefault();void controller.open({kind:match[1]==='tasks'?'task':'spec',id:decodeURIComponent(match[2]!)});}
  };node.addEventListener('click',handler);return {destroy(){node.removeEventListener('click',handler);}};}
  async function copyLink(){try{await navigator.clipboard.writeText(workspaceURL().href);copyNotice='Inspector link copied.';copyFallback=undefined;}catch{copyNotice='Clipboard unavailable.';copyFallback=workspaceURL().href;}}
  $effect(()=>{controller.bindElements(heading,reader);return ()=>controller.bindElements(undefined,undefined);});
  $effect.pre(()=>{const next=mode;if(next!==previousMode){const lostWidthControl=next!=='docked'&&(document.activeElement as Element|null)?.closest('[data-inspector-width]');endDrag();previousMode=next;if(lostWidthControl)void tick().then(()=>controller.focusHeading());}});
  $effect(()=>{
    if(!modal||!host)return;
    const previous=new Map<HTMLElement,string|null>();
    for(let branch:Element=host;branch.parentElement;branch=branch.parentElement){for(const sibling of branch.parentElement.children){if(sibling!==branch&&sibling instanceof HTMLElement&&!['SCRIPT','STYLE'].includes(sibling.tagName)&&!sibling.hasAttribute('data-inspector-backdrop')){previous.set(sibling,sibling.getAttribute('inert'));sibling.inert=true;}}}
    if(!host.contains(document.activeElement))heading?.focus({preventScroll:true});
    return ()=>{for(const [element,attribute]of previous){if(attribute===null)element.removeAttribute('inert');else element.setAttribute('inert',attribute);}};
  });
  onMount(()=>{mounted=true;return endDrag;});
</script>
<svelte:window onkeydown={keyboard} onfocusin={containment}/>
{#if modal}<button class="inspector-backdrop" data-inspector-backdrop tabindex="-1" aria-label="Close inspector backdrop" onclick={()=>void controller.close()}></button>{/if}
<div class="inspector-host" data-sveltekit-preload-data="off" data-sveltekit-preload-code="off" class:enhanced={mounted} class:docked={mounted&&mode==='docked'} class:overlay={mounted&&mode==='overlay'} class:fullscreen={mounted&&mode==='fullscreen'} hidden={!identity} bind:this={host} role={mounted&&mode!=='docked'?'dialog':'complementary'} aria-modal={modal?true:undefined} aria-labelledby="inspector-heading" style:width={mounted&&mode==='docked'?`${width}px`:undefined}>
  {#if identity}
    {#if mounted&&mode==='docked'}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (APG focusable window splitter: numeric ARIA values, arrows and Home/End sizing.) -->
    <div class="width-handle" data-inspector-width role="separator" aria-label="Inspector width" aria-orientation="vertical" aria-valuemin="360" aria-valuemax={maxWidth} aria-valuenow={width} tabindex="0" onkeydown={widthKey} onpointerdown={pointerStart} onpointermove={pointerMove} onpointerup={endDrag} onpointercancel={endDrag}></div>{/if}
    <header class="inspector-header">
      <div class="inspector-topline"><span class="identity">{identity.kind} · {identity.id}</span><span class="status">{status.replaceAll('_',' ')}</span>{#if mounted}<button type="button" aria-label="Close inspector" onclick={()=>void controller.close()}>×</button>{:else}<a href={withoutInspector(workspaceURL())}>Close inspector</a>{/if}</div>
      <h2 id="inspector-heading" tabindex="-1" bind:this={heading}>{title}</h2>
      <div class="inspector-actions">
        {#if index>0}<a aria-label="Previous visible entity" href={inspectorURL(workspaceURL(),{kind:identity.kind,id:visibleIds[index-1]!})} onclick={event=>{if(isPlainActivation(event)){event.preventDefault();void controller.open({kind:identity.kind,id:visibleIds[index-1]!});}}}>↑ Previous</a>{:else}<span aria-disabled="true">↑ Previous</span>{/if}
        {#if index>=0&&index<visibleIds.length-1}<a aria-label="Next visible entity" href={inspectorURL(workspaceURL(),{kind:identity.kind,id:visibleIds[index+1]!})} onclick={event=>{if(isPlainActivation(event)){event.preventDefault();void controller.open({kind:identity.kind,id:visibleIds[index+1]!});}}}>↓ Next</a>{:else}<span aria-disabled="true">↓ Next</span>{/if}
        <a href={canonicalDetailHref(identity)} onclick={event=>{if(isPlainActivation(event)){event.preventDefault();void controller.fullPage();}}}>Open page ↗</a>
        {#if mounted}<button type="button" onclick={copyLink}>Copy link</button>{#if mode==='docked'}<span data-inspector-width><Popover label="Width">{#each [360,440,520,640] as option}<button type="button" disabled={option>maxWidth} aria-pressed={width===option} onclick={()=>onWidth(option)}>{option}px</button>{/each}</Popover></span>{/if}{/if}
      </div>
      {#if mounted&&controller.hasMatchingList&&index<0}<p class="outside">Outside this page of results · Previous/next unavailable</p>{:else if mounted&&!controller.hasMatchingList}<p class="outside">Previous/next unavailable in this view</p>{/if}
      {#if controller.breadcrumb.length}<nav aria-label="Inspector relation trail" class="breadcrumb">{#each controller.breadcrumb as entry}<a href={inspectorURL(workspaceURL(),entry)} onclick={event=>{if(isPlainActivation(event)){event.preventDefault();void controller.open(entry);}}}>{entry.id}</a>{/each}</nav>{/if}
      <nav class="section-links" aria-label="Inspector sections">{#each sections as section}<a aria-current={controller.section===section?'location':undefined} href={inspectorURL(workspaceURL(),identity,section)} onclick={event=>{if(isPlainActivation(event)){event.preventDefault();void controller.setSection(section);}}}>{section[0]!.toUpperCase()+section.slice(1)}</a>{/each}</nav>
    </header>
    <div class="inspector-reader" bind:this={reader} use:relationClicks aria-busy={controller.pending}>
      {#if detailState.error||controller.moduleError}<div class="detail-error" role="alert"><strong>{snapshot?'Previous detail · ':''}{detailState.error==='timeout'?'Detail request timed out.':'Detail could not be loaded.'}</strong>{#if mounted}<button type="button" onclick={()=>controller.retry()}>Retry detail</button>{/if}<a data-inspector-full href={canonicalDetailHref(identity)}>Open canonical page</a></div>{/if}
      {#if Component&&snapshot}<Component detail={snapshot.detail} presentation="inspector" />
      {:else if controller.pending}<div class="skeleton" role="status">Loading {identity.id}…<div></div><div></div><div></div></div>
      {:else if !detailState.error&&!controller.moduleError}<p>Detail unavailable. <a data-inspector-full href={canonicalDetailHref(identity)}>Open canonical page</a></p>{/if}
      {#if copyFallback!==undefined}<label class="copy-fallback">Clipboard unavailable. Select and copy the inspector link<input readonly value={copyFallback}/></label>{/if}
    </div>
    <p class="sr-only" role="status">{copyNotice} {controller.announcement}</p>
  {/if}
</div>
<style>
  .inspector-host{min-width:0;border:1px solid var(--border-subtle);background:var(--surface);color:var(--text);position:relative}.inspector-host[hidden]{display:none}.enhanced{display:flex;flex-direction:column;min-height:0;height:100%;flex-shrink:0}.overlay,.fullscreen{position:fixed;z-index:45;inset:0 0 0 auto;width:min(520px,calc(100vw - 32px));height:100dvh;box-shadow:var(--shadow-overlay)}.fullscreen{width:100vw}.inspector-backdrop{position:fixed;z-index:44;inset:0;border:0;background:#0008;cursor:default}.inspector-header{flex-shrink:0;display:grid;gap:.5rem;padding:.75rem;border-bottom:1px solid var(--border-subtle);background:var(--surface)}.inspector-topline,.inspector-actions,.section-links,.breadcrumb{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}.identity{font:.75rem var(--mono-font);color:var(--text-muted)}.status{font-size:.75rem;color:var(--text-muted);margin-left:auto}.inspector-topline button{font-size:1.25rem;width:1.75rem;padding:0}.inspector-header h2{font:650 1.125rem/1.35 var(--body-font);margin:0;display:-webkit-box;-webkit-line-clamp:3;line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}.inspector-header h2:focus{outline:2px solid var(--focus);outline-offset:2px}.inspector-actions a,.section-links a,button{min-height:1.5rem;display:inline-flex;align-items:center;font-size:.75rem}.inspector-actions a,.breadcrumb a{color:var(--accent);text-decoration:none}.inspector-actions>span[aria-disabled]{font-size:.75rem;color:var(--text-muted)}button{padding:.125rem .375rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text);cursor:pointer}button:disabled{color:var(--text-muted);cursor:default}.section-links{gap:.25rem}.section-links a{padding:.125rem .375rem;color:var(--text-muted);text-decoration:none;border-bottom:2px solid transparent}.section-links a[aria-current]{color:var(--accent);border-color:var(--accent)}.outside{margin:0;font-size:.75rem;color:var(--warning)}.breadcrumb a{display:inline-flex;align-items:center;min-height:1.5rem}.breadcrumb{font:.6875rem var(--mono-font)}.inspector-reader{min-height:0;overflow:auto;overscroll-behavior:contain;overflow-anchor:none;flex:1;padding:.75rem}.width-handle{position:absolute;z-index:6;left:-16px;top:0;bottom:0;width:24px;cursor:col-resize;touch-action:none}.width-handle::before{content:"";position:absolute;left:11px;top:0;bottom:0;width:2px;background:var(--border-subtle)}.width-handle:hover::before{background:var(--border-control)}.width-handle:focus-visible{outline:2px solid var(--focus);outline-offset:-2px;background:var(--border-control)}.detail-error{display:flex;flex-wrap:wrap;gap:.5rem;padding:.5rem;margin-bottom:.5rem;border:1px solid var(--warning);color:var(--warning);font-size:.75rem}.skeleton{color:var(--text-muted);font-size:.8125rem}.skeleton div{height:3rem;margin:.75rem 0;border-radius:.25rem;background:var(--surface-raised)}.copy-fallback{display:grid;gap:.25rem;font-size:.75rem;color:var(--warning);margin-top:.75rem}.copy-fallback input{width:100%;min-height:2rem;border:1px solid var(--border-control);background:var(--surface);color:var(--text)}@media(pointer:coarse){button,.inspector-actions a,.section-links a,.breadcrumb a{min-height:2.75rem}.inspector-topline button{width:2.75rem}.inspector-header{padding:.75rem}}
</style>
