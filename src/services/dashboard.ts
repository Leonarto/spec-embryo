import { buildTaskAnalysisIndex, buildTaskIndex, deriveNextActions, deriveStatusSnapshot, summarizeTaskNode, type TaskAnalysisIndex } from "../engine.ts";
import { loadProjectContext } from "../repository.ts";
import { buildAgentsHealthReport } from "./agents.ts";

export type EffectiveTaskStatus = "todo" | "in_progress" | "blocked" | "review" | "done" | "cancelled";
export type DashboardKanbanColumnId = "blocked" | "todo" | "in_progress" | "review" | "done";
export type DashboardTimeWindow = "7d" | "30d" | "90d";
export type DashboardTimelineMode = "active" | "all";
export type DashboardTimelineRowSelectionState =
  | "none"
  | "selected"
  | "dependency"
  | "dependency_transitive"
  | "dependent"
  | "dependent_transitive"
  | "blocked_dependent"
  | "blocked_dependent_transitive"
  | "dimmed";
export type DashboardTimelineGroupSelectionState = "none" | "selected" | "related_direct" | "related_transitive";

export interface DashboardFilterOptions {
  selectedSpecIds?: string[];
  timeWindow?: DashboardTimeWindow;
  timelineMode?: DashboardTimelineMode;
  selectedTimelineTaskId?: string;
}

export interface DashboardTaskCard {
  id: string;
  title: string;
  summary: string;
  rawStatus: string;
  effectiveStatus: EffectiveTaskStatus;
  priority: number;
  specIds: string[];
  dependsOn: string[];
  unmetDependencies: string[];
  downstreamCount: number;
  effort: number;
  completedAt?: string;
  cancelledAt?: string;
  archivedAt?: string;
  archiveReason?: string;
}

export interface DashboardSpecCard {
  id: string;
  title: string;
  summary: string;
  status: string;
  taskIds: string[];
  linkedTaskCount: number;
  progress: {
    todo: number;
    inProgress: number;
    blocked: number;
    review: number;
    done: number;
    cancelled: number;
    completionRatio: number;
  };
}

export interface DashboardKanbanColumn {
  id: DashboardKanbanColumnId;
  title: string;
  tasks: DashboardTaskCard[];
}

export interface DashboardTimelineItem {
  taskId: string;
  title: string;
  effectiveStatus: EffectiveTaskStatus;
  specIds: string[];
  effort: number;
  start: number;
  end: number;
  priority: number;
}

export interface DashboardTimelineRow extends DashboardTimelineItem {
  statusLabel: string;
  primarySpecId: string;
  dependencyCount: number;
  archivedAt?: string;
  selectionState: DashboardTimelineRowSelectionState;
  isCrossSpecRelated: boolean;
}

export interface DashboardTimelineGroup {
  specId: string;
  specTitle: string;
  specStatus: string;
  selectionState: DashboardTimelineGroupSelectionState;
  rows: DashboardTimelineRow[];
}

export interface DashboardTimelineSelection {
  taskId: string;
  title: string;
  primarySpecId: string;
  specIds: string[];
  directDependencyIds: string[];
  transitiveDependencyIds: string[];
  directDependentIds: string[];
  transitiveDependentIds: string[];
  directBlockedDependentIds: string[];
  transitiveBlockedDependentIds: string[];
  directRelatedSpecIds: string[];
  transitiveRelatedSpecIds: string[];
}

export interface DashboardAnalysisState {
  selectedSpecIds: string[];
  timeWindow?: DashboardTimeWindow;
  timelineMode: DashboardTimelineMode;
  selectedTimelineTaskId?: string;
  availableSpecs: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  hasActiveFilters: boolean;
  includesArchived: boolean;
  filteredTaskCount: number;
}

