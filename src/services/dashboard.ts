import { buildTaskIndex, deriveNextActions, deriveStatusSnapshot, summarizeTaskNode } from "../engine.ts";
import { loadProjectContext } from "../repository.ts";
import { buildAgentsHealthReport } from "./agents.ts";

export type EffectiveTaskStatus = "todo" | "in_progress" | "blocked" | "review" | "done" | "cancelled";
export type DashboardKanbanColumnId = "blocked" | "todo" | "in_progress" | "review" | "done";
export type DashboardTimeWindow = "7d" | "30d" | "90d";

export interface DashboardFilterOptions {
  selectedSpecIds?: string[];
  timeWindow?: DashboardTimeWindow;
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

export interface DashboardAnalysisState {
  selectedSpecIds: string[];
  timeWindow?: DashboardTimeWindow;
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

function deriveEffectiveStatus(rawStatus: string, unmetDependencies: string[]): EffectiveTaskStatus {
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
  const now = Date.now();
  const hasActiveFilters = selectedSpecIds.length > 0 || Boolean(timeWindow);
  const analyticalSourceCards = hasActiveFilters ? taskCards : activeFlowTaskCards;
  const analyticalTaskCards = analyticalSourceCards.filter((task) => {
    if (!matchesSelectedSpecs(task, selectedSpecIds)) {
      return false;
    }

    return matchesTimeWindow(task, timeWindow, now);
  });
  const analyticalTimelineCards = hasActiveFilters ? analyticalTaskCards : activeFlowTaskCards;

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
    timeline: buildTimeline(analyticalTimelineCards),
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
      availableSpecs: context.specs
        .map((spec) => ({
          id: spec.id,
          title: spec.title,
          status: spec.status,
        }))
        .sort((left, right) => left.id.localeCompare(right.id)),
      hasActiveFilters,
      includesArchived: hasActiveFilters,
      filteredTaskCount: analyticalTaskCards.length,
    },
  };
}
