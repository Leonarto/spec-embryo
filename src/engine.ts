import { relative } from "node:path";
import type {
  ChangedItemSummary,
  CurrentStateDocument,
  ProjectContext,
  ResumeContext,
  SpecDocument,
  StatusSnapshot,
  TaskDocument,
  TaskNodeSummary,
} from "./domain.ts";

function byPriority(left: TaskDocument, right: TaskDocument): number {
  return left.priority - right.priority || left.id.localeCompare(right.id);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function parseGitStatusPath(line: string): string | undefined {
  if (line.length < 4) {
    return undefined;
  }

  const rawPath = line.slice(3).trim();
  if (rawPath.length === 0) {
    return undefined;
  }

  const renameParts = rawPath.split(" -> ");
  return renameParts[renameParts.length - 1]?.trim() || undefined;
}

export function buildTaskIndex(tasks: TaskDocument[]): Map<string, TaskDocument> {
  return new Map(tasks.map((task) => [task.id, task]));
}

export function summarizeTaskNode(task: TaskDocument, index: Map<string, TaskDocument>): TaskNodeSummary {
  const unmetDependencies = task.dependsOn.filter((dependencyId) => index.get(dependencyId)?.status !== "done");
  const downstreamCount = [...index.values()].filter((candidate) => candidate.dependsOn.includes(task.id)).length;

  return {
    task,
    unmetDependencies,
    downstreamCount,
  };
}

export function deriveMissingDependencies(tasks: TaskDocument[]): Array<{ taskId: string; missingTaskId: string }> {
  const index = buildTaskIndex(tasks);
  return tasks.flatMap((task) =>
    task.dependsOn
      .filter((dependencyId) => !index.has(dependencyId))
      .map((missingTaskId) => ({ taskId: task.id, missingTaskId })),
  );
}

export function deriveChangedItems(context: ProjectContext): ChangedItemSummary[] {
  const specByPath = new Map(context.specs.map((spec) => [relative(context.rootDir, spec.filePath), spec]));
  const taskByPath = new Map(context.tasks.map((task) => [relative(context.rootDir, task.filePath), task]));
  const handoffByPath = new Map(context.handoffs.map((handoff) => [relative(context.rootDir, handoff.filePath), handoff]));
  const currentStatePath = relative(context.rootDir, context.currentState.filePath);
  const seen = new Set<string>();
  const items: ChangedItemSummary[] = [];

  for (const line of context.git.shortStatus) {
    const path = parseGitStatusPath(line);
    if (!path || seen.has(path)) {
      continue;
    }

    seen.add(path);

    const spec = specByPath.get(path);
    if (spec) {
      items.push({ kind: "spec", path, id: spec.id, title: spec.title });
      continue;
    }

    const task = taskByPath.get(path);
    if (task) {
      items.push({ kind: "task", path, id: task.id, title: task.title });
      continue;
    }

    if (path === currentStatePath) {
      items.push({ kind: "current-state", path, id: context.currentState.id, title: context.currentState.title });
      continue;
    }

    const handoff = handoffByPath.get(path);
    if (handoff) {
      items.push({ kind: "handoff", path, id: handoff.id, title: handoff.title });
      continue;
    }

    items.push({ kind: "other", path });
  }

  return items;
}

function deriveActiveTaskIds(tasks: TaskDocument[], currentState: CurrentStateDocument): string[] {
  if (currentState.activeTaskIds.length > 0) {
    return unique(currentState.activeTaskIds);
  }

  return tasks.filter((task) => task.status === "in_progress" || task.status === "review").map((task) => task.id);
}

function deriveActiveSpecIds(specs: SpecDocument[], currentState: CurrentStateDocument, activeTaskIds: string[], taskIndex: Map<string, TaskDocument>): string[] {
  if (currentState.activeSpecIds.length > 0) {
    return unique(currentState.activeSpecIds);
  }

  const inferred = activeTaskIds.flatMap((taskId) => taskIndex.get(taskId)?.specIds ?? []);
  return unique(specs.filter((spec) => spec.status === "active").map((spec) => spec.id).concat(inferred));
}

function computeCriticalPath(tasks: TaskDocument[], index: Map<string, TaskDocument>): TaskDocument[] {
  const unfinished = tasks.filter((task) => task.status !== "done" && task.status !== "cancelled");
  const cache = new Map<string, TaskDocument[]>();

  function dfs(task: TaskDocument, trail: Set<string>): TaskDocument[] {
    if (cache.has(task.id)) {
      return cache.get(task.id)!;
    }

    if (trail.has(task.id)) {
      return [task];
    }

    const nextTrail = new Set(trail);
    nextTrail.add(task.id);

    let best: TaskDocument[] = [task];
    for (const dependencyId of task.dependsOn) {
      const dependency = index.get(dependencyId);
      if (!dependency || dependency.status === "done" || dependency.status === "cancelled") {
        continue;
      }

      const candidate = [...dfs(dependency, nextTrail), task];
      if (candidate.length > best.length) {
        best = candidate;
      }
    }

    cache.set(task.id, best);
    return best;
  }

  let overallBest: TaskDocument[] = [];
  for (const task of unfinished) {
    const candidate = dfs(task, new Set());
    if (candidate.length > overallBest.length) {
      overallBest = candidate;
    }
  }

  return overallBest;
}

export function deriveStatusSnapshot(context: ProjectContext): StatusSnapshot {
  const taskIndex = buildTaskIndex(context.tasks);
  const activeTaskIds = deriveActiveTaskIds(context.tasks, context.currentState);
  const activeSpecIds = deriveActiveSpecIds(context.specs, context.currentState, activeTaskIds, taskIndex);
  const activeTasks = activeTaskIds.map((taskId) => taskIndex.get(taskId)).filter((task): task is TaskDocument => Boolean(task));
  const activeTaskSet = new Set(activeTasks.map((task) => task.id));

  const blockedTasks = context.tasks
    .filter((task) => task.status === "blocked" || (task.status === "todo" && task.dependsOn.some((dependencyId) => taskIndex.get(dependencyId)?.status !== "done")))
    .map((task) => summarizeTaskNode(task, taskIndex))
    .sort((left, right) => byPriority(left.task, right.task));

  const reviewTasks = context.tasks
    .filter((task) => task.status === "review")
    .map((task) => summarizeTaskNode(task, taskIndex))
    .sort((left, right) => byPriority(left.task, right.task));

  const readyTasks = context.tasks
    .filter((task) => {
      if (task.status !== "todo") {
        return false;
      }

      return summarizeTaskNode(task, taskIndex).unmetDependencies.length === 0;
    })
    .filter((task) => !activeTaskSet.has(task.id))
    .map((task) => summarizeTaskNode(task, taskIndex))
    .sort((left, right) => byPriority(left.task, right.task));

  return {
    specCount: context.specs.length,
    taskCount: context.tasks.length,
    activeSpecIds,
    activeTaskIds,
    blockedTasks,
    reviewTasks,
    readyTasks,
    inProgressTasks: context.tasks.filter((task) => task.status === "in_progress").sort(byPriority),
    recentHandoff: context.handoffs[0],
    criticalPath: computeCriticalPath(context.tasks, taskIndex),
    missingDependencies: deriveMissingDependencies(context.tasks),
    changedItems: deriveChangedItems(context),
  };
}

export function deriveNextActions(context: ProjectContext, snapshot: StatusSnapshot): string[] {
  const actions: string[] = [];

  if (snapshot.blockedTasks.length > 0) {
    for (const blocked of snapshot.blockedTasks.slice(0, 2)) {
      const reason = blocked.unmetDependencies.length > 0 ? `waiting on ${blocked.unmetDependencies.join(", ")}` : "marked blocked";
      actions.push(`Unblock ${blocked.task.id} (${blocked.task.title}) because it is ${reason}.`);
    }
  }

  if (snapshot.inProgressTasks.length > 0) {
    for (const task of snapshot.inProgressTasks.slice(0, 2)) {
      actions.push(`Continue ${task.id} (${task.title}) and update the configured current state file when its scope shifts.`);
    }
  }

  if (actions.length < 3 && snapshot.reviewTasks.length > 0) {
    for (const review of snapshot.reviewTasks.slice(0, 3 - actions.length)) {
      actions.push(`Review ${review.task.id} (${review.task.title}) before moving it to done.`);
    }
  }

  if (actions.length < 3 && snapshot.readyTasks.length > 0) {
    for (const ready of snapshot.readyTasks.slice(0, 3 - actions.length)) {
      actions.push(`Start ${ready.task.id} (${ready.task.title}); all declared dependencies are satisfied.`);
    }
  }

  if (actions.length < 4 && snapshot.changedItems.length > 0) {
    const changedDocs = snapshot.changedItems
      .filter((item) => item.kind !== "other")
      .slice(0, 2)
      .map((item) => item.id ?? item.path);

    if (changedDocs.length > 0) {
      actions.push(`Reconcile recent repo changes touching ${changedDocs.join(", ")} before the next checkpoint.`);
    }
  }

  if (actions.length === 0) {
    actions.push("Capture the next meaningful slice in the configured current state file or create a new task.");
  }

  for (const hint of context.currentState.nextActionHints) {
    if (actions.length >= 4) {
      break;
    }

    actions.push(hint);
  }

  return unique(actions);
}

export function buildResumeContext(context: ProjectContext): ResumeContext {
  const snapshot = deriveStatusSnapshot(context);
  const taskIndex = buildTaskIndex(context.tasks);
  const activeSpecs = snapshot.activeSpecIds
    .map((specId) => context.specs.find((spec) => spec.id === specId))
    .filter((spec): spec is SpecDocument => Boolean(spec));
  const activeTasks = snapshot.activeTaskIds
    .map((taskId) => taskIndex.get(taskId))
    .filter((task): task is TaskDocument => Boolean(task))
    .map((task) => summarizeTaskNode(task, taskIndex));

  return {
    projectName: context.config.projectName,
    focus: context.currentState.focus,
    summary: context.currentState.summary,
    activeSpecs,
    activeTasks,
    blockedTasks: snapshot.blockedTasks,
    reviewTasks: snapshot.reviewTasks,
    readyTasks: snapshot.readyTasks,
    criticalPath: snapshot.criticalPath,
    recentHandoff: snapshot.recentHandoff,
    nextActions: deriveNextActions(context, snapshot),
    git: context.git,
    changedItems: snapshot.changedItems,
  };
}
