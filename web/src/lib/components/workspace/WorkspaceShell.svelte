<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { page } from "$app/state";
  import { ChartNoAxesGantt, ChevronsLeft, ChevronsRight, FolderKanban, GitBranch, LayoutDashboard, NotebookText, Settings2 } from "@lucide/svelte";
  import IconButton from "../IconButton.svelte";
  import ColorModeControl from "../ColorModeControl.svelte";
  import { THEME_STORAGE_KEY, normalizeColorMode, resolveTheme, type ColorMode, type ResolvedTheme } from "../../theme.ts";
  import { WORKSPACE_PREFERENCES_KEY, parseWorkspacePreferences, isWorkspaceRoute, workspaceRouteLabel, type RailMode } from "../../workspace-preferences.ts";

  let { project, git, children }: {
    project: { name: string; memoryDir: string };
    git: { available: boolean; branch?: string; dirty: boolean };
    children: Snippet;
  } = $props();
  const navItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/tasks", label: "Tasks", icon: FolderKanban },
    { href: "/specs", label: "Specs", icon: NotebookText },
    { href: "/timeline", label: "Timeline", icon: ChartNoAxesGantt },
  ];
  let rail = $state<RailMode>("collapsed");
  let colorMode = $state<ColorMode>("system");
  let resolvedTheme = $state<ResolvedTheme>("dark");
  let settingsOpen = $state(false);
  let settingsElement: HTMLDivElement;
  let settingsTrigger: HTMLButtonElement;
  let ready = $state(false);
  const routeLabel = $derived(workspaceRouteLabel(page.url.pathname));

  function readStored(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
  function store(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Session preferences remain usable when storage is unavailable. */ } }
  function applyTheme(mode: ColorMode) {
    colorMode = mode;
    resolvedTheme = resolveTheme(mode, typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)").matches : null);
    document.documentElement.dataset.colorMode = mode;
    document.documentElement.dataset.theme = resolvedTheme;
    store(THEME_STORAGE_KEY, mode);
  }
  function toggleRail() {
    rail = rail === "collapsed" ? "expanded" : "collapsed";
    document.documentElement.dataset.rail = rail;
    store(WORKSPACE_PREFERENCES_KEY, JSON.stringify({ version: 1, rail }));
  }
  function closeSettings(restoreFocus = false) {
    settingsOpen = false;
    if (restoreFocus) settingsTrigger?.focus();
  }
  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && settingsOpen) { event.preventDefault(); closeSettings(true); }
  }
  function onPointerdown(event: PointerEvent) {
    if (settingsOpen && event.target instanceof Node && !settingsElement?.contains(event.target)) closeSettings();
  }
  onMount(() => {
    rail = parseWorkspacePreferences(readStored(WORKSPACE_PREFERENCES_KEY)).rail;
    document.documentElement.dataset.rail = rail;
    applyTheme(normalizeColorMode(readStored(THEME_STORAGE_KEY)));
    ready = true;
    const media = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
    const update = () => { if (colorMode === "system") applyTheme("system"); };
    media?.addEventListener("change", update);
    return () => media?.removeEventListener("change", update);
  });
</script>

