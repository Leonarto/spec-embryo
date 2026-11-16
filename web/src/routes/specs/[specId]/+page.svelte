<script lang="ts">
  import SpecDetail from "../../../lib/components/detail/SpecDetail.svelte";
  import type { BoundedSpecResult } from "../../../../../src/services/detail-relations.ts";
  import type { WorkspaceDetailEnvelope } from "../../../../../src/services/workspace-detail.ts";
  import CanonicalDetailReader from "../../../lib/components/detail/CanonicalDetailReader.svelte";
  import type { SpecDetailActionResult } from "../../../lib/components/detail/types.ts";

  let specReader=$state<{hasAnswerDraft:()=>boolean}>();
  let { data, form } = $props();
  const detail = $derived(data.detail as BoundedSpecResult);
  const actionResult = $derived(form as SpecDetailActionResult | undefined);
  const envelope=$derived({schemaVersion:2,kind:"spec",id:detail.found?detail.spec.id:detail.id,revision:data.sourceRevision,generatedAt:data.generatedAt,pages:data.pages,detail} as WorkspaceDetailEnvelope);
</script>


<CanonicalDetailReader {envelope} allowFullRefresh={()=>!specReader?.hasAnswerDraft()}>
{#snippet children(snapshot,relationReader)}
{@const accepted=snapshot.detail as BoundedSpecResult}
<SpecDetail bind:this={specReader} detail={accepted} {relationReader} {actionResult} />
{/snippet}
</CanonicalDetailReader>
