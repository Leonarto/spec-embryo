<script lang="ts">
  import QuestionLeaveDialog from "../inspector/QuestionLeaveDialog.svelte";
  import {provideInspector} from "../inspector/controller.svelte.ts";
  import InspectorWorkspace from "../inspector/InspectorWorkspace.svelte";
  import WorkspaceShell from "../components/workspace/WorkspaceShell.svelte";
  import { provideWorkspaceRefresh } from "../workspace/context.svelte.ts";
  import type {Snippet} from 'svelte';
  import type {WorkspaceShellData} from '../../../../src/services/workspace.ts';
  import type {WorkspaceDetailEnvelope} from '../../../../src/services/workspace-detail.ts';
  import type {DetailComponent} from '../inspector/modules.ts';
  let {data,children}:{data:{repositories:{currentId:string|null;workspaceKey:string;projects:Array<{id:string;name:string}>;registrationAllowed:boolean;registryError?:string};shell:WorkspaceShellData;inspector:WorkspaceDetailEnvelope|null;inspectorComponent?:DetailComponent;inspectorModuleError?:boolean;inspectorReadError?:boolean};children:Snippet}=$props();
  const resource=provideWorkspaceRefresh();
  const inspector=provideInspector(()=>({projectKey:data.shell.project.key,envelope:data.inspector,component:data.inspectorComponent,moduleError:data.inspectorModuleError,readError:data.inspectorReadError}));
  const shell=$derived(resource.active?.state.snapshot.shell??data.shell);
</script>
<WorkspaceShell project={shell.project} git={shell.git} {resource} repositories={data.repositories} onSwitch={inspector.switchProject}><InspectorWorkspace controller={inspector} projectKey={shell.project.key}>{@render children()}</InspectorWorkspace></WorkspaceShell>

<QuestionLeaveDialog controller={inspector}/>
