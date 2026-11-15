<script lang="ts">
  import "../app.css";
  import {provideInspector} from "../lib/inspector/controller.svelte.ts";
  import InspectorWorkspace from "../lib/inspector/InspectorWorkspace.svelte";
  import WorkspaceShell from "../lib/components/workspace/WorkspaceShell.svelte";
  import { provideWorkspaceRefresh } from "../lib/workspace/context.svelte.ts";
  let { data, children } = $props();
  const resource=provideWorkspaceRefresh();
  const inspector=provideInspector(()=>({envelope:data.inspector,component:data.inspectorComponent,moduleError:data.inspectorModuleError,readError:data.inspectorReadError}));
  const shell=$derived(resource.active?.state.snapshot.shell??data.shell);
</script>
<WorkspaceShell project={shell.project} git={shell.git} {resource}><InspectorWorkspace controller={inspector} projectKey={shell.project.key}>{@render children()}</InspectorWorkspace></WorkspaceShell>
