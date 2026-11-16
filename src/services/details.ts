import { buildTaskIndex, summarizeTaskNode, type TaskAnalysisIndex } from "../engine.ts";
import type {
  CurrentStateDocument,
  HandoffDocument,
  ProjectContext,
  SpecDocument,
  TaskDocument,
} from "../domain.ts";
import { loadProjectContext } from "../repository.ts";
import { deriveEffectiveStatus, type DashboardTaskCard } from "./dashboard.ts";
import { parseSpecQuestionSections } from "./spec-questions.ts";

export interface DocumentBodyBlock {
  kind: "paragraph" | "list" | "code";
  lines: string[];
  language?: string;
}

export interface DocumentBodySection {
  heading: string;
  depth: number;
  blocks: DocumentBodyBlock[];
}

export interface DetailLinkedSpec {
  id: string;
  title: string;
  status: string;
}

export interface DetailLinkedTask extends DashboardTaskCard {
  statusLabel: string;
}

export interface DetailCurrentStateRelevance {
  isActiveSpec: boolean;
  isActiveTask: boolean;
  isBlockedTask: boolean;
  focus: string;
}

export interface DetailRelatedHandoff {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
}

export interface SpecOpenQuestionDetail {
  id: string;
  question: string;
}

export interface ResolvedDecisionDetail {
  id: string;
  question?: string;
  answer: string;
}

export interface SpecDetailData {
  kind: "spec";
  found: true;
  spec: {
    id: string;
    title: string;
    summary: string;
    status: string;
    tags: string[];
    owner?: string;
    updatedAt?: string;
  };
  progress: {
    todo: number;
    inProgress: number;
    blocked: number;
    review: number;
    done: number;
    cancelled: number;
    completionRatio: number;
  };
  linkedTasks: DetailLinkedTask[];
  linkedTaskGroups: Array<{
    id: string;
    title: string;
    tasks: DetailLinkedTask[];
  }>;
  currentState: DetailCurrentStateRelevance;
  relatedHandoffs: DetailRelatedHandoff[];
  openQuestions: SpecOpenQuestionDetail[];
  resolvedDecisions: ResolvedDecisionDetail[];
  bodySections: DocumentBodySection[];
}

export interface TaskDetailData {
  kind: "task";
  found: true;
  task: {
    id: string;
    title: string;
    summary: string;
    status: string;
    priority: number;
    ownerRole?: string;
    tags: string[];
    updatedAt?: string;
    createdAt?: string;
    completedAt?: string;
    cancelledAt?: string;
    archivedAt?: string;
    archiveReason?: string;
  };
  linkedSpecs: DetailLinkedSpec[];
  dependencies: DetailLinkedTask[];
  unmetDependencyIds: string[];
  blockingTasks: DetailLinkedTask[];
  currentState: DetailCurrentStateRelevance;
  relatedHandoffs: DetailRelatedHandoff[];
  bodySections: DocumentBodySection[];
}

export interface DetailNotFoundData {
  found: false;
  kind: "spec" | "task";
  id: string;
  availableIds: string[];
}

export type SpecDetailResult = SpecDetailData | DetailNotFoundData;
export type TaskDetailResult = TaskDetailData | DetailNotFoundData;

function deriveEffort(priority: number, downstreamCount: number): number {
  const base = priority <= 1 ? 5 : priority === 2 ? 3 : 2;
  return Math.min(8, base + Math.min(2, downstreamCount));
}

function toDetailTaskCard(task: TaskDocument, index: ReturnType<typeof buildTaskIndex>, analysis?: TaskAnalysisIndex): DetailLinkedTask {
  const summary = summarizeTaskNode(task, index, analysis);
  const effectiveStatus = deriveEffectiveStatus(task.status, summary.unmetDependencies);

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
    effort: deriveEffort(task.priority, summary.downstreamCount),
    completedAt: task.completedAt,
    cancelledAt: task.cancelledAt,
    archivedAt: task.archivedAt,
    archiveReason: task.archiveReason,
    statusLabel: task.status.replaceAll("_", " "),
  };
}

