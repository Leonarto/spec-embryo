<script lang="ts">
import {page} from '$app/state';
import NotFound from '../../../lib/components/detail/NotFound.svelte';
</script>
<svelte:head><title>{page.status===404?'Missing spec':'Detail error'} · {page.params.specId}</title></svelte:head>
<NotFound kind="spec" id={page.params.specId??''} status={page.status} message={page.error?.message}/>
