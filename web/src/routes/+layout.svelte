<script lang="ts">
  import "../app.css";
  import WorkspaceShell from "../lib/components/workspace/WorkspaceShell.svelte";
  import { provideWorkspaceRefresh } from "../lib/workspace/context.svelte.ts";
  let { data, children } = $props();
  const resource=provideWorkspaceRefresh();
  const shell=$derived(resource.active?.state.snapshot.shell??data.shell);
</script>
<WorkspaceShell project={shell.project} git={shell.git} {resource}>{@render children()}</WorkspaceShell>
