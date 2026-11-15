<script lang="ts">
  import ViewToolbar from "../../lib/components/ViewToolbar.svelte";
  import { page } from "$app/state";
  import {
    Archive,
    ArrowRight,
    ChartNoAxesGantt,
    ChevronRight,
    Clock3,
    Filter,
    FolderKanban,
    GitBranchPlus,
    Link2,
    ListFilter,
    Orbit,
    Radar,
    Sparkles,
    TimerReset,
    X,
  } from "@lucide/svelte";
  import type { DashboardTimelineMode } from "../../../../src/services/dashboard.ts";
  import type { WorkspaceEnvelope } from "../../../../src/services/workspace.ts";
  import { normalizeViewQuery, serializeViewQuery } from "../../../../src/services/workspace-query.ts";
  import { useWorkspaceResource } from "../../lib/workspace/resource.svelte.ts";
  import AnalysisFilters from "../../lib/components/AnalysisFilters.svelte";

  let { data } = $props();
  const resource=useWorkspaceResource(()=>data.workspace as WorkspaceEnvelope<'timeline'>);
  const workspace=$derived(resource.snapshot);
  const dashboard=$derived(workspace.data);

  const totalUnits = $derived(Math.max(dashboard.timeline.totalUnits, 1));
  const ruler = $derived(Array.from({ length: totalUnits }, (_, index) => index + 1));
  const currentSearch = $derived(page.url.searchParams);

  function timelineModeHref(mode: DashboardTimelineMode): string {
    const view=normalizeViewQuery('timeline',currentSearch);view.timeline!.mode=mode;
    return `/timeline?${serializeViewQuery(view)}`;
  }
  function timelineSelectionHref(taskId: string): string {
    const view=normalizeViewQuery('timeline',currentSearch);
    view.timeline!.selectedTaskId=dashboard.timeline.selection?.taskId===taskId?undefined:taskId;
    return `/timeline?${serializeViewQuery(view)}`;
  }
  function clearTimelineSelectionHref(): string {
    const view=normalizeViewQuery('timeline',currentSearch);view.timeline!.selectedTaskId=undefined;
    return `/timeline?${serializeViewQuery(view)}`;
  }
</script>

<svelte:head>
  <title>{workspace.shell.project.name} Timeline</title>
</svelte:head>

<ViewToolbar title="Timeline" count={dashboard.timeline.taskCount} />

<AnalysisFilters filters={dashboard.filters} route="timeline" title="Timeline filters" resultCount={dashboard.timeline.taskCount} resultLabel="timeline rows" />

<section class="mode-shell">
  <div class="mode-copy">
    <div class="mode-head">
      <span class="icon-pill">
        <ListFilter size={15} strokeWidth={1.9} />
      </span>
      <div>
        <p class="eyebrow">Display mode</p>
        <h4>Planning horizon</h4>
      </div>
    </div>
    <p>
      `Active only` keeps the planner focused on live execution. `Include completed` lets finished and cancelled work recede into the same grouped timeline for broader planning context.
    </p>
  </div>

  <div class="mode-toggle">
    <a class:active={dashboard.timeline.mode === "active"} href={timelineModeHref("active")}>
      <Orbit size={14} strokeWidth={1.9} />
      Active only
    </a>
    <a class:active={dashboard.timeline.mode === "all"} href={timelineModeHref("all")}>
      <Archive size={14} strokeWidth={1.9} />
      Include completed
    </a>
  </div>
</section>

