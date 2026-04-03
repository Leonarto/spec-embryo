<script lang="ts">
  import {
    ArrowRight,
    Blocks,
    ChartNoAxesGantt,
    Clock3,
    FolderKanban,
    GitBranch,
    NotebookText,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Target,
  } from "@lucide/svelte";
  import type { DashboardData } from "../../../src/services/dashboard.ts";

  let { data } = $props();
  const dashboard = $derived(data.dashboard as DashboardData);
</script>

<svelte:head>
  <title>{dashboard.project.name} Dash</title>
</svelte:head>

<section class="hero-grid">
  <article class="hero-card">
    <div class="hero-head">
      <div>
        <p class="eyebrow">Workspace overview</p>
        <h3>Dash</h3>
      </div>
      <span class="icon-seal">
        <Sparkles size={18} strokeWidth={1.9} />
      </span>
    </div>

    <p class="hero-copy">{dashboard.currentState.summary}</p>

    <div class="chip-row">
      <span class="chip chip-accent">
        <NotebookText size={13} strokeWidth={1.9} />
        {dashboard.project.memoryDir}
      </span>
      {#if dashboard.git.available}
        <span class="chip">
          <GitBranch size={13} strokeWidth={1.9} />
          {dashboard.git.branch ?? "unknown"} · {dashboard.git.dirty ? "dirty" : "clean"}
        </span>
      {/if}
      <span class="chip">
        <NotebookText size={13} strokeWidth={1.9} />
        {dashboard.counts.specs} specs
      </span>
      <span class="chip">
        <FolderKanban size={13} strokeWidth={1.9} />
        {dashboard.counts.tasks} tasks
      </span>
    </div>
  </article>

  <article class="stats-card">
    <div class="stats-grid">
      <div>
        <span>Active specs</span>
        <strong>{dashboard.counts.activeSpecs}</strong>
      </div>
      <div>
        <span>In progress</span>
        <strong>{dashboard.counts.inProgressTasks}</strong>
      </div>
      <div>
        <span>Blocked</span>
        <strong>{dashboard.counts.blockedTasks}</strong>
      </div>
      <div>
        <span>Review</span>
        <strong>{dashboard.counts.reviewTasks}</strong>
      </div>
      <div>
        <span>Ready</span>
        <strong>{dashboard.counts.readyTasks}</strong>
      </div>
    </div>
  </article>
</section>

<section class="dashboard-grid">
  <article class="panel panel-wide">
    <div class="panel-head">
      <div class="panel-title">
        <span class="icon-seal icon-soft">
          <Target size={16} strokeWidth={1.9} />
        </span>
        <div>
          <p class="eyebrow">Current state</p>
          <h3>Focus and next actions</h3>
        </div>
      </div>
    </div>

    <div class="focus-grid">
      <div class="focus-card">
        <div class="mini-head">
          <Target size={14} strokeWidth={1.9} />
          <h4>Focus</h4>
        </div>
        <p>{dashboard.currentState.focus}</p>
      </div>
      <div class="focus-card">
        <div class="mini-head">
          <NotebookText size={14} strokeWidth={1.9} />
          <h4>Active specs</h4>
        </div>
        <div class="chip-row">
          {#each dashboard.currentState.activeSpecIds as specId}
            <span class="chip">{specId}</span>
          {/each}
        </div>
      </div>
      <div class="focus-card">
        <div class="mini-head">
          <FolderKanban size={14} strokeWidth={1.9} />
          <h4>Active tasks</h4>
        </div>
        <div class="chip-row">
          {#each dashboard.currentState.activeTaskIds as taskId}
            <span class="chip">{taskId}</span>
          {/each}
        </div>
      </div>
    </div>

    <ol class="action-list">
      {#each dashboard.nextActions as action}
        <li>
          <ArrowRight size={14} strokeWidth={2} />
          <span>{action}</span>
        </li>
      {/each}
    </ol>
  </article>

  <article class="panel">
    <div class="panel-head">
      <div class="panel-title">
        <span class="icon-seal icon-soft">
          {#if dashboard.agents.ok}
            <ShieldCheck size={16} strokeWidth={1.9} />
          {:else}
            <ShieldAlert size={16} strokeWidth={1.9} />
          {/if}
        </span>
        <div>
          <p class="eyebrow">Agents</p>
          <h3>AGENTS health</h3>
        </div>
      </div>
    </div>
    <div class="health-card {dashboard.agents.ok ? 'ok' : 'warn'}">
      <strong>{dashboard.agents.ok ? "Healthy" : "Needs attention"}</strong>
      <p>max file {dashboard.agents.maxFileTokens} · max chain {dashboard.agents.maxChainTokens}</p>
    </div>
    {#if dashboard.agents.failures.length > 0}
      <ul class="notes-list">
        {#each dashboard.agents.failures as failure}
          <li>{failure}</li>
        {/each}
      </ul>
    {/if}
  </article>

  <article class="panel">
    <div class="panel-head">
      <div class="panel-title">
        <span class="icon-seal icon-soft">
          <Clock3 size={16} strokeWidth={1.9} />
        </span>
        <div>
          <p class="eyebrow">Resume</p>
          <h3>Recent handoff</h3>
        </div>
      </div>
    </div>
    {#if dashboard.recentHandoff}
      <div class="focus-card">
        <div class="mini-head">
          <Clock3 size={14} strokeWidth={1.9} />
          <h4>{dashboard.recentHandoff.id}</h4>
        </div>
        <p>{dashboard.recentHandoff.title}</p>
        <small>{dashboard.recentHandoff.createdAt}</small>
      </div>
    {:else}
      <p class="empty">No handoff exists yet.</p>
    {/if}
  </article>

  <article class="panel">
    <div class="panel-head">
      <div class="panel-title">
        <span class="icon-seal icon-soft">
          <Blocks size={16} strokeWidth={1.9} />
        </span>
        <div>
          <p class="eyebrow">Execution</p>
          <h3>Blocked work</h3>
        </div>
      </div>
    </div>
    {#if dashboard.blockedTasks.length === 0}
      <p class="empty">No blocked tasks right now.</p>
    {:else}
      <ul class="notes-list">
        {#each dashboard.blockedTasks as task}
          <li>{task.id} · {task.title}</li>
        {/each}
      </ul>
    {/if}
  </article>

  <article class="panel">
    <div class="panel-head">
      <div class="panel-title">
        <span class="icon-seal icon-soft">
          <ChartNoAxesGantt size={16} strokeWidth={1.9} />
        </span>
        <div>
          <p class="eyebrow">Execution</p>
          <h3>Critical path</h3>
        </div>
      </div>
    </div>
    <ul class="notes-list">
      {#each dashboard.criticalPath as task}
        <li>{task.id} · {task.title}</li>
      {/each}
    </ul>
  </article>

  <article class="panel panel-wide">
    <div class="panel-head">
      <div class="panel-title">
        <span class="icon-seal icon-soft">
          <Sparkles size={16} strokeWidth={1.9} />
        </span>
        <div>
          <p class="eyebrow">What does not fit elsewhere</p>
          <h3>Signals and notes</h3>
        </div>
      </div>
    </div>

    <div class="signal-grid">
      <div class="focus-card">
        <div class="mini-head">
          <ArrowRight size={14} strokeWidth={2} />
          <h4>Current-state hints</h4>
        </div>
        <ul class="notes-list">
          {#each dashboard.currentState.nextActionHints as hint}
            <li>{hint}</li>
          {/each}
        </ul>
      </div>

      <div class="focus-card">
        <div class="mini-head">
          <Blocks size={14} strokeWidth={1.9} />
          <h4>Dependency issues</h4>
        </div>
        {#if dashboard.dependencyIssues.length === 0}
          <p>No missing dependencies detected.</p>
        {:else}
          <ul class="notes-list">
            {#each dashboard.dependencyIssues as issue}
              <li>{issue.taskId} references missing {issue.missingTaskId}</li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="focus-card">
        <div class="mini-head">
          <NotebookText size={14} strokeWidth={1.9} />
          <h4>Spec coverage snapshot</h4>
        </div>
        <ul class="notes-list">
          {#each dashboard.specs as spec}
            <li>{spec.id} · {spec.linkedTaskCount} linked tasks</li>
          {/each}
        </ul>
      </div>
    </div>
  </article>
</section>

<style>
  .eyebrow {
    margin: 0 0 0.35rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.68rem;
    color: var(--muted);
  }

  h3,
  h4 {
    margin: 0;
    font-family: var(--display-font);
  }

  h3 {
    font-size: clamp(1.55rem, 1.8vw, 2rem);
  }

  h4 {
    font-size: 1.02rem;
  }

  .hero-grid,
  .dashboard-grid,
  .focus-grid,
  .signal-grid,
  .stats-grid,
  .chip-row {
    display: grid;
    gap: 0.9rem;
  }

  .hero-grid {
    grid-template-columns: 1.45fr 1fr;
    margin-bottom: 1rem;
  }

  .hero-card,
  .stats-card,
  .panel,
  .focus-card {
    border-radius: var(--radius-xl);
    border: 1px solid var(--line);
    background: var(--panel);
    box-shadow: var(--shadow);
  }

  .hero-card,
  .stats-card,
  .panel {
    padding: 1rem;
  }

  .hero-head,
  .panel-head,
  .panel-title,
  .mini-head {
    display: flex;
    align-items: center;
  }

  .hero-head,
  .panel-head {
    justify-content: space-between;
    gap: 0.8rem;
  }

  .panel-title,
  .mini-head {
    gap: 0.55rem;
  }

  .icon-seal {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 0.95rem;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.84);
    color: var(--muted-soft);
    flex-shrink: 0;
  }

  .icon-soft {
    width: 2rem;
    height: 2rem;
    background: rgba(255, 255, 255, 0.72);
  }

  .hero-copy,
  .focus-card p,
  .empty,
  .notes-list,
  .action-list,
  .health-card p,
  .focus-card small,
  .stats-card span {
    color: var(--muted);
    line-height: 1.45;
  }

  .chip-row {
    grid-template-columns: repeat(auto-fit, minmax(8rem, max-content));
    align-items: start;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border-radius: 999px;
    padding: 0.34rem 0.65rem;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.9);
    font-size: 0.75rem;
    box-shadow: var(--shadow-soft);
  }

  .chip-accent {
    background: var(--accent-soft);
  }

  .stats-card {
    background: linear-gradient(180deg, var(--panel-strong), rgba(248, 242, 233, 0.92));
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  }

  .stats-grid div {
    padding: 0.8rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.78);
  }

  .stats-grid strong {
    display: block;
    margin-top: 0.2rem;
    font-family: var(--display-font);
    font-size: 1.55rem;
  }

  .dashboard-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .panel-wide {
    grid-column: span 2;
  }

  .focus-grid,
  .signal-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .focus-card {
    display: grid;
    gap: 0.75rem;
    padding: 0.9rem;
    background: rgba(255, 255, 255, 0.58);
    box-shadow: var(--shadow-soft);
  }

  .action-list,
  .notes-list {
    margin: 0;
    padding-left: 0;
    list-style: none;
  }

  .action-list {
    display: grid;
    gap: 0.7rem;
    margin-top: 0.95rem;
  }

  .action-list li {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.55rem;
    align-items: start;
    padding: 0.75rem 0.8rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.62);
    box-shadow: var(--shadow-soft);
  }

  .notes-list {
    display: grid;
    gap: 0.55rem;
  }

  .notes-list li {
    padding: 0.7rem 0.78rem;
    border-radius: var(--radius-lg);
    border: 1px solid rgba(24, 22, 18, 0.08);
    background: rgba(255, 255, 255, 0.52);
  }

  .health-card {
    padding: 0.9rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.76);
    box-shadow: var(--shadow-soft);
  }

  .health-card.ok {
    background: var(--accent-soft);
  }

  .health-card.warn {
    background: var(--warning-soft);
  }

  @media (max-width: 1040px) {
    .hero-grid,
    .dashboard-grid,
    .focus-grid,
    .signal-grid {
      grid-template-columns: 1fr;
    }

    .panel-wide {
      grid-column: span 1;
    }
  }
</style>
