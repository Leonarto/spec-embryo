<script lang="ts">
  import TaskDetail from "../../../lib/components/detail/TaskDetail.svelte";
  import type { TaskDetailResult } from "../../../../../src/services/details.ts";

  let { data } = $props();
  const detail = $derived(data.detail as TaskDetailResult);
</script>

<svelte:head>
  <title>{detail.found ? `${detail.task.id} · ${detail.task.title}` : `Missing task · ${detail.id}`}</title>
</svelte:head>

<TaskDetail {detail} />
