<script lang="ts">
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
    ListFilter,
    Orbit,
    TimerReset,
  } from "@lucide/svelte";
  import type { DashboardData, DashboardTimelineMode } from "../../../../src/services/dashboard.ts";
  import AnalysisFilters from "../../lib/components/AnalysisFilters.svelte";

  let { data } = $props();
  const dashboard = $derived(data.dashboard as DashboardData);

  const totalUnits = $derived(Math.max(dashboard.timeline.totalUnits, 1));
  const ruler = $derived(Array.from({ length: totalUnits }, (_, index) => index + 1));
  const currentSearch = $derived(page.url.searchParams);

  function timelineModeHref(mode: DashboardTimelineMode): string {
    const params = new URLSearchParams(currentSearch);
    params.set("timeline_mode", mode);
    const search = params.toString();
    return search.length > 0 ? `/timeline?${search}` : "/timeline";
  }
</script>

<svelte:head>
  <title>{dashboard.project.name} Timeline</title>
</svelte:head>

<section class="view-header">
  <div class="header-copy">
    <p class="eyebrow">Deterministic sequence</p>
    <h3>Compact Gantt</h3>
  </div>
  <p class="intro">
    This denser planning surface keeps dependency order and relative effort deterministic, but compresses the scan path so many more rows can fit on screen without turning into generic dashboard clutter.
  </p>
</section>

<AnalysisFilters
  {dashboard}
  title="Timeline slice filters"
  detail="Use spec sets and lifecycle windows to shape the planning slice, then switch between active-only and include-completed display modes below."
