<script lang="ts">
  import {projectHref} from "../lib/workspace/project.ts";
  import {workspaceURL as projectSourceURL} from "../lib/workspace/location.svelte.ts";
  import { ArrowRight, GitBranch, ShieldAlert, ShieldCheck } from "@lucide/svelte";
  import type { WorkspaceEnvelope } from "../../../src/services/workspace.ts";
  import { useWorkspaceResource } from "../lib/workspace/resource.svelte.ts";
  import ViewToolbar from "../lib/components/ViewToolbar.svelte";
  let { data } = $props();
  const resource=useWorkspaceResource(()=>data.workspace as WorkspaceEnvelope<'overview'>);
  const workspace=$derived(resource.snapshot);
  const dashboard=$derived(workspace.data);
  const stats = $derived([
    { label: "Specs", value: dashboard.counts.specs, href: "/specs" },
    { label: "Tasks", value: dashboard.counts.tasks, href: "/tasks" },
    { label: "Active specs", value: dashboard.counts.activeSpecs, href: "/specs?spec_status=active" },
    { label: "In progress", value: dashboard.counts.inProgressTasks, href: "/tasks" },
    { label: "Review", value: dashboard.counts.reviewTasks, href: "/tasks" },
    { label: "Blocked", value: dashboard.counts.blockedTasks, href: "/tasks" },
    { label: "Ready", value: dashboard.counts.readyTasks, href: "/tasks" },
  ]);
</script>
<svelte:head><title>{workspace.shell.project.name} Overview</title></svelte:head>
<ViewToolbar title="Overview" />