{#if dashboard.timeline.selection}
  <section class="selection-shell">
    <div class="selection-head">
      <div class="mode-head">
        <span class="icon-pill selection-pill">
          <Radar size={15} strokeWidth={1.9} />
        </span>
        <div>
          <p class="eyebrow">Selected task</p>
          <h4>{dashboard.timeline.selection.taskId} · {dashboard.timeline.selection.title}</h4>
        </div>
      </div>

      <a class="clear-selection" href={clearTimelineSelectionHref()}>
        <X size={13} strokeWidth={2} />
        Clear trace
      </a>
    </div>

    <p class="selection-copy">
      The planner is showing upstream dependencies, downstream dependents, and the subset of downstream work that is currently blocked. Related spec groups stay visible so cross-spec entanglement is easy to scan.
    </p>

    <div class="selection-metrics">
      <span class="cell-meta dependency">
        <Link2 size={12} strokeWidth={1.9} />
        {dashboard.timeline.selection.directDependencyIds.length} direct deps
      </span>
      <span class="cell-meta dependency-soft">
        <Sparkles size={12} strokeWidth={1.9} />
        {dashboard.timeline.selection.transitiveDependencyIds.length} transitive deps
      </span>
      <span class="cell-meta dependent">
        <ArrowRight size={12} strokeWidth={1.9} />
        {dashboard.timeline.selection.directDependentIds.length} direct dependents
      </span>
      <span class="cell-meta dependent-soft">
        <Sparkles size={12} strokeWidth={1.9} />
        {dashboard.timeline.selection.transitiveDependentIds.length} transitive dependents
      </span>
      <span class="cell-meta blocked">
        <ArrowRight size={12} strokeWidth={1.9} />
        {dashboard.timeline.selection.directBlockedDependentIds.length} direct blocked
      </span>
      <span class="cell-meta blocked-soft">
        <Sparkles size={12} strokeWidth={1.9} />
        {dashboard.timeline.selection.transitiveBlockedDependentIds.length} transitive blocked
      </span>
    </div>

    <div class="selection-specs">
      <div class="selection-spec-group">
        <p class="eyebrow">Directly related specs</p>
        <div class="chip-row">
          {#if dashboard.timeline.selection.directRelatedSpecIds.length === 0}
            <span class="mini-pill neutral">none</span>
          {:else}
            {#each dashboard.timeline.selection.directRelatedSpecIds as specId}
              <a class="mini-pill spec-direct" href={`/specs/${specId}`}>{specId}</a>
            {/each}
          {/if}
        </div>
      </div>

      <div class="selection-spec-group">
        <p class="eyebrow">Transitively related specs</p>
        <div class="chip-row">
          {#if dashboard.timeline.selection.transitiveRelatedSpecIds.length === 0}
            <span class="mini-pill neutral">none</span>
          {:else}
            {#each dashboard.timeline.selection.transitiveRelatedSpecIds as specId}
              <a class="mini-pill spec-transitive" href={`/specs/${specId}`}>{specId}</a>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  </section>
{/if}

<section class="timeline-shell">
  {#if dashboard.timeline.groups.length === 0}
    <div class="timeline-empty">
      <TimerReset size={16} strokeWidth={1.9} />
      <span>No timeline rows matched the current filters and display mode.</span>
    </div>
  {:else}
    <div class="planner-head">
      <div class="pane-head sticky-pane">
        <span>Spec sequence</span>
      </div>
      <div class="grid-head" style={`--total:${totalUnits}`}>
        {#each ruler as unit}
          <span>{unit}</span>
        {/each}
      </div>
    </div>

    <div class="planner-body">
      {#each dashboard.timeline.groups as group}
        <section class="group-shell">
              <div class={`group-head sticky-pane ${group.selectionState}`}>
                <div class="group-copy">
              <div class="group-topline">
                <p class="group-id">{group.specId}</p>
                <div class="group-meta">
                  <span class="mini-pill neutral">{group.rows.length} rows</span>
                  <span class={`mini-pill status ${group.specStatus}`}>{group.specStatus}</span>
                  {#if group.selectionState === "related_direct"}
                    <span class="mini-pill spec-direct">direct</span>
                  {:else if group.selectionState === "related_transitive"}
                    <span class="mini-pill spec-transitive">transitive</span>
                  {:else if group.selectionState === "selected"}
                    <span class="mini-pill selected-pill">selected</span>
                  {/if}
                </div>
              </div>
              <h4><a href={`/specs/${group.specId}`} title={group.specTitle}>{group.specTitle}</a></h4>
                </div>
              </div>

          {#if group.rows.length === 0}
            <div class="empty-group">
              <div class="empty-group-label sticky-pane">
                <span class="mini-pill">No rows in this mode</span>
              </div>
              <div class="empty-group-copy">
                <span>
                  <Filter size={12} strokeWidth={1.9} />
                  This spec is selected, but no tasks match the current display mode and filters.
                </span>
              </div>
            </div>
          {:else}
            {#each group.rows as row}
              <div class={`planner-row ${row.selectionState}`}>
                <div class={`row-label sticky-pane ${row.selectionState}`}>
                  <div class="task-copy">
                    <div class="row-topline">
                      <a class="task-id" href={`/tasks/${row.taskId}`}>
                        <FolderKanban size={13} strokeWidth={1.9} />
                        {row.taskId}
                      </a>
                      <div class="row-meta-pills">
                        {#if dashboard.timeline.selection && row.isCrossSpecRelated}
                          <span class="cell-meta spec-direct">
                            <Link2 size={12} strokeWidth={1.9} />
                            cross-spec
                          </span>
                        {/if}
                        <span class={`status-pill ${row.effectiveStatus}`}>{row.statusLabel}</span>
                        <span class="cell-meta neutral">
                          <Clock3 size={12} strokeWidth={1.9} />
                          {row.effort}u
                        </span>
                        <span class="cell-meta neutral">
                          <GitBranchPlus size={12} strokeWidth={1.9} />
                          {row.dependencyCount}
                        </span>
                      </div>
                    </div>
                    <a class={`task-title ${row.selectionState}`} data-title={row.title} title={row.title} href={timelineSelectionHref(row.taskId)}>
                      <span class="task-title-text">{row.title}</span>
                    </a>
                    <div class="spec-links">
                      {#each row.specIds as specId}
                        <a href={`/specs/${specId}`}>{specId}</a>
                      {/each}
                    </div>
                  </div>
                </div>

                <div class="row-grid" style={`--total:${totalUnits}`}>
                  <div class="bar-lane">
                    <a
                      class={`timeline-bar ${row.effectiveStatus} ${row.selectionState} ${row.archivedAt ? "archived" : ""}`}
                      href={timelineSelectionHref(row.taskId)}
                      style={`left:${(row.start / totalUnits) * 100}%; width:${Math.max(((row.end - row.start) / totalUnits) * 100, 2.4)}%`}
                    >
                      <span>{row.start}</span>
                      <span class="bar-fill"></span>
                      <span>{row.end}</span>
                    </a>
                  </div>

                  <div class="row-notes">
                    <span>
                      <ArrowRight size={12} strokeWidth={1.9} />
                      {row.start} -> {row.end}
                    </span>
                    {#if row.archivedAt}
                      <span class="note-archived">
                        <Archive size={12} strokeWidth={1.9} />
                        archived
                      </span>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        </section>
      {/each}
    </div>
  {/if}
</section>

<style>
  .mode-shell,
  .planner-head,
  .planner-row,
  .group-head,
  .mode-head,
  .mode-toggle,
  .pane-head,
  .row-notes {
    display: flex;
    gap: 1rem;
  }

  .mode-copy,
  .group-copy,
  .task-copy,
  .planner-body,
  .group-shell {
    display: grid;
    gap: 0.35rem;
  }


  .eyebrow,
  .group-id {
    margin: 0 0 0.28rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.68rem;
    color: var(--muted);
  }

  h4,
  p {
    margin: 0;
  }

  h4 {
    font-family: var(--display-font);
  }


  h4 {
    font-size: 1.16rem;
  }

  .mode-copy p,
  .timeline-empty,
  .row-notes {
    color: var(--muted);
    line-height: 1.45;
  }

  .mode-shell,
  .selection-shell,
  .timeline-shell {
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--line);
    background: var(--panel);
    box-shadow: var(--shadow);
  }

  .mode-shell {
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
  }

  .selection-shell,
  .selection-specs,
  .selection-spec-group {
    display: grid;
    gap: 0.8rem;
  }

  .selection-shell {
    background:
      radial-gradient(circle at top right, color-mix(in srgb, var(--info) 16%, transparent), transparent 18rem),
      linear-gradient(180deg, var(--surface-overlay), var(--surface-hero));
  }

  .selection-head,
  .selection-metrics {
    display: flex;
    gap: 0.7rem;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .selection-copy {
    color: var(--muted);
    line-height: 1.5;
  }

  .icon-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.85rem;
    border: 1px solid var(--line);
    background: var(--surface-interactive);
    color: var(--muted-soft);
    flex-shrink: 0;
  }

  .selection-pill {
    color: var(--info-ink);
    border-color: var(--info-strong-soft);
    background: var(--info-soft);
  }

  .clear-selection {
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
    padding: 0.52rem 0.74rem;
    border-radius: 999px;
    text-decoration: none;
    border: 1px solid var(--line);
    background: var(--surface-interactive);
    color: var(--muted-soft);
    box-shadow: var(--shadow-soft);
  }

  .mode-toggle {
    flex-wrap: wrap;
  }

  .mode-toggle a {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.68rem 0.9rem;
    border-radius: 999px;
    text-decoration: none;
    border: 1px solid var(--line);
    background: var(--surface-interactive);
    box-shadow: var(--shadow-soft);
  }

  .mode-toggle a.active {
    border-color: var(--accent-border);
    background: var(--accent-soft);
  }

  .timeline-empty {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.9rem 1rem;
    border-radius: var(--radius-lg);
    border: 1px dashed var(--line-strong);
    background: var(--surface-card-subtle);
  }

  .planner-head,
  .planner-row {
    min-width: 68rem;
  }

  .empty-group {
    display: flex;
    min-width: 68rem;
    border-bottom: 1px solid var(--line);
  }

  .planner-head {
    position: sticky;
    top: 0;
    z-index: 2;
    background: color-mix(in srgb, var(--surface-overlay) 94%, transparent);
    border-bottom: 1px solid var(--line);
    backdrop-filter: blur(12px);
  }

  .sticky-pane {
    width: 24rem;
    min-width: 24rem;
    flex-shrink: 0;
    background: var(--surface-overlay);
  }

  .pane-head,
  .group-head,
  .empty-group-label {
    padding: 0.72rem 0.8rem;
    border-right: 1px solid var(--line);
  }

  .group-head,
  .empty-group-label {
    align-items: flex-start;
  }

  .pane-head {
    align-items: center;
    color: var(--muted);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .grid-head {
    display: grid;
    grid-template-columns: repeat(var(--total), minmax(2.2rem, 1fr));
    gap: 0;
    align-items: center;
    flex: 1;
    padding: 0.72rem 0;
  }

  .grid-head span {
    display: inline-flex;
    justify-content: center;
    color: var(--muted);
    font-size: 0.72rem;
  }

  .timeline-shell {
    overflow: auto;
  }

  .planner-body {
    gap: 0;
  }

  .group-shell {
    gap: 0;
    border-bottom: 1px solid var(--line);
  }

  .group-head {
    padding-top: 1rem;
    padding-bottom: 0.9rem;
    border-bottom: 1px solid var(--line);
    background: linear-gradient(180deg, var(--surface-overlay-strong), var(--surface-hero));
    box-shadow: inset 0 -1px 0 var(--inset-highlight);
  }

  .group-head.selected {
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--accent-soft) 92%, var(--surface-overlay)), color-mix(in srgb, var(--accent-soft) 70%, var(--surface-hero)));
  }

  .group-head.related_direct {
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--info-soft) 92%, var(--surface-overlay)), color-mix(in srgb, var(--info-soft) 70%, var(--surface-hero)));
  }

  .group-head.related_transitive {
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--info-soft) 70%, var(--surface-overlay)), color-mix(in srgb, var(--info-soft) 44%, var(--surface-hero)));
  }

  .group-topline,
  .row-topline,
  .row-label,
  .group-meta {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.7rem;
  }

  .group-topline,
  .row-topline {
    width: 100%;
  }

  .group-meta,
  .row-meta-pills {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.38rem;
  }

  .group-copy a,
  .task-id,
  .spec-links a {
    text-decoration: none;
  }

  .group-copy a:hover,
  .task-id:hover,
  .spec-links a:hover {
    color: var(--accent);
  }

  .mini-pill,
  .status-pill,
  .cell-meta {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border-radius: 999px;
    padding: 0.18rem 0.48rem;
    border: 1px solid var(--line);
    background: var(--surface-interactive);
    box-shadow:
      0 0 0 1px var(--inset-highlight) inset,
      var(--status-glow, var(--shadow-soft));
    font-size: 0.71rem;
    line-height: 1.1;
  }

  .mini-pill.neutral,
  .cell-meta.neutral {
    border-color: var(--neutral-strong-soft);
    background: var(--surface-card-soft);
    --status-glow: 0 10px 20px rgba(24, 22, 18, 0.05);
  }

  .mini-pill.selected-pill {
    background: var(--accent-soft);
    border-color: var(--accent-border);
    color: var(--accent-ink);
  }

  .mini-pill.spec-direct,
  .cell-meta.spec-direct {
    background: var(--info-soft);
    border-color: var(--info-strong-soft);
    color: var(--info-ink);
    --status-glow: 0 0 0 1px var(--inset-highlight) inset, 0 0 18px rgba(70, 107, 202, 0.14);
  }

  .mini-pill.spec-transitive {
    background: color-mix(in srgb, var(--info-soft) 72%, transparent);
    border-color: color-mix(in srgb, var(--info) 22%, transparent);
    color: var(--info-ink);
  }

  .cell-meta.dependency {
    background: var(--info-soft);
    border-color: var(--info-strong-soft);
    color: var(--info-ink);
  }

  .cell-meta.dependency-soft {
    background: color-mix(in srgb, var(--info-soft) 72%, transparent);
    border-color: color-mix(in srgb, var(--info) 22%, transparent);
    color: var(--info-ink);
  }

  .cell-meta.dependent {
    background: var(--warning-soft);
    border-color: var(--warning-border);
    color: var(--warning-ink);
  }

  .cell-meta.dependent-soft {
    background: color-mix(in srgb, var(--warning-soft) 72%, transparent);
    border-color: color-mix(in srgb, var(--warning) 22%, transparent);
    color: var(--warning-ink);
  }

  .cell-meta.blocked {
    background: var(--danger-soft);
    border-color: var(--danger-border);
    color: var(--danger-ink);
  }

  .cell-meta.blocked-soft {
    background: color-mix(in srgb, var(--danger-soft) 72%, transparent);
    border-color: color-mix(in srgb, var(--danger) 22%, transparent);
    color: var(--danger-ink);
  }

  .planner-row {
    align-items: stretch;
    border-bottom: 1px solid var(--line);
    transition: opacity 140ms ease;
  }

  .planner-row.dimmed {
    opacity: 0.38;
  }

  .empty-group-copy {
    display: inline-flex;
    align-items: center;
    padding: 0 0.8rem;
    color: var(--muted);
    font-size: 0.78rem;
  }

  .empty-group-copy span {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .row-label {
    display: block;
    min-height: 3.35rem;
    padding: 0.72rem 0.95rem 0.72rem 0.85rem;
    transition:
      background 140ms ease,
      box-shadow 140ms ease,
      opacity 140ms ease;
  }

  .row-label.selected {
    background: var(--accent-soft);
    box-shadow: inset -2px 0 0 var(--accent-border);
  }

  .row-label.dependency,
  .row-label.dependency_transitive {
    background: color-mix(in srgb, var(--info-soft) 68%, transparent);
  }

  .row-label.dependent,
  .row-label.dependent_transitive {
    background: color-mix(in srgb, var(--warning-soft) 68%, transparent);
  }

  .row-label.blocked_dependent,
  .row-label.blocked_dependent_transitive {
    background: color-mix(in srgb, var(--danger-soft) 68%, transparent);
  }

  .task-copy {
    min-width: 0;
    width: 100%;
  }

  .task-id {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
    color: var(--muted-soft);
    font-size: 0.76rem;
  }

  .task-title {
    display: block;
    position: relative;
    cursor: pointer;
    min-width: 0;
    max-width: 100%;
    font-family: var(--body-font);
    font-size: 0.92rem;
    font-weight: 600;
    line-height: 1.25;
  }

  .task-title-text {
    display: block;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .task-title.selected {
    color: var(--accent-ink);
  }

  .task-title.dependency,
  .task-title.dependency_transitive {
    color: var(--info-ink);
  }

  .task-title.dependent,
  .task-title.dependent_transitive {
    color: var(--warning-ink);
  }

  .task-title.blocked_dependent,
  .task-title.blocked_dependent_transitive {
    color: var(--danger-ink);
  }

  .task-title::after {
    content: attr(data-title);
    position: absolute;
    left: 0;
    top: calc(100% + 0.45rem);
    z-index: 6;
    width: max-content;
    max-width: min(28rem, 72vw);
    padding: 0.55rem 0.7rem;
    border-radius: 0.85rem;
    border: 1px solid var(--line-strong);
    background: var(--surface-tooltip);
    box-shadow:
      0 0 0 1px var(--inset-highlight) inset,
      0 18px 40px rgba(24, 22, 18, 0.14);
    color: var(--ink);
    font-size: 0.82rem;
    font-weight: 500;
    line-height: 1.35;
    white-space: normal;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-0.15rem);
    transition:
      opacity 120ms ease,
      transform 120ms ease;
  }

  .task-title:hover::after {
    opacity: 1;
    transform: translateY(0);
  }

  .spec-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.38rem;
    margin-top: 0.2rem;
    font-size: 0.74rem;
    color: var(--muted);
  }

  .status-pill {
    box-shadow:
      0 0 0 1px var(--inset-highlight) inset,
      var(--status-glow, 0 10px 22px rgba(24, 22, 18, 0.05));
  }

  .mini-pill.status.active,
  .status-pill.in_progress {
    background: var(--accent-strong-soft);
    border-color: var(--accent-border);
    color: var(--accent-ink);
    --status-glow: 0 0 0 1px var(--inset-highlight) inset, 0 0 18px rgba(15, 141, 96, 0.16);
  }

  .mini-pill.status.proposed {
    background: var(--info-soft);
    border-color: var(--info-strong-soft);
    color: var(--info-ink);
    --status-glow: 0 0 0 1px var(--inset-highlight) inset, 0 0 18px rgba(70, 107, 202, 0.14);
  }

  .mini-pill.status.paused {
    background: var(--warning-soft);
    border-color: var(--warning-border);
    color: var(--warning-ink);
    --status-glow: 0 0 0 1px var(--inset-highlight) inset, 0 0 18px rgba(125, 96, 58, 0.14);
  }

  .mini-pill.status.done,
  .status-pill.done {
    background: var(--accent-soft);
    border-color: var(--accent-border);
    color: var(--accent-ink);
    --status-glow: 0 0 0 1px var(--inset-highlight) inset, 0 0 16px rgba(17, 122, 84, 0.12);
  }

  .mini-pill.status.archived,
  .status-pill.cancelled {
    background: var(--neutral-soft);
    border-color: var(--neutral-strong-soft);
    color: var(--neutral-ink);
    --status-glow: 0 0 0 1px var(--inset-highlight) inset, 0 0 16px rgba(117, 92, 58, 0.12);
  }

  .status-pill.review {
    background: var(--warning-soft);
    border-color: var(--warning-border);
    color: var(--warning-ink);
    --status-glow: 0 0 0 1px var(--inset-highlight) inset, 0 0 18px rgba(143, 84, 33, 0.16);
  }

  .status-pill.blocked {
    background: var(--danger-soft);
    border-color: var(--danger-border);
    color: var(--danger-ink);
    --status-glow: 0 0 0 1px var(--inset-highlight) inset, 0 0 18px rgba(151, 45, 45, 0.16);
  }

  .status-pill.todo {
    background: var(--neutral-soft);
    border-color: var(--neutral-strong-soft);
    color: var(--neutral-ink);
    --status-glow: 0 0 0 1px var(--inset-highlight) inset, 0 0 14px rgba(84, 78, 67, 0.08);
  }

  .status-pill.done,
  .status-pill.cancelled {
    opacity: 0.92;
  }

  .row-grid {
    position: relative;
    display: grid;
    align-items: center;
    grid-template-columns: 1fr auto;
    gap: 0.75rem;
    min-height: 3.35rem;
    padding-right: 0.8rem;
    flex: 1;
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--ink) 6%, transparent) 1px, transparent 1px),
      var(--surface-grid);
    background-size: calc(100% / var(--total)) 100%;
    transition:
      background 140ms ease,
      opacity 140ms ease;
  }

  .planner-row.selected .row-grid {
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--accent) 10%, transparent) 1px, transparent 1px),
      var(--surface-grid-selected);
    background-size: calc(100% / var(--total)) 100%;
  }

  .planner-row.dependency .row-grid,
  .planner-row.dependency_transitive .row-grid {
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--info) 9%, transparent) 1px, transparent 1px),
      var(--surface-grid-info);
    background-size: calc(100% / var(--total)) 100%;
  }

  .planner-row.dependent .row-grid,
  .planner-row.dependent_transitive .row-grid {
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--warning) 9%, transparent) 1px, transparent 1px),
      var(--surface-grid-warning);
    background-size: calc(100% / var(--total)) 100%;
  }

  .planner-row.blocked_dependent .row-grid,
  .planner-row.blocked_dependent_transitive .row-grid {
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--danger) 9%, transparent) 1px, transparent 1px),
      var(--surface-grid-danger);
    background-size: calc(100% / var(--total)) 100%;
  }

  .bar-lane {
    position: relative;
    height: 100%;
  }

  .timeline-bar {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 1.05rem;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0 0.38rem;
    border-radius: 999px;
    border: 1px solid rgba(24, 22, 18, 0.12);
    background: rgba(24, 22, 18, 0.12);
    box-shadow: var(--shadow-soft);
    font-size: 0.68rem;
    white-space: nowrap;
    text-decoration: none;
    color: inherit;
    transition:
      opacity 140ms ease,
      transform 140ms ease,
      box-shadow 140ms ease,
      border-color 140ms ease;
  }

  .timeline-bar .bar-fill {
    flex: 1;
    min-width: 1rem;
  }

  .timeline-bar.in_progress {
    background: rgba(15, 141, 96, 0.2);
    border-color: rgba(15, 141, 96, 0.25);
  }

  .timeline-bar.review {
    background: rgba(143, 84, 33, 0.18);
    border-color: rgba(143, 84, 33, 0.24);
  }

  .timeline-bar.blocked {
    background: rgba(151, 45, 45, 0.16);
    border-color: rgba(151, 45, 45, 0.24);
  }

  .timeline-bar.done,
  .timeline-bar.cancelled {
    opacity: 0.6;
  }

  .timeline-bar.archived {
    box-shadow: inset 0 0 0 1px rgba(143, 84, 33, 0.15), var(--shadow-soft);
  }

  .timeline-bar.selected {
    transform: translateY(-50%) scaleY(1.08);
    border-color: rgba(15, 141, 96, 0.34);
    box-shadow: 0 0 0 1px rgba(15, 141, 96, 0.14), 0 18px 28px rgba(15, 141, 96, 0.18);
  }

  .timeline-bar.dependency {
    background: rgba(70, 107, 202, 0.2);
    border-color: rgba(70, 107, 202, 0.28);
    box-shadow: 0 14px 24px rgba(70, 107, 202, 0.12);
  }

  .timeline-bar.dependency_transitive {
    background: rgba(70, 107, 202, 0.12);
    border-color: rgba(70, 107, 202, 0.18);
    box-shadow: 0 12px 20px rgba(70, 107, 202, 0.08);
  }

  .timeline-bar.dependent {
    background: rgba(143, 84, 33, 0.18);
    border-color: rgba(143, 84, 33, 0.26);
    box-shadow: 0 14px 24px rgba(143, 84, 33, 0.12);
  }

  .timeline-bar.dependent_transitive {
    background: rgba(143, 84, 33, 0.11);
    border-color: rgba(143, 84, 33, 0.18);
    box-shadow: 0 12px 20px rgba(143, 84, 33, 0.08);
  }

  .timeline-bar.blocked_dependent {
    background: rgba(151, 45, 45, 0.18);
    border-color: rgba(151, 45, 45, 0.28);
    box-shadow: 0 14px 24px rgba(151, 45, 45, 0.12);
  }

  .timeline-bar.blocked_dependent_transitive {
    background: rgba(151, 45, 45, 0.11);
    border-color: rgba(151, 45, 45, 0.18);
    box-shadow: 0 12px 20px rgba(151, 45, 45, 0.08);
  }

  .timeline-bar.dimmed {
    opacity: 0.38;
  }

  .row-notes {
    align-items: center;
    color: var(--muted);
    font-size: 0.74rem;
    white-space: nowrap;
  }

  .row-notes span {
    display: inline-flex;
    align-items: center;
    gap: 0.28rem;
  }

  .note-archived {
    color: var(--warning);
  }

  @media (max-width: 980px) {
      .mode-shell {
      flex-direction: column;
      align-items: start;
    }
  }
</style>