export interface DashboardData {
  project: {
    name: string;
    memoryDir: string;
  };
  currentState: {
    summary: string;
    focus: string;
    activeSpecIds: string[];
    activeTaskIds: string[];
    nextActionHints: string[];
    updatedAt?: string;
  };
  counts: {
    specs: number;
    tasks: number;
    activeSpecs: number;
    inProgressTasks: number;
    reviewTasks: number;
    blockedTasks: number;
    readyTasks: number;
  };
  nextActions: string[];
  git: {
    available: boolean;
    branch?: string;
    dirty: boolean;
  };
  agents: {
    ok: boolean;
    maxFileTokens: number;
    maxChainTokens: number;
    failures: string[];
  };
  specs: DashboardSpecCard[];
  tasks: DashboardTaskCard[];
  analysisTasks: DashboardTaskCard[];
  inProgressTasks: DashboardTaskCard[];
  readyTasks: DashboardTaskCard[];
  blockedTasks: DashboardTaskCard[];
  reviewTasks: DashboardTaskCard[];
  criticalPath: DashboardTaskCard[];
  kanban: DashboardKanbanColumn[];
  timeline: {
    totalUnits: number;
    items: DashboardTimelineItem[];
    groups: DashboardTimelineGroup[];
    mode: DashboardTimelineMode;
    selection?: DashboardTimelineSelection;
  };
  recentHandoff?: {
    id: string;
    title: string;
    summary: string;
    createdAt: string;
  };
  dependencyIssues: Array<{ taskId: string; missingTaskId: string }>;
  analysis: DashboardAnalysisState;
}

function formatTaskStatusLabel(status: EffectiveTaskStatus): string {
  return status.replaceAll("_", " ");
}

export function deriveEffectiveStatus(rawStatus: string, unmetDependencies: string[]): EffectiveTaskStatus {
  if (rawStatus === "done" || rawStatus === "cancelled" || rawStatus === "in_progress" || rawStatus === "blocked" || rawStatus === "review") {
    return rawStatus;
  }

  return unmetDependencies.length > 0 ? "blocked" : "todo";
}

function deriveEffort(priority: number, downstreamCount: number): number {
  const base = priority <= 1 ? 5 : priority === 2 ? 3 : 2;
  return Math.min(8, base + Math.min(2, downstreamCount));
}

export function toTaskCard(task: Parameters<typeof summarizeTaskNode>[0], index: ReturnType<typeof buildTaskIndex>, analysis?: TaskAnalysisIndex): DashboardTaskCard {
  const summary = summarizeTaskNode(task, index, analysis);
  const effectiveStatus = deriveEffectiveStatus(task.status, summary.unmetDependencies);
  const effort = deriveEffort(task.priority, summary.downstreamCount);

  return {
    id: task.id,
    title: task.title,
    summary: task.summary,
    rawStatus: task.status,
    effectiveStatus,
    priority: task.priority,
    specIds: task.specIds,
    dependsOn: task.dependsOn,
    unmetDependencies: summary.unmetDependencies,
    downstreamCount: summary.downstreamCount,
    effort,
    completedAt: task.completedAt,
    cancelledAt: task.cancelledAt,
    archivedAt: task.archivedAt,
    archiveReason: task.archiveReason,
  };
}

export function buildSpecProgress(taskCards: DashboardTaskCard[]) {
  const counts = {
    todo: 0,
    inProgress: 0,
    blocked: 0,
    review: 0,
    done: 0,
    cancelled: 0,
  };

  for (const task of taskCards) {
    if (task.effectiveStatus === "in_progress") {
      counts.inProgress += 1;
      continue;
    }

    if (task.effectiveStatus === "blocked") {
      counts.blocked += 1;
      continue;
    }

    if (task.effectiveStatus === "review") {
      counts.review += 1;
      continue;
    }

    counts[task.effectiveStatus] += 1;
  }

  const total = taskCards.length;
  return {
    todo: counts.todo,
    inProgress: counts.inProgress,
    blocked: counts.blocked,
    review: counts.review,
    done: counts.done,
    cancelled: counts.cancelled,
    completionRatio: total === 0 ? 0 : counts.done / total,
  };
}

