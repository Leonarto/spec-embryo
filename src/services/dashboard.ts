import { buildTaskIndex, deriveNextActions, deriveStatusSnapshot, summarizeTaskNode } from "../engine.ts";
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

function toTaskCard(task: Parameters<typeof summarizeTaskNode>[0], index: ReturnType<typeof buildTaskIndex>): DashboardTaskCard {
  const summary = summarizeTaskNode(task, index);
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

function buildSpecProgress(taskCards: DashboardTaskCard[]) {
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

  function place(task: DashboardTaskCard, trail: Set<string>): { start: number; end: number } {
    if (cache.has(task.id)) {
      return cache.get(task.id)!;
    }

    if (trail.has(task.id)) {
      const cyclePlacement = { start: 0, end: task.effort };
      cache.set(task.id, cyclePlacement);
      return cyclePlacement;
    }

    const nextTrail = new Set(trail);
    nextTrail.add(task.id);

    let start = 0;
    for (const dependencyId of task.dependsOn) {
      const dependency = taskMap.get(dependencyId);
      if (!dependency) {
        continue;
      }

      const placement = place(dependency, nextTrail);
      start = Math.max(start, placement.end);
    }

    const result = {
      start,
      end: start + task.effort,
    };
    cache.set(task.id, result);
    return result;
  }

  const items = taskCards
    .filter((task) => task.effectiveStatus !== "cancelled")
    .map((task) => {
      const placement = place(task, new Set());
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

function primarySpecForTimeline(task: DashboardTaskCard, selectedSpecIds: string[]): string {
  const selectedMatch = task.specIds.find((specId) => selectedSpecIds.includes(specId));
  return selectedMatch ?? task.specIds[0] ?? "UNSCOPED";
}

function collectReachableIds(startIds: string[], nextIds: (taskId: string) => string[]): string[] {
  const visited = new Set<string>();
  const queue = [...startIds];

  while (queue.length > 0) {
    const taskId = queue.shift()!;
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
  const transitiveDependencyIds = collectReachableIds(directDependencyIds, (taskId) => {
    const task = taskMap.get(taskId);
    if (!task) {
      return [];
    }

    return task.dependsOn.filter((dependencyId) => taskMap.has(dependencyId));
  }).filter((taskId) => !directDependencyIds.includes(taskId));

  const directDependentIds = (dependentsMap.get(selectedTask.id) ?? []).filter((taskId) => taskMap.has(taskId));
  const transitiveDependentIds = collectReachableIds(directDependentIds, (taskId) =>
    (dependentsMap.get(taskId) ?? []).filter((dependentId) => taskMap.has(dependentId)),
  ).filter((taskId) => !directDependentIds.includes(taskId));
  const directBlockedDependentIds = directDependentIds.filter((taskId) => {
    const task = taskMap.get(taskId);
    return Boolean(task && task.effectiveStatus === "blocked");
  });
  const transitiveBlockedDependentIds = transitiveDependentIds.filter((taskId) => {
    const task = taskMap.get(taskId);
    return Boolean(task && task.effectiveStatus === "blocked");
  });

  const primarySpecId = primarySpecForTimeline(selectedTask, selectedSpecIds);
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
  const transitiveRelatedSpecIds = Array.from(
    new Set(
      [...transitiveDependencyIds, ...transitiveDependentIds, ...transitiveBlockedDependentIds]
        .flatMap((taskId) => taskMap.get(taskId)?.specIds ?? [])
        .filter((specId) => specId !== primarySpecId && !directRelatedSpecIds.includes(specId)),
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

function selectionStateForRow(
  row: DashboardTimelineItem,
  selection: DashboardTimelineSelection | undefined,
): DashboardTimelineRowSelectionState {
  if (!selection) {
    return "none";
  }

  if (row.taskId === selection.taskId) {
    return "selected";
  }

  if (selection.directDependencyIds.includes(row.taskId)) {
    return "dependency";
  }

  if (selection.transitiveDependencyIds.includes(row.taskId)) {
    return "dependency_transitive";
  }

  if (selection.directBlockedDependentIds.includes(row.taskId)) {
    return "blocked_dependent";
  }

  if (selection.transitiveBlockedDependentIds.includes(row.taskId)) {
    return "blocked_dependent_transitive";
  }

  if (selection.directDependentIds.includes(row.taskId)) {
    return "dependent";
  }

  if (selection.transitiveDependentIds.includes(row.taskId)) {
    return "dependent_transitive";
  }

  return "dimmed";
}

function groupSelectionState(
  specId: string,
  selection: DashboardTimelineSelection | undefined,
): DashboardTimelineGroupSelectionState {
  if (!selection) {
    return "none";
  }

  if (specId === selection.primarySpecId) {
    return "selected";
  }

  if (selection.directRelatedSpecIds.includes(specId)) {
    return "related_direct";
  }

  if (selection.transitiveRelatedSpecIds.includes(specId)) {
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
  const order: string[] = [];

  for (const task of taskCards) {
    const item = itemMap.get(task.id);
    if (!item) {
      continue;
    }

    const specId = primarySpecForTimeline(task, selectedSpecIds);
    if (!groupMap.has(specId)) {
      const spec = specs.find((entry) => entry.id === specId);
      groupMap.set(specId, {
        specId,
        specTitle: spec?.title ?? specId,
        specStatus: spec?.status ?? "unknown",
        selectionState: groupSelectionState(specId, selection),
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
      selectionState: selectionStateForRow(item, selection),
      isCrossSpecRelated: Boolean(selection && item.specIds.some((rowSpecId) => rowSpecId !== selection.primarySpecId)),
    });
  }

  if (selectedSpecIds.length > 0) {
    for (const specId of selectedSpecIds) {
      if (groupMap.has(specId)) {
        continue;
      }

      const spec = specs.find((entry) => entry.id === specId);
      groupMap.set(specId, {
        specId,
        specTitle: spec?.title ?? specId,
        specStatus: spec?.status ?? "unknown",
        selectionState: groupSelectionState(specId, selection),
        rows: [],
      });
      order.push(specId);
    }
  }

  return order
    .map((specId) => groupMap.get(specId)!)
    .map((group) => ({
      ...group,
      selectionState: groupSelectionState(group.specId, selection),
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

function matchesSelectedSpecs(task: DashboardTaskCard, selectedSpecIds: string[]): boolean {
  if (selectedSpecIds.length === 0) {
    return true;
  }

  return task.specIds.some((specId) => selectedSpecIds.includes(specId));
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

export async function buildDashboardData(rootDir: string, filters: DashboardFilterOptions = {}): Promise<DashboardData> {
  const [context, agentsReport] = await Promise.all([loadProjectContext(rootDir), buildAgentsHealthReport(rootDir)]);
  const snapshot = deriveStatusSnapshot(context);
  const nextActions = deriveNextActions(context, snapshot);
  const taskIndex = buildTaskIndex(context.tasks);
  const taskCards = context.tasks.map((task) => toTaskCard(task, taskIndex));
  const activeFlowTaskCards = taskCards.filter((task) => !task.archivedAt);
  const availableSpecIds = context.specs.map((spec) => spec.id);
  const selectedSpecIds = normalizeSelectedSpecIds(filters.selectedSpecIds, availableSpecIds);
  const timeWindow = filters.timeWindow;
  const timelineMode = filters.timelineMode ?? "active";
  const selectedTimelineTaskId = filters.selectedTimelineTaskId?.trim() || undefined;
  const now = Date.now();
  const hasActiveFilters = selectedSpecIds.length > 0 || Boolean(timeWindow);
  const analyticalSourceCards = hasActiveFilters ? taskCards : activeFlowTaskCards;
  const analyticalTaskCards = analyticalSourceCards.filter((task) => {
    if (!matchesSelectedSpecs(task, selectedSpecIds)) {
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
          .map((taskId) => taskCards.find((task) => task.id === taskId))
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
    inProgressTasks: snapshot.inProgressTasks.map((task) => toTaskCard(task, taskIndex)).filter((task) => !task.archivedAt),
    readyTasks: snapshot.readyTasks.map((item) => toTaskCard(item.task, taskIndex)).filter((task) => !task.archivedAt),
    blockedTasks: snapshot.blockedTasks.map((item) => toTaskCard(item.task, taskIndex)).filter((task) => !task.archivedAt),
    reviewTasks: snapshot.reviewTasks.map((item) => toTaskCard(item.task, taskIndex)).filter((task) => !task.archivedAt),
    criticalPath: snapshot.criticalPath.map((task) => toTaskCard(task, taskIndex)).filter((task) => !task.archivedAt),
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
