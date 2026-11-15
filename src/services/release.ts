import type { ProjectContext } from "../domain.ts";

interface ReleaseCandidate {
  id: string;
  title: string;
  kind: "spec" | "task";
  tags: string[];
  timestamp?: string;
}

export interface ReleasePlan {
  project: string;
  recommendation: "patch" | "minor" | "major";
  reasons: string[];
  ready: boolean;
  checks: Array<{ name: string; pass: boolean; detail: string }>;
  notes: string[];
}

export function buildReleasePlan(context: ProjectContext): ReleasePlan {
  const doneSpecs: ReleaseCandidate[] = context.specs
    .filter((spec) => spec.status === "done")
    .map((spec) => ({
      id: spec.id,
      title: spec.title,
      kind: "spec",
      tags: spec.tags,
      timestamp: spec.updatedAt,
    }));
  const doneTasks: ReleaseCandidate[] = context.tasks
    .filter((task) => task.status === "done")
    .map((task) => ({
      id: task.id,
      title: task.title,
      kind: "task",
      tags: task.tags,
      timestamp: task.completedAt ?? task.updatedAt,
    }));
  const openReview = context.tasks.filter((task) => task.status === "review");
  const blocked = context.tasks.filter((task) => task.status === "blocked");
  const doneCandidates = [...doneSpecs, ...doneTasks].sort(compareReleaseCandidates);
  const latestDay = doneCandidates.map((candidate) => timestampDay(candidate.timestamp)).find((day): day is string => Boolean(day));
  const releaseCandidates = latestDay
    ? doneCandidates.filter((candidate) => timestampDay(candidate.timestamp) === latestDay)
    : doneCandidates.slice(0, 10);
  const hasFeatureSignals =
    releaseCandidates.some((candidate) => candidate.kind === "spec") ||
    releaseCandidates.some((candidate) => candidate.tags.some((tag) => ["feature", "adoption", "workflow"].includes(tag)));

  const checks = [
    {
      name: "no-review-tasks",
      pass: openReview.length === 0,
      detail: openReview.length === 0 ? "No tasks are waiting in review." : `${openReview.length} task(s) still in review.`,
    },
    {
      name: "doctor-before-publish",
      pass: true,
      detail: "Run `spm doctor` immediately before publishing.",
    },
    {
      name: "blocked-work-visible",
      pass: true,
      detail: blocked.length === 0 ? "No blocked tasks recorded." : `${blocked.length} blocked task(s) remain visible.`,
    },
  ];

  return {
    project: context.config.projectName,
    recommendation: hasFeatureSignals ? "minor" : "patch",
    reasons: hasFeatureSignals ? ["completed feature/workflow specs or tasks are present"] : ["no completed feature-scale signal was detected"],
    ready: checks.every((check) => check.pass),
    checks,
    notes: [
      ...releaseCandidates.slice(0, 10).map((candidate) => `${candidate.id}: ${candidate.title}`),
    ],
  };
}

function timestampDay(timestamp: string | undefined): string | undefined {
  if (!timestamp) {
    return undefined;
  }

  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : undefined;
}

function timestampMillis(timestamp: string | undefined): number {
  if (!timestamp) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function compareReleaseCandidates(left: ReleaseCandidate, right: ReleaseCandidate): number {
  return timestampMillis(right.timestamp) - timestampMillis(left.timestamp) || left.id.localeCompare(right.id);
}

export function renderReleasePlan(plan: ReleasePlan): string {
  return [
    "Release plan",
    `Project: ${plan.project}`,
    `Recommended bump: ${plan.recommendation}`,
    `Ready: ${plan.ready ? "yes" : "no"}`,
    "",
    "Reasons:",
    ...plan.reasons.map((reason) => `- ${reason}`),
    "",
    "Checks:",
    ...plan.checks.map((check) => `- ${check.pass ? "PASS" : "FAIL"} ${check.name}: ${check.detail}`),
    "",
    "Release notes candidates:",
    ...(plan.notes.length > 0 ? plan.notes.map((note) => `- ${note}`) : ["- No completed managed work found."]),
  ].join("\n");
}