function buildKanban(taskCards: DashboardTaskCard[]): DashboardKanbanColumn[] {
  const order: Array<{ id: DashboardKanbanColumnId; title: string }> = [
    { id: "blocked", title: "Blocked" },
    { id: "todo", title: "Todo" },
    { id: "in_progress", title: "In Progress" },
    { id: "review", title: "Review" },
    { id: "done", title: "Done / Cancelled" },
  ];

  return order.map((column) => ({
    id: column.id,
    title: column.title,
    tasks: taskCards
      .filter((task) => {
        if (column.id === "done") {
          return task.effectiveStatus === "done" || task.effectiveStatus === "cancelled";
        }

        return task.effectiveStatus === column.id;
      })
      .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id)),
  }));
}

function buildTimeline(taskCards: DashboardTaskCard[]): { totalUnits: number; items: DashboardTimelineItem[] } {
  const taskMap = new Map(taskCards.map((task) => [task.id, task]));
  const cache = new Map<string, { start: number; end: number }>();

  function place(task: DashboardTaskCard): { start: number; end: number } {
    const cached = cache.get(task.id);
    if (cached) return cached;
    const active = new Set<string>([task.id]);
    const frames = [{ task, next: 0, start: 0 }];
    while (frames.length > 0) {
      const frame = frames[frames.length - 1]!;
      if (frame.next < frame.task.dependsOn.length) {
        const dependency = taskMap.get(frame.task.dependsOn[frame.next]!);
        if (!dependency) { frame.next += 1; continue; }
        let placement = cache.get(dependency.id);
        if (!placement && active.has(dependency.id)) {
          placement = { start: 0, end: dependency.effort };
          cache.set(dependency.id, placement);
        }
        if (placement) {
          frame.start = Math.max(frame.start, placement.end);
          frame.next += 1;
        } else {
          active.add(dependency.id);
          frames.push({ task: dependency, next: 0, start: 0 });
        }
      } else {
        // Completing an ancestor deliberately overwrites its cached cycle fallback.
        cache.set(frame.task.id, { start: frame.start, end: frame.start + frame.task.effort });
        active.delete(frame.task.id);
        frames.pop();
      }
    }
    return cache.get(task.id)!;
  }

  const items = taskCards
    .filter((task) => task.effectiveStatus !== "cancelled")
    .map((task) => {
      const placement = place(task);
      return {
        taskId: task.id,
        title: task.title,
        effectiveStatus: task.effectiveStatus,
        specIds: task.specIds,
        effort: task.effort,
        start: placement.start,
        end: placement.end,
        priority: task.priority,
      };
    })
    .sort((left, right) => left.start - right.start || left.priority - right.priority || left.taskId.localeCompare(right.taskId));

  const totalUnits = items.reduce((max, item) => Math.max(max, item.end), 1);
  return { totalUnits, items };
}

function isClosedStatus(status: EffectiveTaskStatus): boolean {
  return status === "done" || status === "cancelled";
}

function isTimelineActiveRow(task: DashboardTaskCard): boolean {
  return !isClosedStatus(task.effectiveStatus);
}

function primarySpecForTimeline(task: DashboardTaskCard, selectedSpecIds: ReadonlySet<string>): string {
  const selectedMatch = task.specIds.find((specId) => selectedSpecIds.has(specId));
  return selectedMatch ?? task.specIds[0] ?? "UNSCOPED";
}

function collectReachableIds(startIds: string[], nextIds: (taskId: string) => string[]): string[] {
  const visited = new Set<string>();
  const queue = [...startIds];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const taskId = queue[cursor]!;
    if (visited.has(taskId)) {
      continue;
    }

    visited.add(taskId);
    for (const nextId of nextIds(taskId)) {
      if (!visited.has(nextId)) {
        queue.push(nextId);
      }
    }
  }

  return Array.from(visited);
}