function buildSpecProgress(taskCards: DetailLinkedTask[]) {
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

function buildLinkedTaskGroups(tasks: DetailLinkedTask[]): Array<{ id: string; title: string; tasks: DetailLinkedTask[] }> {
  const groups = [
    { id: "in_progress", title: "In Progress" },
    { id: "blocked", title: "Blocked" },
    { id: "review", title: "Review" },
    { id: "todo", title: "Todo" },
    { id: "done", title: "Done" },
    { id: "cancelled", title: "Cancelled" },
  ];

  return groups
    .map((group) => ({
      ...group,
      tasks: tasks.filter((task) => task.effectiveStatus === group.id),
    }))
    .filter((group) => group.tasks.length > 0);
}

function parseDocumentBody(body: string): DocumentBodySection[] {
  const normalized = body.trim();
  if (!normalized) {
    return [];
  }

  const sections: DocumentBodySection[] = [];
  let currentSection: DocumentBodySection | undefined;
  let paragraph: string[] = [];
  let list: string[] = [];
  let codeFenceLanguage: string | undefined;
  let codeLines: string[] = [];

  function ensureSection(): DocumentBodySection {
    if (!currentSection) {
      currentSection = {
        heading: "Overview",
        depth: 2,
        blocks: [],
      };
      sections.push(currentSection);
    }

    return currentSection;
  }

  function flushParagraph() {
    if (paragraph.length === 0) {
      return;
    }

    ensureSection().blocks.push({
      kind: "paragraph",
      lines: [paragraph.join(" ").trim()],
    });
    paragraph = [];
  }

  function flushList() {
    if (list.length === 0) {
      return;
    }

    ensureSection().blocks.push({
      kind: "list",
      lines: [...list],
    });
    list = [];
  }

  function flushCode() {
    if (codeLines.length === 0) {
      codeFenceLanguage = undefined;
      return;
    }

    ensureSection().blocks.push({
      kind: "code",
      lines: [...codeLines],
      language: codeFenceLanguage,
    });
    codeLines = [];
    codeFenceLanguage = undefined;
  }

  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();

    if (codeFenceLanguage !== undefined) {
      if (trimmed.startsWith("```")) {
        flushCode();
        continue;
      }

      codeLines.push(line);
      continue;
    }

    const fenceMatch = trimmed.match(/^```([\w-]+)?\s*$/);
    if (fenceMatch) {
      flushParagraph();
      flushList();
      codeFenceLanguage = fenceMatch[1]?.trim().toLowerCase() || "";
      codeLines = [];
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);

    if (headingMatch) {
      flushParagraph();
      flushList();
      flushCode();
      currentSection = {
        heading: headingMatch[2]!.trim(),
        depth: headingMatch[1]!.length,
        blocks: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (trimmed.length === 0) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushParagraph();
      list.push(trimmed.slice(2).trim());
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushCode();
  return sections;
}

function buildCurrentStateRelevance(currentState: CurrentStateDocument, input: { specId?: string; taskId?: string }): DetailCurrentStateRelevance {
  return {
    isActiveSpec: input.specId ? currentState.activeSpecIds.includes(input.specId) : false,
    isActiveTask: input.taskId ? currentState.activeTaskIds.includes(input.taskId) : false,
    isBlockedTask: input.taskId ? currentState.blockedTaskIds.includes(input.taskId) : false,
    focus: currentState.focus,
  };
}

function sortHandoffsDescending(handoffs: HandoffDocument[], limit = 3): DetailRelatedHandoff[] {
  return handoffs
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit)
    .map((handoff) => ({
      id: handoff.id,
      title: handoff.title,
      summary: handoff.summary,
      createdAt: handoff.createdAt,
    }));
}

export function buildRelatedHandoffsForSpec(context: ProjectContext, spec: SpecDocument, limit = 3): DetailRelatedHandoff[] {
  return sortHandoffsDescending(
    context.handoffs.filter(
      (handoff) =>
        handoff.relatedSpecIds.includes(spec.id) ||
        handoff.activeTaskIds.some((taskId) => spec.taskIds.includes(taskId)),
    ), limit,
  );
}

export function buildRelatedHandoffsForTask(context: ProjectContext, task: TaskDocument, limit = 3): DetailRelatedHandoff[] {
  return sortHandoffsDescending(
    context.handoffs.filter(
      (handoff) => handoff.activeTaskIds.includes(task.id) || handoff.relatedSpecIds.some((specId) => task.specIds.includes(specId)),
    ), limit,
  );
}

function buildLinkedSpecs(context: ProjectContext, task: TaskDocument): DetailLinkedSpec[] {
  return task.specIds
    .map((specId) => context.specs.find((spec) => spec.id === specId))
    .filter((spec): spec is SpecDocument => Boolean(spec))
    .map((spec) => ({
      id: spec.id,
      title: spec.title,
      status: spec.status,
    }));
}

export async function buildSpecDetailData(rootDir: string, specId: string): Promise<SpecDetailResult> {
  const context = await loadProjectContext(rootDir);
  return buildSpecDetailFromContext(context, specId);
}

export function buildSpecDetailFromContext(context: ProjectContext, specId: string, analysis?: TaskAnalysisIndex): SpecDetailResult {
  const spec = context.specs.find((entry) => entry.id === specId);

  if (!spec) {
    return {
      found: false,
      kind: "spec",
      id: specId,
      availableIds: context.specs.map((entry) => entry.id).sort(),
    };
  }

  const taskIndex = analysis?.byId ?? buildTaskIndex(context.tasks);
  const linkedTasks = spec.taskIds
    .map((taskId) => taskIndex.get(taskId))
    .filter((task): task is TaskDocument => Boolean(task))
    .map((task) => toDetailTaskCard(task, taskIndex, analysis))
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
  const parsedQuestionSections = parseSpecQuestionSections(spec.body);
  const bodySections = parseDocumentBody(spec.body).filter((section) => {
    const heading = section.heading.trim().toLowerCase();
    return heading !== "open questions" && heading !== "resolved decisions";
  });

  return {
    found: true,
    kind: "spec",
    spec: {
      id: spec.id,
      title: spec.title,
      summary: spec.summary,
      status: spec.status,
      tags: spec.tags,
      owner: spec.owner,
      updatedAt: spec.updatedAt,
    },
    progress: buildSpecProgress(linkedTasks),
    linkedTasks,
    linkedTaskGroups: buildLinkedTaskGroups(linkedTasks),
    currentState: buildCurrentStateRelevance(context.currentState, { specId: spec.id }),
    relatedHandoffs: buildRelatedHandoffsForSpec(context, spec),
    openQuestions: parsedQuestionSections.openQuestions,
    resolvedDecisions: parsedQuestionSections.resolvedDecisions,
    bodySections,
  };
}

export async function buildTaskDetailData(rootDir: string, taskId: string): Promise<TaskDetailResult> {
  const context = await loadProjectContext(rootDir);
  return buildTaskDetailFromContext(context, taskId);
}

export function buildTaskDetailFromContext(context: ProjectContext, taskId: string, analysis?: TaskAnalysisIndex): TaskDetailResult {
  const task = context.tasks.find((entry) => entry.id === taskId);

  if (!task) {
    return {
      found: false,
      kind: "task",
      id: taskId,
      availableIds: context.tasks.map((entry) => entry.id).sort(),
    };
  }

  const taskIndex = analysis?.byId ?? buildTaskIndex(context.tasks);
  const dependencyTasks = task.dependsOn
    .map((dependencyId) => taskIndex.get(dependencyId))
    .filter((dependency): dependency is TaskDocument => Boolean(dependency))
    .map((dependency) => toDetailTaskCard(dependency, taskIndex, analysis))
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
  const summary = summarizeTaskNode(task, taskIndex, analysis);
  const blockingTasks = context.tasks
    .filter((entry) => entry.dependsOn.includes(task.id))
    .map((entry) => toDetailTaskCard(entry, taskIndex, analysis))
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));

  return {
    found: true,
    kind: "task",
    task: {
      id: task.id,
      title: task.title,
      summary: task.summary,
      status: task.status,
      priority: task.priority,
      ownerRole: task.ownerRole,
      tags: task.tags,
      updatedAt: task.updatedAt,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      cancelledAt: task.cancelledAt,
      archivedAt: task.archivedAt,
      archiveReason: task.archiveReason,
    },
    linkedSpecs: buildLinkedSpecs(context, task),
    dependencies: dependencyTasks,
    unmetDependencyIds: summary.unmetDependencies,
    blockingTasks,
    currentState: buildCurrentStateRelevance(context.currentState, { taskId: task.id }),
    relatedHandoffs: buildRelatedHandoffsForTask(context, task),
    bodySections: parseDocumentBody(task.body),
  };
}