<section class="focus-panel" aria-labelledby="focus-heading">
  <p class="eyebrow">Current focus</p>
  <h2 id="focus-heading">{dashboard.currentState.focus}</h2>
  <p class="summary">{dashboard.currentState.summary}</p>
  <div class="active-links">
    <span>Active specs</span>
    {#each dashboard.currentState.activeSpecIds as id}<a href={projectHref(`/specs/${id}`,projectSourceURL())}>{id}</a>{:else}<span class="muted">None</span>{/each}
    <span class="active-label">Active tasks</span>
    {#each dashboard.currentState.activeTaskIds as id}<a href={projectHref(`/tasks/${id}`,projectSourceURL())}>{id}</a>{:else}<span class="muted">None</span>{/each}
  </div>
</section>

<section class="stats-band" aria-label="Workspace counts">
  {#each stats as stat}<a href={projectHref(stat.href,projectSourceURL())}><strong>{stat.value}</strong><span>{stat.label}</span></a>{/each}
</section>

<div class="overview-grid">
  <section class="panel" aria-labelledby="actions-heading">
    <h2 id="actions-heading">Next actions</h2>
    <ol class="actions">
      {#each dashboard.nextActions as action}<li><ArrowRight size={14} /><span>{action}</span></li>{:else}<li>No next action suggested.</li>{/each}
    </ol>
    {#if dashboard.currentState.nextActionHints.length}
      <details><summary>Current-state hints ({dashboard.currentState.nextActionHints.length})</summary><ul>{#each dashboard.currentState.nextActionHints as hint}<li>{hint}</li>{/each}</ul></details>
    {/if}
  </section>

  <section class="panel" aria-labelledby="health-heading">
    <h2 id="health-heading">AGENTS health</h2>
    <p class="health" class:warning={!dashboard.agents.ok}>
      {#if dashboard.agents.ok}<ShieldCheck size={17} />{:else}<ShieldAlert size={17} />{/if}
      <strong>{dashboard.agents.ok ? "Healthy" : "Needs attention"}</strong>
    </p>
    <dl><div><dt>Maximum file</dt><dd>{dashboard.agents.maxFileTokens} tokens</dd></div><div><dt>Maximum chain</dt><dd>{dashboard.agents.maxChainTokens} tokens</dd></div></dl>
    {#if dashboard.agents.failures.length}<ul>{#each dashboard.agents.failures as failure}<li>{failure}</li>{/each}</ul>{/if}
  </section>

  <section class="panel" aria-labelledby="blocked-heading">
    <h2 id="blocked-heading">Blocked work <span>{dashboard.blockedTasks.length}</span></h2>
    <ul class="entity-list">{#each dashboard.blockedTasks as task}<li><a href={projectHref(`/tasks/${task.id}`,projectSourceURL())}><code>{task.id}</code><span>{task.title}</span></a></li>{:else}<li class="muted">No blocked tasks right now.</li>{/each}</ul>
    <h3>Dependency issues</h3>
    <ul>{#each dashboard.dependencyIssues as issue}<li>{issue.taskId} references missing {issue.missingTaskId}</li>{:else}<li class="muted">No missing dependencies detected.</li>{/each}</ul>
  </section>

  <section class="panel" aria-labelledby="review-heading">
    <h2 id="review-heading">Ready for review <span>{dashboard.reviewTasks.length}</span></h2>
    <ul class="entity-list">{#each dashboard.reviewTasks as task}<li><a href={projectHref(`/tasks/${task.id}`,projectSourceURL())}><code>{task.id}</code><span>{task.title}</span></a></li>{:else}<li class="muted">No tasks waiting for review.</li>{/each}</ul>
    <h3>Critical path</h3>
    <ul class="entity-list">{#each dashboard.criticalPath as task}<li><a href={projectHref(`/tasks/${task.id}`,projectSourceURL())}><code>{task.id}</code><span>{task.title}</span></a></li>{:else}<li class="muted">No active critical path.</li>{/each}</ul>
  </section>

  <section class="panel" aria-labelledby="git-heading">
    <h2 id="git-heading">Local repository</h2>
    {#if workspace.shell.git.available}<p class="git-line"><GitBranch size={15} /><code>{workspace.shell.git.branch ?? "unknown"}</code><span class:warning={workspace.shell.git.dirty}>{workspace.shell.git.dirty ? "● Local changes" : "✓ Clean"}</span></p>{:else}<p class="muted">Git information unavailable.</p>{/if}
    <dl><div><dt>Memory home</dt><dd><code>{workspace.shell.project.memoryDir}</code></dd></div>{#if dashboard.currentState.updatedAt}<div><dt>Current state updated</dt><dd>{dashboard.currentState.updatedAt}</dd></div>{/if}</dl>
    <details><summary>Spec coverage ({dashboard.specs.length})</summary><ul class="entity-list">{#each dashboard.specs as spec}<li><a href={projectHref(`/specs/${spec.id}`,projectSourceURL())}><code>{spec.id}</code><span>{spec.linkedTaskCount} linked tasks</span></a></li>{/each}</ul></details>
  </section>

  <section class="panel" aria-labelledby="handoff-heading">
    <h2 id="handoff-heading">Recent handoff</h2>
    {#if dashboard.recentHandoff}<code>{dashboard.recentHandoff.id}</code><p>{dashboard.recentHandoff.title}</p><p class="muted">{dashboard.recentHandoff.summary}</p><time>{dashboard.recentHandoff.createdAt}</time>{:else}<p class="muted">No handoff exists yet.</p>{/if}
  </section>
</div>

<style>
  .focus-panel { padding: 1rem; background: var(--surface); border: 1px solid var(--border-subtle); border-radius: .25rem .25rem 0 0; }
  .eyebrow { margin: 0 0 .25rem; color: var(--text-muted); font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; }
  .focus-panel h2 { max-width: 64rem; margin: 0; font: 600 1.5rem/1.25 var(--display-font); overflow-wrap: anywhere; }
  .summary { max-width: 78rem; margin: .5rem 0 .75rem; color: var(--text-muted); }
  .active-links { display: flex; align-items: center; flex-wrap: wrap; gap: .25rem .5rem; font-size: .75rem; }
  .active-links a { color: var(--accent); font-family: var(--mono-font); min-height: 1.5rem; display: inline-flex; align-items: center; }
  .active-label { margin-left: .5rem; }
  .muted, time { color: var(--text-muted); }
  .stats-band { display: grid; grid-template-columns: repeat(7,minmax(0,1fr)); border: 1px solid var(--border-subtle); border-top: 0; background: var(--surface); margin-bottom: .75rem; }
  .stats-band a { display: flex; gap: .5rem; align-items: baseline; flex-wrap: wrap; padding: .625rem .75rem; text-decoration: none; border-right: 1px solid var(--border-subtle); }
  .stats-band a:last-child { border-right: 0; }
  .stats-band a:hover { background: var(--surface-raised); }
  .stats-band strong { font-size: 1.25rem; font-variant-numeric: tabular-nums; line-height: 1.2; }
  .stats-band span { color: var(--text-muted); font-size: .75rem; }
  .overview-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: .75rem; align-items: start; }
  .panel { min-width: 0; padding: .75rem 1rem; background: var(--surface); border: 1px solid var(--border-subtle); border-radius: .25rem; overflow-wrap: anywhere; }
  .panel h2 { display: flex; align-items: baseline; gap: .5rem; margin: 0 0 .625rem; font-size: .875rem; font-weight: 650; }
  .panel h2 span { color: var(--text-muted); font-weight: 400; font-variant-numeric: tabular-nums; }
  h3 { margin: .875rem 0 .5rem; font-size: .8125rem; }
  ul, ol { list-style: none; padding: 0; margin: 0; }
  li + li { border-top: 1px solid var(--border-subtle); }
  li { padding: .375rem 0; }
  .actions li { display: flex; align-items: start; gap: .5rem; }
  .actions :global(svg) { flex-shrink: 0; margin-top: .1875rem; color: var(--accent); }
  .entity-list a { display: flex; align-items: start; gap: .75rem; text-decoration: none; min-height: 1.5rem; }
  .entity-list a:hover { color: var(--accent); }
  .entity-list code { flex-shrink: 0; color: var(--accent); }
  code { font: .75rem/1.5 var(--mono-font); }
  dl { margin: .5rem 0; }
  dl div { display: flex; align-items: baseline; flex-wrap: wrap; justify-content: space-between; gap: .25rem .75rem; padding: .25rem 0; }
  dt { color: var(--text-muted); }
  dd { margin: 0; font-variant-numeric: tabular-nums; }
  .health, .git-line { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; margin: .5rem 0; }
  .health { color: var(--accent); }
  .warning { color: var(--warning); }
  details { margin-top: .75rem; border-top: 1px solid var(--border-subtle); padding-top: .5rem; }
  summary { color: var(--text-muted); cursor: pointer; min-height: 1.5rem; }
  summary:hover { color: var(--text); }
  time { font-size: .75rem; }
  @media (max-width: 1199px) { .stats-band a { display: grid; gap: .25rem; } }
  @media (max-width: 767px) { .overview-grid { grid-template-columns: minmax(0,1fr); } .stats-band { grid-template-columns: repeat(4,minmax(0,1fr)); } .stats-band a { border-bottom: 1px solid var(--border-subtle); padding: .5rem; } .focus-panel h2 { font-size: 1.25rem; } .panel { padding: .75rem; } }
</style>
