<script lang="ts">
  import SpecDetail from "../../../lib/components/detail/SpecDetail.svelte";
  import type { SpecDetailResult } from "../../../../../src/services/details.ts";
  import type { SpecDetailActionResult } from "../../../lib/components/detail/types.ts";

  let { data, form } = $props();
  const detail = $derived(data.detail as SpecDetailResult);
  const actionResult = $derived(form as SpecDetailActionResult | undefined);
</script>

<svelte:head>
  <title>{detail.found ? `${detail.spec.id} · ${detail.spec.title}` : `Missing spec · ${detail.id}`}</title>
</svelte:head>

<SpecDetail {detail} {actionResult} />