/>

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
              <div class="group-head sticky-pane">
                <div class="group-copy">
              <div class="group-topline">
                <p class="group-id">{group.specId}</p>
                <div class="group-meta">
                  <span class="mini-pill neutral">{group.rows.length} rows</span>
                  <span class={`mini-pill status ${group.specStatus}`}>{group.specStatus}</span>
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
              <div class="planner-row">
                <div class="row-label sticky-pane">
                  <div class="task-copy">
                    <div class="row-topline">
                      <a class="task-id" href={`/tasks/${row.taskId}`}>
                        <FolderKanban size={13} strokeWidth={1.9} />
                        {row.taskId}
                      </a>
                      <div class="row-meta-pills">
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
                    <strong class="task-title" data-title={row.title} title={row.title}>
                      <span class="task-title-text">{row.title}</span>
                    </strong>
                    <div class="spec-links">
                      {#each row.specIds as specId}
                        <a href={`/specs/${specId}`}>{specId}</a>
                      {/each}
                    </div>
                  </div>
                </div>

                <div class="row-grid" style={`--total:${totalUnits}`}>
                  <div class="bar-lane">
                    <div
                      class={`timeline-bar ${row.effectiveStatus} ${row.archivedAt ? "archived" : ""}`}
                      style={`left:${(row.start / totalUnits) * 100}%; width:${Math.max(((row.end - row.start) / totalUnits) * 100, 2.4)}%`}
                    >
                      <span>{row.start}</span>
                      <span class="bar-fill"></span>
                      <span>{row.end}</span>
                    </div>
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
  .view-header,
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

  .header-copy,
  .mode-copy,
  .group-copy,
  .task-copy,
  .planner-body,
  .group-shell {
    display: grid;
    gap: 0.35rem;
  }

  .view-header {
    justify-content: space-between;
    align-items: end;
    margin-bottom: 1rem;
  }

  .eyebrow,
  .group-id {
    margin: 0 0 0.28rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.68rem;
    color: var(--muted);
  }

  h3,
  h4,
  p {
    margin: 0;
  }

  h3,
  h4 {
    font-family: var(--display-font);
  }

  h3 {
    font-size: clamp(1.55rem, 1.8vw, 2rem);
  }

  h4 {
    font-size: 1.16rem;
  }

  .intro,
  .mode-copy p,
  .timeline-empty,
  .row-notes {
    color: var(--muted);
    line-height: 1.45;
  }

  .mode-shell,
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

  .icon-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.85rem;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.84);
    color: var(--muted-soft);
    flex-shrink: 0;
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
    background: rgba(255, 255, 255, 0.84);
    box-shadow: var(--shadow-soft);
  }

  .mode-toggle a.active {
    border-color: rgba(15, 141, 96, 0.22);
    background: rgba(15, 141, 96, 0.1);
  }

  .timeline-empty {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.9rem 1rem;
    border-radius: var(--radius-lg);
    border: 1px dashed var(--line-strong);
    background: rgba(255, 255, 255, 0.62);
  }

  .planner-head,
  .planner-row {
    min-width: 68rem;
  }

  .empty-group {
    display: flex;
    min-width: 68rem;
    border-bottom: 1px solid rgba(24, 22, 18, 0.06);
  }

  .planner-head {
    position: sticky;
    top: 0;
    z-index: 2;
    background: rgba(247, 241, 232, 0.92);
    border-bottom: 1px solid var(--line);
    backdrop-filter: blur(12px);
  }

  .sticky-pane {
    width: 24rem;
    min-width: 24rem;
    flex-shrink: 0;
    background: rgba(250, 245, 238, 0.96);
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
    border-bottom: 1px solid rgba(24, 22, 18, 0.08);
  }

  .group-head {
    padding-top: 1rem;
    padding-bottom: 0.9rem;
    border-bottom: 1px solid rgba(24, 22, 18, 0.08);
    background: linear-gradient(180deg, rgba(255, 254, 250, 0.98), rgba(245, 238, 227, 0.94));
    box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.5);
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
  .task-copy strong,
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
    background: rgba(255, 255, 255, 0.86);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.34) inset,
      var(--status-glow, var(--shadow-soft));
    font-size: 0.71rem;
    line-height: 1.1;
  }

  .mini-pill.neutral,
  .cell-meta.neutral {
    border-color: rgba(24, 22, 18, 0.1);
    background: rgba(255, 255, 255, 0.8);
    --status-glow: 0 10px 20px rgba(24, 22, 18, 0.05);
  }

  .planner-row {
    align-items: stretch;
    border-bottom: 1px solid rgba(24, 22, 18, 0.06);
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
    cursor: default;
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
    border: 1px solid rgba(24, 22, 18, 0.14);
    background: rgba(255, 252, 247, 0.98);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.5) inset,
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
      0 0 0 1px rgba(255, 255, 255, 0.34) inset,
      var(--status-glow, 0 10px 22px rgba(24, 22, 18, 0.05));
  }

  .mini-pill.status.active,
  .status-pill.in_progress {
    background: rgba(15, 141, 96, 0.14);
    border-color: rgba(15, 141, 96, 0.22);
    color: #0d6e4b;
    --status-glow: 0 0 0 1px rgba(255, 255, 255, 0.34) inset, 0 0 18px rgba(15, 141, 96, 0.16);
  }

  .mini-pill.status.proposed {
    background: rgba(70, 107, 202, 0.12);
    border-color: rgba(70, 107, 202, 0.2);
    color: #3456a0;
    --status-glow: 0 0 0 1px rgba(255, 255, 255, 0.34) inset, 0 0 18px rgba(70, 107, 202, 0.14);
  }

  .mini-pill.status.paused {
    background: rgba(125, 96, 58, 0.14);
    border-color: rgba(125, 96, 58, 0.22);
    color: #755733;
    --status-glow: 0 0 0 1px rgba(255, 255, 255, 0.34) inset, 0 0 18px rgba(125, 96, 58, 0.14);
  }

  .mini-pill.status.done,
  .status-pill.done {
    background: rgba(17, 122, 84, 0.12);
    border-color: rgba(17, 122, 84, 0.18);
    color: #0c6d4a;
    --status-glow: 0 0 0 1px rgba(255, 255, 255, 0.34) inset, 0 0 16px rgba(17, 122, 84, 0.12);
  }

  .mini-pill.status.archived,
  .status-pill.cancelled {
    background: rgba(117, 92, 58, 0.14);
    border-color: rgba(117, 92, 58, 0.18);
    color: #6e5434;
    --status-glow: 0 0 0 1px rgba(255, 255, 255, 0.34) inset, 0 0 16px rgba(117, 92, 58, 0.12);
  }

  .status-pill.review {
    background: rgba(143, 84, 33, 0.14);
    border-color: rgba(143, 84, 33, 0.22);
    color: #8f5421;
    --status-glow: 0 0 0 1px rgba(255, 255, 255, 0.34) inset, 0 0 18px rgba(143, 84, 33, 0.16);
  }

  .status-pill.blocked {
    background: rgba(151, 45, 45, 0.12);
    border-color: rgba(151, 45, 45, 0.22);
    color: #8d2d2d;
    --status-glow: 0 0 0 1px rgba(255, 255, 255, 0.34) inset, 0 0 18px rgba(151, 45, 45, 0.16);
  }

  .status-pill.todo {
    background: rgba(84, 78, 67, 0.1);
    border-color: rgba(84, 78, 67, 0.14);
    color: #5d5549;
    --status-glow: 0 0 0 1px rgba(255, 255, 255, 0.34) inset, 0 0 14px rgba(84, 78, 67, 0.08);
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
      linear-gradient(90deg, rgba(24, 22, 18, 0.05) 1px, transparent 1px),
      rgba(255, 255, 255, 0.66);
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
    .view-header,
    .mode-shell {
      flex-direction: column;
      align-items: start;
    }
  }
</style>
