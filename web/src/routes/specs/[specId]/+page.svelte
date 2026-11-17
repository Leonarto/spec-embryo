<script lang="ts">
  import {projectHref} from "../../../lib/workspace/project.ts";
  import {workspaceURL as projectSourceURL} from "../../../lib/workspace/location.svelte.ts";
  import SpecDetail from "../../../lib/components/detail/SpecDetail.svelte";
  import type { BoundedSpecResult } from "../../../../../src/services/detail-relations.ts";
  import type { WorkspaceDetailEnvelope } from "../../../../../src/services/workspace-detail.ts";
  import CanonicalDetailReader from "../../../lib/components/detail/CanonicalDetailReader.svelte";
  import type { SpecDetailActionResult } from "../../../lib/components/detail/types.ts";

  let specReader=$state<{hasAnswerDraft:()=>boolean}>();
  let { data, form } = $props();
  const detail = $derived(data.detail as BoundedSpecResult);
  const actionResult = $derived((form??data.answerOutcome) as SpecDetailActionResult | undefined);
  const envelope=$derived(detail?{schemaVersion:2,kind:"spec",id:detail.found?detail.spec.id:detail.id,revision:data.sourceRevision,generatedAt:data.generatedAt,pages:data.pages,detail} as WorkspaceDetailEnvelope:null);
</script>


{#if envelope}
<CanonicalDetailReader {envelope} projectKey={data.shell.project.key} allowFullRefresh={()=>!specReader?.hasAnswerDraft()}>
{#snippet children(snapshot,relationReader)}
{@const accepted=snapshot.detail as BoundedSpecResult}
<SpecDetail bind:this={specReader} detail={accepted} {relationReader} {actionResult} projectKey={data.shell.project.key} />
{/snippet}
</CanonicalDetailReader>

{:else}
<section><h1>Spec answer outcome</h1>{#if actionResult?.success}<p role="status">Answers were saved.</p>{/if}{#if actionResult?.error}<p role="alert">{actionResult.error}</p>{/if}<p>{actionResult?.refreshWarning??'Current details are unavailable. Submitted text is kept below.'}</p>{#each [...(actionResult?.submittedDrafts??[]),...(actionResult?.recovery??[])] as pair}<h2>{pair.question}</h2><pre>{pair.answer}</pre>{/each}<a href={projectHref(`/specs/${data.specId}`,projectSourceURL())}>Retry loading details</a></section>
{/if}
