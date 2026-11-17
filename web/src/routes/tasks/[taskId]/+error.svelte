<script lang="ts">
import {page} from '$app/state';
import NotFound from '../../../lib/components/detail/NotFound.svelte';
</script>
<svelte:head><title>{page.status===404?'Missing task':'Detail error'} · {page.params.taskId}</title></svelte:head>
<NotFound kind="task" id={page.params.taskId??''} status={page.status} message={page.error?.message}/>
