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
      <div class="meta-head sticky-pane">
        <span>Row</span>
        <span>Status</span>
        <span>Effort</span>
        <span>Deps</span>
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
              <p class="group-id">{group.specId}</p>
              <h4><a href={`/specs/${group.specId}`}>{group.specTitle}</a></h4>
            </div>
            <div class="group-meta">
              <span class="mini-pill">{group.rows.length} rows</span>
              <span class="mini-pill">{group.specStatus}</span>
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
                    <a class="task-id" href={`/tasks/${row.taskId}`}>
                      <FolderKanban size={13} strokeWidth={1.9} />
                      {row.taskId}
                    </a>
                    <strong>{row.title}</strong>
                    <div class="spec-links">
                      {#each row.specIds as specId}
                        <a href={`/specs/${specId}`}>{specId}</a>
                      {/each}
                    </div>
                  </div>
                  <span class={`status-pill ${row.effectiveStatus}`}>{row.statusLabel}</span>
                  <span class="cell-meta">
                    <Clock3 size={12} strokeWidth={1.9} />
                    {row.effort}u
                  </span>
                  <span class="cell-meta">
                    <GitBranchPlus size={12} strokeWidth={1.9} />
                    {row.dependencyCount}
                  </span>
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
  .meta-head,
  .row-label,
  .group-meta,
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
    font-size: 1rem;
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

  .meta-head,
  .row-label,
  .group-head,
  .empty-group-label {
    align-items: center;
    padding: 0.72rem 0.8rem;
    border-right: 1px solid var(--line);
  }

  .meta-head {
    color: var(--muted);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .meta-head span:nth-child(1),
  .row-label .task-copy {
    flex: 1.7;
    min-width: 0;
  }

  .meta-head span:nth-child(2),
  .row-label .status-pill {
    width: 6rem;
    justify-content: center;
  }

  .meta-head span:nth-child(3),
  .meta-head span:nth-child(4),
  .row-label .cell-meta {
    width: 4.1rem;
    justify-content: center;
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
    justify-content: space-between;
    padding-top: 1rem;
    padding-bottom: 0.9rem;
    border-bottom: 1px solid rgba(24, 22, 18, 0.08);
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
    padding: 0.28rem 0.58rem;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.86);
    box-shadow: var(--shadow-soft);
    font-size: 0.74rem;
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
    gap: 0.6rem;
    min-height: 3.35rem;
  }

  .task-copy {
    min-width: 0;
  }

  .task-id {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
    color: var(--muted-soft);
    font-size: 0.76rem;
    margin-bottom: 0.18rem;
  }

  .task-copy strong {
    display: block;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .spec-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.38rem;
    margin-top: 0.2rem;
    font-size: 0.74rem;
    color: var(--muted);
  }

  .status-pill.review {
    background: rgba(143, 84, 33, 0.16);
  }

  .status-pill.in_progress {
    background: var(--accent-soft);
  }

  .status-pill.blocked {
    background: var(--danger-soft);
  }

  .status-pill.done,
  .status-pill.cancelled {
    opacity: 0.7;
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