<svelte:window onkeydown={onKeydown} onpointerdown={onPointerdown} />
<a class="skip-link" href="#workspace-content">Skip to content</a>
<div class="workspace-shell">
  <aside class="sidebar" aria-label="Workspace navigation">
    <a class="brand" href="/" aria-label="Spec Embryo overview"><span>spm</span><span class="expanded-label brand-label">spec embryo</span></a>
    <nav class="nav-stack" aria-label="Workspace views">
      {#each navItems as item}
        {@const Icon = item.icon}
        {@const active = isWorkspaceRoute(page.url.pathname, item.href)}
        <a class:active href={`${item.href}${page.url.search}`} aria-current={active ? "page" : undefined} aria-label={item.label} title={item.label}>
          <Icon size={18} strokeWidth={1.9} /><span class="expanded-label">{item.label}</span>
        </a>
      {/each}
    </nav>
    <div class="rail-footer">
      <div class="settings-anchor" bind:this={settingsElement}>
        <button class="settings-trigger" bind:this={settingsTrigger} type="button" disabled={!ready} aria-label="Workspace preferences" title="Workspace preferences" aria-expanded={settingsOpen} aria-controls="workspace-preferences" onclick={() => settingsOpen = !settingsOpen}>
          <Settings2 size={18} /><span class="expanded-label">Preferences</span>
        </button>
        {#if settingsOpen}
          <section class="preferences-popover" id="workspace-preferences" aria-label="Workspace preferences">
            <h2>Appearance</h2>
            <ColorModeControl mode={colorMode} {resolvedTheme} onSelect={applyTheme} />
            <p class="memory-home">Memory home <code>{project.memoryDir}</code></p>
          </section>
        {/if}
      </div>
      <div class="rail-toggle"><IconButton label={rail === "collapsed" ? "Expand navigation" : "Collapse navigation"} onclick={toggleRail} expanded={rail === "expanded"} disabled={!ready}>
        {#if rail === "collapsed"}<ChevronsRight size={18} />{:else}<ChevronsLeft size={18} />{/if}
      </IconButton></div>
    </div>
  </aside>
  <div class="main-column">
    <header class="topbar">
      <div class="breadcrumb"><strong title={project.name}>{project.name}</strong><span aria-hidden="true">/</span><span>{routeLabel}</span></div>
      <div class="workspace-status">
        {#if git.available}<span class="branch"><GitBranch size={13} />{git.branch ?? "unknown"}</span><span class:dirty={git.dirty} class="git-status">{git.dirty ? "● Local changes" : "✓ Clean"}</span>{/if}
      </div>
    </header>
    <main class="view-frame" id="workspace-content" tabindex="-1">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .workspace-shell { display: grid; grid-template-columns: 3.5rem minmax(0, 1fr); height: 100dvh; min-height: 0; overflow: hidden; }
  :global(html[data-rail="expanded"]) .workspace-shell { grid-template-columns: 11.5rem minmax(0, 1fr); }
  .sidebar { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--border-subtle); background: var(--canvas); }
  .brand { display: flex; align-items: center; gap: .75rem; min-height: 2.75rem; padding: 0 .5rem; text-decoration: none; white-space: nowrap; color: var(--accent); }
  .brand > span:first-child { min-width: 2.5rem; text-align: center; font: 700 1.0625rem/1 var(--display-font); }
  .brand-label { font-size: .75rem; }
  .expanded-label { display: none; }
  :global(html[data-rail="expanded"]) .expanded-label { display: inline; }
  .nav-stack { display: flex; flex-direction: column; gap: .25rem; padding: .25rem .5rem; overflow-y: auto; min-height: 0; }
  .nav-stack a { position: relative; display: flex; flex-shrink: 0; align-items: center; gap: .75rem; min-height: 2.5rem; padding: .5rem; border-radius: .25rem; color: var(--text-muted); text-decoration: none; white-space: nowrap; }
  .nav-stack a :global(svg) { flex-shrink: 0; }
  .nav-stack a:hover { background: var(--surface-raised); color: var(--text); }
  .nav-stack a.active { background: var(--selection-bg); color: var(--accent); box-shadow: inset 3px 0 var(--accent); }
  .rail-footer { margin-top: auto; display: grid; padding: .5rem; gap: .25rem; }
  .settings-trigger { display: flex; align-items: center; gap: .75rem; width: 100%; min-height: 2.5rem; padding: .5rem; border: 0; border-radius: .25rem; background: var(--canvas); color: var(--text-muted); cursor: pointer; }
  .settings-trigger:hover { background: var(--surface-raised); color: var(--text); }
  .rail-toggle { display: flex; justify-content: center; }
  .preferences-popover { position: fixed; z-index: 30; bottom: 3.25rem; left: 3.5rem; width: 17rem; padding: .75rem; border: 1px solid var(--border-control); border-radius: .375rem; background: var(--surface); box-shadow: var(--shadow-overlay); }
  :global(html[data-rail="expanded"]) .preferences-popover { left: 11.5rem; }
  .preferences-popover h2 { margin: 0 0 .75rem; font-size: .875rem; }
  .memory-home { display: grid; gap: .25rem; margin: .75rem 0 0; color: var(--text-muted); font-size: .75rem; }
  code { font-family: var(--mono-font); overflow-wrap: anywhere; }
  .main-column { display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: hidden; }
  .topbar { display: flex; flex-shrink: 0; align-items: center; justify-content: space-between; gap: .75rem; min-height: 2.75rem; padding: .3125rem .75rem; border-bottom: 1px solid var(--border-subtle); background: var(--surface); }
  .breadcrumb, .workspace-status, .branch { display: flex; align-items: center; gap: .75rem; min-width: 0; }
  .breadcrumb strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .breadcrumb > span { white-space: nowrap; }
  .breadcrumb > span:first-of-type, .branch { color: var(--text-muted); }
  .branch { gap: .25rem; font: .75rem var(--mono-font); }
  .git-status { font-size: .75rem; white-space: nowrap; color: var(--text-muted); }
  .git-status.dirty { color: var(--warning); }
  .view-frame { flex: 1; min-width: 0; min-height: 0; padding: .75rem; overflow: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
  .skip-link { position: fixed; z-index: 50; top: .5rem; left: 4rem; transform: translateY(-200%); padding: .5rem .75rem; background: var(--surface); border: 1px solid var(--border-control); border-radius: .25rem; }
  .skip-link:focus { transform: none; }
  @media (min-width: 768px) and (max-width: 1199px) {
    :global(html[data-rail="expanded"]) .workspace-shell { grid-template-columns: 3.5rem minmax(0, 1fr); }
    :global(html[data-rail="expanded"]) .expanded-label { display: none; }
    :global(html[data-rail="expanded"]) .preferences-popover { left: 3.5rem; }
    .rail-toggle { display: none; }
  }
  @media (max-width: 767px) {
    .workspace-shell, :global(html[data-rail="expanded"]) .workspace-shell { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
    .sidebar { flex-direction: row; align-items: center; border-right: 0; border-bottom: 1px solid var(--border-subtle); }
    .brand { padding: 0 .25rem; }
    .brand > span:first-child { min-width: 2rem; }
    .nav-stack { flex: 1; flex-direction: row; justify-content: center; padding: .125rem; gap: .125rem; overflow: visible; }
    .nav-stack a { min-width: 2.75rem; min-height: 2.75rem; justify-content: center; padding: .5rem; }
    :global(html[data-rail="expanded"]) .expanded-label, .expanded-label { display: none; }
    .rail-footer { display: block; margin: 0; padding: .125rem; }
    .settings-trigger { min-width: 2.75rem; min-height: 2.75rem; justify-content: center; }
    .rail-toggle { display: none; }
    .preferences-popover, :global(html[data-rail="expanded"]) .preferences-popover { top: 3.25rem; right: .5rem; bottom: auto; left: auto; max-width: calc(100vw - 1rem); }
    .branch, .git-status { display: none; }
    .topbar { gap: .5rem; }
    .breadcrumb { gap: .5rem; }
    .breadcrumb strong { max-width: 9rem; }
    .view-frame { padding: .75rem; }
  }
</style>