function buildTimelineSelection(
  taskCards: DashboardTaskCard[],
  selectedTaskId: string | undefined,
  selectedSpecIds: string[],
): DashboardTimelineSelection | undefined {
  if (!selectedTaskId) {
    return undefined;
  }

  const taskMap = new Map(taskCards.map((task) => [task.id, task]));
  const selectedTask = taskMap.get(selectedTaskId);
  if (!selectedTask) {
    return undefined;
  }

  const dependentsMap = new Map<string, string[]>();
  for (const task of taskCards) {
    for (const dependencyId of task.dependsOn) {
      const dependents = dependentsMap.get(dependencyId) ?? [];
      dependents.push(task.id);
      dependentsMap.set(dependencyId, dependents);
    }
  }

  const directDependencyIds = selectedTask.dependsOn.filter((dependencyId) => taskMap.has(dependencyId));
  const directDependencySet = new Set(directDependencyIds);
  const transitiveDependencyIds = collectReachableIds(directDependencyIds, (taskId) => {
    const task = taskMap.get(taskId);
    if (!task) {
      return [];
    }

    return task.dependsOn.filter((dependencyId) => taskMap.has(dependencyId));
  }).filter((taskId) => !directDependencySet.has(taskId));

  const directDependentIds = (dependentsMap.get(selectedTask.id) ?? []).filter((taskId) => taskMap.has(taskId));
  const directDependentSet = new Set(directDependentIds);
  const transitiveDependentIds = collectReachableIds(directDependentIds, (taskId) =>
    (dependentsMap.get(taskId) ?? []).filter((dependentId) => taskMap.has(dependentId)),
  ).filter((taskId) => !directDependentSet.has(taskId));
  const directBlockedDependentIds = directDependentIds.filter((taskId) => {
    const task = taskMap.get(taskId);
    return Boolean(task && task.effectiveStatus === "blocked");
  });
  const transitiveBlockedDependentIds = transitiveDependentIds.filter((taskId) => {
    const task = taskMap.get(taskId);
    return Boolean(task && task.effectiveStatus === "blocked");
  });

  const primarySpecId = primarySpecForTimeline(selectedTask, new Set(selectedSpecIds));
  const directRelatedSpecIds = Array.from(
    new Set(
      [
        ...selectedTask.specIds,
        ...directDependencyIds.flatMap((taskId) => taskMap.get(taskId)?.specIds ?? []),
        ...directDependentIds.flatMap((taskId) => taskMap.get(taskId)?.specIds ?? []),
        ...directBlockedDependentIds.flatMap((taskId) => taskMap.get(taskId)?.specIds ?? []),
      ].filter((specId) => specId !== primarySpecId),
    ),
  );
  const directRelatedSpecSet = new Set(directRelatedSpecIds);
  const transitiveRelatedSpecIds = Array.from(
    new Set(
      [...transitiveDependencyIds, ...transitiveDependentIds, ...transitiveBlockedDependentIds]
        .flatMap((taskId) => taskMap.get(taskId)?.specIds ?? [])
        .filter((specId) => specId !== primarySpecId && !directRelatedSpecSet.has(specId)),
    ),
  );

  return {
    taskId: selectedTask.id,
    title: selectedTask.title,
    primarySpecId,
    specIds: selectedTask.specIds,
    directDependencyIds,
    transitiveDependencyIds,
    directDependentIds,
    transitiveDependentIds,
    directBlockedDependentIds,
    transitiveBlockedDependentIds,
    directRelatedSpecIds,
    transitiveRelatedSpecIds,
  };
}

type SelectionMembership = { [Key in keyof Pick<DashboardTimelineSelection,
  "directDependencyIds" | "transitiveDependencyIds" | "directBlockedDependentIds" | "transitiveBlockedDependentIds" |
  "directDependentIds" | "transitiveDependentIds" | "directRelatedSpecIds" | "transitiveRelatedSpecIds">]: Set<string> };

function selectionMembership(selection: DashboardTimelineSelection | undefined): SelectionMembership {
  return {
    directDependencyIds: new Set(selection?.directDependencyIds),
    transitiveDependencyIds: new Set(selection?.transitiveDependencyIds),
    directBlockedDependentIds: new Set(selection?.directBlockedDependentIds),
    transitiveBlockedDependentIds: new Set(selection?.transitiveBlockedDependentIds),
    directDependentIds: new Set(selection?.directDependentIds),
    transitiveDependentIds: new Set(selection?.transitiveDependentIds),
    directRelatedSpecIds: new Set(selection?.directRelatedSpecIds),
    transitiveRelatedSpecIds: new Set(selection?.transitiveRelatedSpecIds),
  };
}

