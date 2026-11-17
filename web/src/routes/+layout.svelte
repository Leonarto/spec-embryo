<script lang="ts">
 import '../app.css';
 import WorkspaceLayout from '../lib/components/WorkspaceLayout.svelte';
 let {data,children}=$props();
</script>
{#if data.postAnswerRecovery}
 <main class="answer-recovery">{@render children()}</main>
{:else if data.shell && data.repositories}
 {#key `${data.repositories?.currentId ?? "launch"}:${data.shell.project.key}`}<WorkspaceLayout data={{...data,shell:data.shell,repositories:data.repositories}}>{@render children()}</WorkspaceLayout>{/key}
{/if}
<style>.answer-recovery{max-width:56rem;margin:2rem auto;padding:1rem;color:var(--text);background:var(--surface)}.answer-recovery :global(pre){white-space:pre-wrap;overflow-wrap:anywhere}</style>
