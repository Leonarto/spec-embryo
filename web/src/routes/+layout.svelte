<script lang="ts">
  import "../app.css";
  import type { DashboardData } from "../../../src/services/dashboard.ts";
  import WorkspaceShell from "../lib/components/workspace/WorkspaceShell.svelte";
  let { data, children } = $props();
  const dashboard = $derived(data.dashboard as DashboardData);
</script>

<svelte:head><title>{dashboard.project.name} Workspace</title></svelte:head>
<WorkspaceShell project={dashboard.project} git={dashboard.git}>{@render children()}</WorkspaceShell>