function selectionStateForRow(
  row: DashboardTimelineItem,
  selection: DashboardTimelineSelection | undefined,
  membership: SelectionMembership,
): DashboardTimelineRowSelectionState {
  if (!selection) {
    return "none";
  }

  if (row.taskId === selection.taskId) {
    return "selected";
  }

  if (membership.directDependencyIds.has(row.taskId)) {
    return "dependency";
  }

  if (membership.transitiveDependencyIds.has(row.taskId)) {
    return "dependency_transitive";
  }

  if (membership.directBlockedDependentIds.has(row.taskId)) {
    return "blocked_dependent";
  }

  if (membership.transitiveBlockedDependentIds.has(row.taskId)) {
    return "blocked_dependent_transitive";
  }

  if (membership.directDependentIds.has(row.taskId)) {
    return "dependent";
  }

  if (membership.transitiveDependentIds.has(row.taskId)) {
    return "dependent_transitive";
  }

  return "dimmed";
}

function groupSelectionState(
  specId: string,
  selection: DashboardTimelineSelection | undefined,
  membership: SelectionMembership,
): DashboardTimelineGroupSelectionState {
  if (!selection) {
    return "none";
  }

  if (specId === selection.primarySpecId) {
    return "selected";
  }

  if (membership.directRelatedSpecIds.has(specId)) {
    return "related_direct";
  }

  if (membership.transitiveRelatedSpecIds.has(specId)) {
    return "related_transitive";
  }

  return "none";
}

function buildTimelineGroups(
  taskCards: DashboardTaskCard[],
  timelineItems: DashboardTimelineItem[],
  specs: DashboardData["analysis"]["availableSpecs"],
  selectedSpecIds: string[],
  selection: DashboardTimelineSelection | undefined,
): DashboardTimelineGroup[] {
  const itemMap = new Map(timelineItems.map((item) => [item.taskId, item]));
  const groupMap = new Map<string, DashboardTimelineGroup>();
  const selectedSpecSet = new Set(selectedSpecIds);
  const membership = selectionMembership(selection);
  const specMap = new Map<string, typeof specs[number]>();
  for (const spec of specs) if (!specMap.has(spec.id)) specMap.set(spec.id, spec);
  const order: string[] = [];

  for (const task of taskCards) {
    const item = itemMap.get(task.id);
    if (!item) {
      continue;
    }

    const specId = primarySpecForTimeline(task, selectedSpecSet);
    if (!groupMap.has(specId)) {
      const spec = specMap.get(specId);
      groupMap.set(specId, {
        specId,
        specTitle: spec?.title ?? specId,
        specStatus: spec?.status ?? "unknown",
        selectionState: groupSelectionState(specId, selection, membership),
        rows: [],
      });
      order.push(specId);
    }

    groupMap.get(specId)!.rows.push({
      ...item,
      statusLabel: formatTaskStatusLabel(task.effectiveStatus),
      primarySpecId: specId,
      dependencyCount: task.dependsOn.length,
      archivedAt: task.archivedAt,
      selectionState: selectionStateForRow(item, selection, membership),
      isCrossSpecRelated: Boolean(selection && item.specIds.some((rowSpecId) => rowSpecId !== selection.primarySpecId)),
    });
  }

  if (selectedSpecIds.length > 0) {
    for (const specId of selectedSpecIds) {
      if (groupMap.has(specId)) {
        continue;
      }

      const spec = specMap.get(specId);
      groupMap.set(specId, {
        specId,
        specTitle: spec?.title ?? specId,
        specStatus: spec?.status ?? "unknown",
        selectionState: groupSelectionState(specId, selection, membership),
        rows: [],
      });
      order.push(specId);
    }
  }

  return order
    .map((specId) => groupMap.get(specId)!)
    .map((group) => ({
      ...group,
      selectionState: groupSelectionState(group.specId, selection, membership),
      rows: group.rows.sort(
        (left, right) => left.start - right.start || left.priority - right.priority || left.taskId.localeCompare(right.taskId),
      ),
    }));
}

function normalizeSelectedSpecIds(specIds: string[] | undefined, availableSpecIds: string[]): string[] {
  if (!specIds) {
    return [];
  }

  const known = new Set(availableSpecIds);
  return Array.from(new Set(specIds.map((specId) => specId.trim()).filter((specId) => known.has(specId))));
}

