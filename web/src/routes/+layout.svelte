<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import {
    ChartNoAxesGantt,
    FolderKanban,
    LayoutDashboard,
    NotebookText,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
  } from "@lucide/svelte";
  import type { DashboardData } from "../../../src/services/dashboard.ts";

  let { data, children } = $props();

  const dashboard = $derived(data.dashboard as DashboardData);

  const navItems = [
    { href: "/", label: "Dash", caption: "Overview", icon: LayoutDashboard },
    { href: "/tasks", label: "Tasks", caption: "Kanban", icon: FolderKanban },
    { href: "/specs", label: "Specs", caption: "Intent", icon: NotebookText },
    { href: "/timeline", label: "Gantt", caption: "Timeline", icon: ChartNoAxesGantt },
  ];

  const activePath = $derived(page.url.pathname);
</script>

<svelte:head>
  <title>{dashboard.project.name} Workspace</title>
</svelte:head>

<div class="workspace-shell">
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark">
        <Sparkles size={16} strokeWidth={1.8} />
        <span>spm</span>
      </div>

      <div class="brand-copy">
        <p class="eyebrow">spec embryo</p>
        <h1>{dashboard.project.name}</h1>
        <p class="brand-summary">Project memory views with deterministic state underneath.</p>
      </div>
    </div>

    <nav class="nav-stack" aria-label="Workspace views">
      {#each navItems as item}
        {@const Icon = item.icon}
        <a class:active={activePath === item.href} href={item.href}>
          <span class="nav-badge">
            <Icon size={17} strokeWidth={1.9} />
          </span>
          <span class="nav-copy">
            <strong>{item.label}</strong>
            <small>{item.caption}</small>
          </span>
        </a>
      {/each}
    </nav>

    <div class="sidebar-note">
      <div class="sidebar-note-head">
        <p class="eyebrow">Memory home</p>
        <strong>{dashboard.project.memoryDir}</strong>
      </div>
      <p>{dashboard.currentState.summary}</p>
    </div>
  </aside>

  <div class="main-column">
    <header class="topbar">
      <div class="topbar-copy">
        <p class="eyebrow">Current focus</p>
        <h2>{dashboard.currentState.focus}</h2>
      </div>

      <div class="signal-row">
        <div class="signal-card">
          <NotebookText size={14} strokeWidth={1.9} />
          <span>Specs</span>
          <strong>{dashboard.counts.specs}</strong>
        </div>
        <div class="signal-card">
          <FolderKanban size={14} strokeWidth={1.9} />
          <span>In Progress</span>
          <strong>{dashboard.counts.inProgressTasks}</strong>
        </div>
        <div class="signal-card">
          <ChartNoAxesGantt size={14} strokeWidth={1.9} />
          <span>Blocked</span>
          <strong>{dashboard.counts.blockedTasks}</strong>
        </div>
        <div class="signal-card {dashboard.agents.ok ? 'signal-ok' : 'signal-warn'}">
          {#if dashboard.agents.ok}
            <ShieldCheck size={14} strokeWidth={1.9} />
          {:else}
            <ShieldAlert size={14} strokeWidth={1.9} />
          {/if}
          <span>AGENTS</span>
          <strong>{dashboard.agents.ok ? "Healthy" : "Watch"}</strong>
        </div>
      </div>
    </header>

    <main class="view-frame">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .workspace-shell {
    display: grid;
    grid-template-columns: 15.75rem minmax(0, 1fr);
    height: 100dvh;
    min-height: 100vh;
    max-height: 100dvh;
    overflow: hidden;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.95rem 0.8rem;
    border-right: 1px solid var(--line);
    background:
      linear-gradient(180deg, rgba(255, 252, 247, 0.96), rgba(247, 241, 232, 0.88));
    backdrop-filter: blur(18px);
    box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.45);
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .brand {
    display: grid;
    gap: 0.75rem;
  }

  .brand-mark {
    display: inline-grid;
    grid-auto-flow: column;
    align-items: center;
    justify-content: start;
    gap: 0.45rem;
    width: fit-content;
    padding: 0.45rem 0.7rem;
    border-radius: 999px;
    border: 1px solid rgba(24, 22, 18, 0.14);
    background: linear-gradient(135deg, rgba(15, 141, 96, 0.16), rgba(255, 255, 255, 0.76));
    box-shadow: var(--shadow-soft);
    font-family: var(--display-font);
    font-size: 1.05rem;
    text-transform: lowercase;
  }

  .brand-copy {
    display: grid;
    gap: 0.18rem;
  }

  .brand-summary {
    margin: 0;
    color: var(--muted);
    font-size: 0.83rem;
    line-height: 1.45;
  }

  .eyebrow {
    margin: 0 0 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.68rem;
    color: var(--muted);
  }

  h1,
  h2 {
    margin: 0;
    font-family: var(--display-font);
    line-height: 1;
  }

  h1 {
    font-size: 1.2rem;
  }

  h2 {
    font-size: clamp(1.35rem, 2vw, 2rem);
    max-width: 58rem;
  }

  .nav-stack {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .nav-stack a {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.58rem 0.62rem;
    border-radius: 1.05rem;
    text-decoration: none;
    border: 1px solid transparent;
    transition:
      transform 120ms ease,
      border-color 120ms ease,
      background 120ms ease,
      box-shadow 120ms ease;
  }

  .nav-stack a:hover,
  .nav-stack a.active {
    transform: translateX(1px);
    border-color: rgba(24, 22, 18, 0.12);
    background: rgba(255, 255, 255, 0.76);
    box-shadow: var(--shadow-soft);
  }

  .nav-stack a.active {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(248, 244, 237, 0.92));
    border-color: rgba(24, 22, 18, 0.18);
  }

  .nav-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 0.85rem;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.86);
    color: var(--muted-soft);
    flex-shrink: 0;
  }

  .nav-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .nav-copy strong {
    font-size: 0.9rem;
    line-height: 1.1;
  }

  .nav-copy small,
  .sidebar-note p {
    color: var(--muted);
  }

  .sidebar-note {
    margin-top: auto;
    display: grid;
    gap: 0.45rem;
    padding: 0.82rem;
    border-radius: 1.15rem;
    border: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(250, 245, 237, 0.78));
    box-shadow: var(--shadow-soft);
  }

  .sidebar-note-head {
    display: grid;
    gap: 0.1rem;
  }

  .sidebar-note strong {
    font-size: 0.86rem;
    line-height: 1.35;
  }

  .main-column {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    height: 100%;
    overflow: hidden;
    padding: 0.95rem 1.15rem 1.15rem;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 5;
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: start;
    margin: -0.95rem -1.15rem 0;
    padding: 0.95rem 1.15rem 1.1rem;
    background:
      linear-gradient(180deg, rgba(241, 235, 223, 0.94), rgba(241, 235, 223, 0.82) 70%, rgba(241, 235, 223, 0));
    backdrop-filter: blur(10px);
  }

  .topbar-copy {
    display: grid;
    gap: 0.18rem;
  }

  .signal-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(7.25rem, 1fr));
    gap: 0.55rem;
  }

  .signal-card {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-areas:
      "icon label"
      "icon value";
    column-gap: 0.55rem;
    padding: 0.8rem 0.9rem;
    border-radius: 1.05rem;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.76);
    min-width: 0;
    box-shadow: var(--shadow-soft);
  }

  .signal-card :global(svg) {
    grid-area: icon;
    align-self: center;
    color: var(--muted-soft);
  }

  .signal-card span {
    grid-area: label;
    display: block;
    margin-bottom: 0.2rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
  }

  .signal-card strong {
    grid-area: value;
    font-family: var(--display-font);
    font-size: 1.2rem;
    line-height: 1;
  }

  .signal-ok {
    background: var(--accent-soft);
  }

  .signal-warn {
    background: var(--warning-soft);
  }

  .view-frame {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-top: 1.1rem;
  }

  .sidebar,
  .view-frame {
    scrollbar-gutter: stable;
  }

  @media (max-width: 1024px) {
    .workspace-shell {
      grid-template-columns: 13.75rem minmax(0, 1fr);
    }

    .signal-row {
      grid-template-columns: repeat(2, minmax(8rem, 1fr));
    }
  }

  @media (max-width: 860px) {
    .workspace-shell {
      grid-template-columns: 1fr;
      height: auto;
      max-height: none;
      overflow: visible;
    }

    .sidebar {
      border-right: 0;
      border-bottom: 1px solid var(--line);
      overflow: visible;
    }

    .main-column {
      height: auto;
      overflow: visible;
    }

    .topbar {
      position: static;
      flex-direction: column;
      margin: 0 0 1.1rem;
      padding: 0;
      background: none;
      backdrop-filter: none;
    }

    .view-frame {
      overflow: visible;
      padding-top: 0;
    }
  }
</style>
