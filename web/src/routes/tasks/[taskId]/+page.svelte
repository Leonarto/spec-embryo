<script lang="ts">
  import TaskDetail from "../../../lib/components/detail/TaskDetail.svelte";
  import type { BoundedTaskResult } from "../../../../../src/services/detail-relations.ts";
  import type { WorkspaceDetailEnvelope } from "../../../../../src/services/workspace-detail.ts";
  import CanonicalDetailReader from "../../../lib/components/detail/CanonicalDetailReader.svelte";

  let { data } = $props();
  const detail = $derived(data.detail as BoundedTaskResult);
  const envelope=$derived({schemaVersion:2,kind:"task",id:detail.found?detail.task.id:detail.id,revision:data.sourceRevision,generatedAt:data.generatedAt,pages:data.pages,detail} as WorkspaceDetailEnvelope);
</script>


<CanonicalDetailReader {envelope}>
{#snippet children(snapshot,relationReader)}
{@const accepted=snapshot.detail as BoundedTaskResult}
<TaskDetail detail={accepted} {relationReader} />
{/snippet}
</CanonicalDetailReader>
