<script lang="ts">
 import {tick} from 'svelte';
 import type {InspectorController} from './controller.svelte.ts';
 let {controller}:{controller:InspectorController}=$props();
 let dialog:HTMLDialogElement,keep:HTMLButtonElement;
 $effect(()=>{if(controller.confirmation&&dialog){if(!dialog.open)dialog.showModal();void tick().then(()=>keep?.focus());}else if(dialog?.open)dialog.close();});
</script>
<dialog data-question-confirm bind:this={dialog} aria-labelledby="question-leave-title" aria-describedby="question-leave-destination" oncancel={event=>{event.preventDefault();controller.resolveQuestionTransition('keep');}}>
 <h2 id="question-leave-title">Keep your unsaved answers?</h2>
 <p class="destination" id="question-leave-destination">Destination: {controller.confirmationDestination}</p>
 <p>{controller.questionSaving?'Saving is still in progress. Your destination will wait for the result.':'Save your answers, discard them, or keep editing before leaving this spec.'}</p>
 {#if controller.confirmationError}<p role="alert">{controller.confirmationError}</p>{/if}
 <div><button type="button" disabled={controller.questionSaving} onclick={()=>void controller.resolveQuestionTransition('save')}>Save and continue</button><button type="button" disabled={controller.questionSaving} onclick={()=>void controller.resolveQuestionTransition('discard')}>Discard and continue</button><button type="button" bind:this={keep} onclick={()=>void controller.resolveQuestionTransition('keep')}>Keep editing</button></div>
</dialog>
<style>dialog{max-width:min(32rem,calc(100vw - 2rem));padding:1.25rem;border:1px solid var(--border-control);border-radius:.375rem;background:var(--surface);color:var(--text)}dialog::backdrop{background:#0008}h2{font:650 1.125rem var(--body-font);margin:0 0 .75rem}.destination{overflow-wrap:anywhere;font-family:var(--mono-font);font-size:.75rem}p{font-size:.875rem;line-height:1.5}div{display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap}button{min-height:2rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface-raised);color:var(--text);padding:.375rem .625rem}button:focus-visible{outline:2px solid var(--focus);outline-offset:2px}@media(pointer:coarse){button{min-height:2.75rem}}</style>