function matchesSelectedSpecs(task: DashboardTaskCard, selectedSpecIds: ReadonlySet<string>): boolean {
  if (selectedSpecIds.size === 0) {
    return true;
  }

  return task.specIds.some((specId) => selectedSpecIds.has(specId));
}

function parseTimeWindowMilliseconds(timeWindow: DashboardTimeWindow): number {
  switch (timeWindow) {
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    case "90d":
      return 90 * 24 * 60 * 60 * 1000;
  }
}

function readAnalyticalTimestamp(task: DashboardTaskCard): string | undefined {
  return task.completedAt ?? task.cancelledAt;
}

function matchesTimeWindow(
  task: DashboardTaskCard,
  timeWindow: DashboardTimeWindow | undefined,
  now: number,
): boolean {
  if (!timeWindow) {
    return true;
  }

  const timestamp = readAnalyticalTimestamp(task);
  if (!timestamp) {
    return false;
  }

  const value = Date.parse(timestamp);
  if (!Number.isFinite(value)) {
    return false;
  }

  return value >= now - parseTimeWindowMilliseconds(timeWindow);
}

/** Timeline-only projection over already loaded/filter-selected canonical task cards. */
export function buildTimelineProjection(
  taskCards: DashboardTaskCard[],
  specs: DashboardAnalysisState["availableSpecs"],
  filters: { selectedSpecIds: string[]; mode: DashboardTimelineMode; selectedTaskId?: string },
): Omit<DashboardData["timeline"], "items"> & { taskCount: number } {
  const cards = filters.mode === "all" ? taskCards : taskCards.filter(isTimelineActiveRow);
  const timeline = buildTimeline(cards);
  const selection = buildTimelineSelection(cards, filters.selectedTaskId, filters.selectedSpecIds);
  return {
    totalUnits: timeline.totalUnits,
    taskCount: timeline.items.length,
    groups: buildTimelineGroups(cards, timeline.items, specs, filters.selectedSpecIds, selection),
    mode: filters.mode,
    ...(selection ? { selection } : {}),
  };
}

