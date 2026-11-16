<script lang="ts">
 import {SpecSeedAdapter} from '../../inspector/spec-seed-adapter.ts';
 import {provideQuestionReader,questionNavigation,type QuestionRegistration} from './question-context.ts';
 import {onMount,untrack,type Snippet} from 'svelte';
 import {RelationURLCanonizer} from '../../inspector/relation-url.ts';
 import {page} from '$app/state';
 import {afterNavigate,replaceState} from '$app/navigation';
 import {workspaceURL} from '../../workspace/location.svelte.ts';
 import {parseRelationPages,setRelationPage,type DetailRelation,type RelationPages} from '../../../../../src/services/detail-relations.ts';
 import type {WorkspaceDetailEnvelope} from '../../../../../src/services/workspace-detail.ts';
 import {InspectorDetailResource,type InspectorDetailState} from '../../inspector/detail-resource.ts';
 import type {RelationReader} from '../../inspector/relation-reader.ts';
 let {envelope,children,projectKey="",allowFullRefresh=()=>true}:{envelope:WorkspaceDetailEnvelope;projectKey?:string;allowFullRefresh?:(candidate?:WorkspaceDetailEnvelope)=>boolean;children:Snippet<[WorkspaceDetailEnvelope,RelationReader]>}=$props();
 const initial=untrack(()=>envelope);
 const seeds=new SpecSeedAdapter(()=>projectKey);
 const initialSeed=untrack(()=>seeds.observe(initial).seed);
 let editor:QuestionRegistration|undefined;
 const navigation=questionNavigation();
 provideQuestionReader({register:value=>{editor=value;const unregister=navigation?.register(value);return()=>{if(editor===value)editor=undefined;unregister?.();};},invalidate:()=>resource?.invalidateBeforeOutcome(),refresh:()=>resource?.refresh()??Promise.resolve()});
 let readerState=$state.raw<InspectorDetailState>({identity:{kind:initial.kind,id:initial.id},snapshot:initialSeed,desiredPages:initial.pages,relations:{},refreshRequired:false,blockedRefresh:false,pending:!initialSeed,lastAttemptAt:0,lastSuccessAt:initialSeed?Date.parse(initialSeed.generatedAt):0});
 let navigationReady=$state(false);
 let resource:InspectorDetailResource|undefined,lastSeed=initial,lastHref=untrack(()=>workspaceURL().href);
 const canonizer=new RelationURLCanonizer(()=>{const url=workspaceURL(),identity=readerState.identity;return {identity,urlIdentity:identity&&url.pathname===`/${identity.kind==='task'?'tasks':'specs'}/${identity.id}`?identity:undefined,revision:readerState.snapshot?.revision,epoch:resource?.snapshotEpoch??0,pending:readerState.pending,url};},url=>replaceState(url,{...page.state}));
 afterNavigate(navigation=>void canonizer.afterNavigation(navigation.complete).then(()=>{navigationReady=canonizer.enhanced;}));
 function change(relation:DetailRelation,value:number){if(readerState.pending||!canonizer.enhanced)return;const url=workspaceURL();setRelationPage(url.searchParams,relation,value);replaceState(url,{...page.state});resource?.setPages(parseRelationPages(envelope.kind,url.searchParams));}
 const title=$derived.by(()=>{const snapshot=readerState.snapshot;if(!snapshot)return 'Loading details';if(!snapshot.detail.found)return `Missing ${snapshot.kind} · ${snapshot.id}`;return snapshot.kind==='task'?`${snapshot.detail.task.id} · ${snapshot.detail.task.title}`:`${snapshot.detail.spec.id} · ${snapshot.detail.spec.title}`;});
 const reader=$derived<RelationReader>({url:workspaceURL().href,state:readerState,enhanced:navigationReady,page:change,retry:name=>void resource?.loadRelation(name)});
 onMount(()=>{canonizer.mount();navigationReady=canonizer.enhanced;
  resource=new InspectorDetailResource(workspaceURL().origin,{allowFullRefresh:candidate=>editor?editor.accept(candidate):allowFullRefresh(candidate),onChange:next=>readerState=next,onCanonize:pages=>canonizer.enqueue(pages),isVisible:()=>document.visibilityState==='visible'});
  resource.select({kind:initial.kind,id:initial.id},initialSeed,parseRelationPages(initial.kind,workspaceURL().searchParams));
  const focus=()=>resource?.focus();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{canonizer.dispose();resource?.dispose();window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 });
 $effect(()=>{const next=envelope,href=workspaceURL().href;untrack(()=>{if(!resource)return;if(next!==lastSeed){lastSeed=next;const observation=seeds.observe(next);if(observation.seed)resource.select({kind:next.kind,id:next.id},observation.seed,parseRelationPages(next.kind,new URL(href).searchParams));else{const identity={kind:next.kind,id:next.id};resource.select(identity,undefined,parseRelationPages(next.kind,new URL(href).searchParams));if(observation.fenced)void resource.refresh();}}else if(href!==lastHref)resource.setPages(parseRelationPages(next.kind,new URL(href).searchParams));lastHref=href;});});
</script>
<svelte:head><title>{title}</title></svelte:head>
{#if readerState.error||readerState.refreshRequired||readerState.blockedRefresh}<div class="reader-error" role="alert"><span>{readerState.blockedRefresh?'Unsaved answers kept. Save answers or clear them before refreshing details.':readerState.refreshRequired?'The source changed. Refresh details to load related rows.':'Details could not be refreshed. Previous detail is still shown.'}</span><button type="button" onclick={()=>void resource?.refresh()}>Retry detail refresh</button></div>{/if}
{#if readerState.snapshot}{@render children(readerState.snapshot,reader)}{:else}<p role="status">Loading current details…</p>{/if}
<style>.reader-error{display:flex;align-items:center;flex-wrap:wrap;gap:.5rem;margin-bottom:.75rem;padding:.5rem;border:1px solid var(--warning);color:var(--warning);font-size:.8125rem}button{min-height:1.5rem;padding:.125rem .375rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text)}@media(pointer:coarse){button{min-height:2.75rem}}</style>