export async function buildDashboardData(rootDir: string, filters: DashboardFilterOptions = {}): Promise<DashboardData> {
  const [context, agentsReport] = await Promise.all([loadProjectContext(rootDir), buildAgentsHealthReport(rootDir)]);
  const snapshot = deriveStatusSnapshot(context);
  const nextActions = deriveNextActions(context, snapshot);
  const analysis = buildTaskAnalysisIndex(context.tasks);
  const taskIndex = analysis.byId;
  const taskCards = context.tasks.map((task) => toTaskCard(task, taskIndex, analysis));
  // The facade's historical find() chooses the first source card, unlike taskMap.
  const firstTaskCard = new Map<string, DashboardTaskCard>();
  for (const task of taskCards) if (!firstTaskCard.has(task.id)) firstTaskCard.set(task.id, task);
  const activeFlowTaskCards = taskCards.filter((task) => !task.archivedAt);
  const availableSpecIds = context.specs.map((spec) => spec.id);
  const selectedSpecIds = normalizeSelectedSpecIds(filters.selectedSpecIds, availableSpecIds);
  const selectedSpecSet = new Set(selectedSpecIds);
  const timeWindow = filters.timeWindow;
  const timelineMode = filters.timelineMode ?? "active";
  const selectedTimelineTaskId = filters.selectedTimelineTaskId?.trim() || undefined;
  const now = Date.now();
  const hasActiveFilters = selectedSpecIds.length > 0 || Boolean(timeWindow);
  const analyticalSourceCards = hasActiveFilters ? taskCards : activeFlowTaskCards;
  const analyticalTaskCards = analyticalSourceCards.filter((task) => {
    if (!matchesSelectedSpecs(task, selectedSpecSet)) {
      return false;
    }

    return matchesTimeWindow(task, timeWindow, now);
  });
  const analyticalTimelineCardsBase = hasActiveFilters ? analyticalTaskCards : activeFlowTaskCards;
  const analyticalTimelineCards =
    timelineMode === "all" ? analyticalTimelineCardsBase : analyticalTimelineCardsBase.filter((task) => isTimelineActiveRow(task));
  const timeline = buildTimeline(analyticalTimelineCards);
  const timelineSelection = buildTimelineSelection(analyticalTimelineCards, selectedTimelineTaskId, selectedSpecIds);
  const availableSpecs = context.specs
    .map((spec) => ({
      id: spec.id,
      title: spec.title,
      status: spec.status,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const timelineGroups = buildTimelineGroups(analyticalTimelineCards, timeline.items, availableSpecs, selectedSpecIds, timelineSelection);

  return {
    project: {
      name: context.config.projectName,
      memoryDir: context.config.memoryDir,
    },
    currentState: {
      summary: context.currentState.summary,
      focus: context.currentState.focus,
      activeSpecIds: snapshot.activeSpecIds,
      activeTaskIds: snapshot.activeTaskIds,
      nextActionHints: context.currentState.nextActionHints,
      updatedAt: context.currentState.updatedAt,
    },
    counts: {
      specs: snapshot.specCount,
      tasks: snapshot.taskCount,
      activeSpecs: snapshot.activeSpecIds.length,
      inProgressTasks: snapshot.inProgressTasks.length,
      reviewTasks: snapshot.reviewTasks.length,
      blockedTasks: snapshot.blockedTasks.length,
      readyTasks: snapshot.readyTasks.length,
    },
    nextActions,
    git: {
      available: context.git.available,
      branch: context.git.branch,
      dirty: context.git.dirty,
    },
    agents: {
      ok: agentsReport.summary.ok,
      maxFileTokens: agentsReport.summary.maxFileTokens,
      maxChainTokens: agentsReport.summary.maxChainTokens,
      failures: agentsReport.failures,
    },
    specs: context.specs
      .map((spec) => {
        const linkedTaskCards = spec.taskIds
          .map((taskId) => firstTaskCard.get(taskId))
          .filter((task): task is DashboardTaskCard => Boolean(task));

        return {
          id: spec.id,
          title: spec.title,
          summary: spec.summary,
          status: spec.status,
          taskIds: spec.taskIds,
          linkedTaskCount: linkedTaskCards.length,
          progress: buildSpecProgress(linkedTaskCards),
        };
      })
      .sort((left, right) => left.id.localeCompare(right.id)),
    tasks: taskCards.sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id)),
    analysisTasks: analyticalTaskCards.sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id)),
    inProgressTasks: snapshot.inProgressTasks.map((task) => toTaskCard(task, taskIndex, analysis)).filter((task) => !task.archivedAt),
    readyTasks: snapshot.readyTasks.map((item) => toTaskCard(item.task, taskIndex, analysis)).filter((task) => !task.archivedAt),
    blockedTasks: snapshot.blockedTasks.map((item) => toTaskCard(item.task, taskIndex, analysis)).filter((task) => !task.archivedAt),
    reviewTasks: snapshot.reviewTasks.map((item) => toTaskCard(item.task, taskIndex, analysis)).filter((task) => !task.archivedAt),
    criticalPath: snapshot.criticalPath.map((task) => toTaskCard(task, taskIndex, analysis)).filter((task) => !task.archivedAt),
    kanban: buildKanban(activeFlowTaskCards),
    timeline: {
      totalUnits: timeline.totalUnits,
      items: timeline.items,
      groups: timelineGroups,
      mode: timelineMode,
      selection: timelineSelection,
    },
    recentHandoff: snapshot.recentHandoff
      ? {
          id: snapshot.recentHandoff.id,
          title: snapshot.recentHandoff.title,
          summary: snapshot.recentHandoff.summary,
          createdAt: snapshot.recentHandoff.createdAt,
        }
      : undefined,
    dependencyIssues: snapshot.missingDependencies,
    analysis: {
      selectedSpecIds,
      timeWindow,
      timelineMode,
      selectedTimelineTaskId: timelineSelection?.taskId,
      availableSpecs,
      hasActiveFilters,
      includesArchived: hasActiveFilters,
      filteredTaskCount: analyticalTaskCards.length,
    },
  };
}
