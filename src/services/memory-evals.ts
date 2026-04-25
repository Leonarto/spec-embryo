import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeProject, loadProjectContext } from "../repository.ts";
import { buildMemoryConsolidationBundle } from "./memory-consolidation.ts";
import { buildMemoryContextPack } from "./context-pack.ts";
import { buildMemoryBriefBundle } from "./memory-brief.ts";
import { buildMemoryQueryBundle } from "./memory-query.ts";

export const MEMORY_EVAL_SUITES = ["retrieval", "pack", "consolidation", "injection"] as const;
export type MemoryEvalSuite = (typeof MEMORY_EVAL_SUITES)[number];

export interface MemoryEvalCheck {
  label: string;
  pass: boolean;
  detail: string;
}

export interface MemoryEvalScenario {
  id: string;
  suite: MemoryEvalSuite;
  title: string;
  status: "pass" | "fail";
  summary: string;
  checks: MemoryEvalCheck[];
  metrics: Record<string, boolean | number | string>;
}

export interface MemoryEvalBundle {
  suites: MemoryEvalSuite[];
  overallStatus: "pass" | "fail";
  scenarioCount: number;
  passedScenarioCount: number;
  failedScenarioCount: number;
  scenarios: MemoryEvalScenario[];
}

function normalizeSuiteList(suites: MemoryEvalSuite[]): MemoryEvalSuite[] {
  return Array.from(new Set(suites)).sort((left, right) => left.localeCompare(right));
}

function pickAnchorIds(context: Awaited<ReturnType<typeof loadProjectContext>>): { specId: string; taskId: string } {
  const specId = context.currentState.activeSpecIds[0] ?? context.specs[0]?.id;
  const taskId = context.currentState.activeTaskIds[0] ?? context.tasks[0]?.id;

  if (!specId || !taskId) {
    throw new Error("Memory eval requires at least one spec and one task in managed repo memory.");
  }

  return { specId, taskId };
}

function toScenario(
  suite: MemoryEvalSuite,
  id: string,
  title: string,
  summary: string,
  checks: MemoryEvalCheck[],
  metrics: Record<string, boolean | number | string>,
): MemoryEvalScenario {
  return {
    id,
    suite,
    title,
    status: checks.every((check) => check.pass) ? "pass" : "fail",
    summary,
    checks,
    metrics,
  };
}

async function runRetrievalEval(rootDir: string): Promise<MemoryEvalScenario> {
  const context = await loadProjectContext(rootDir);
  const { specId } = pickAnchorIds(context);
  const spec = context.specs.find((entry) => entry.id === specId);
  if (!spec) {
    throw new Error(`Memory eval could not resolve anchor spec: ${specId}`);
  }

  const bundle = buildMemoryQueryBundle(context, {
    text: spec.title,
    limit: 5,
  });
  const topResult = bundle.results[0];

  const checks: MemoryEvalCheck[] = [
    {
      label: "top-result-is-anchor-spec",
      pass: topResult?.id === spec.id,
      detail: topResult ? `Top result was ${topResult.id}.` : "No retrieval results returned.",
    },
    {
      label: "top-result-explains-why-it-matched",
      pass: (topResult?.matchReasons.length ?? 0) > 0,
      detail: topResult ? `Match reasons: ${topResult.matchReasons.join(", ") || "none"}.` : "No top result available.",
    },
    {
      label: "query-returns-at-least-one-result",
      pass: bundle.results.length > 0,
      detail: `Returned ${bundle.results.length} results.`,
    },
  ];

  return toScenario(
    "retrieval",
    "retrieval-anchor-spec-title",
    "Anchor spec title query resolves to the spec itself",
    "Checks that deterministic retrieval still anchors an exact spec-title query on the intended spec with explicit match reasons.",
    checks,
    {
      anchorSpecId: spec.id,
      queryText: spec.title,
      totalMatches: bundle.totalMatches,
      topResultId: topResult?.id ?? "none",
      topReasonCount: topResult?.matchReasons.length ?? 0,
    },
  );
}

async function runPackEval(rootDir: string): Promise<MemoryEvalScenario> {
  const context = await loadProjectContext(rootDir);
  const { taskId } = pickAnchorIds(context);
  const pack = buildMemoryContextPack(context, { taskId });

  const checks: MemoryEvalCheck[] = [
    {
      label: "must-read-contains-anchor-task",
      pass: pack.mustReadNow.some((item) => item.ref === taskId),
      detail: `Must-read refs: ${pack.mustReadNow.map((item) => item.ref ?? item.kind).join(", ") || "none"}.`,
    },
    {
      label: "must-read-includes-compact-evidence",
      pass: pack.mustReadNow.some((item) => item.kind === "evidence" && item.ref === taskId),
      detail: `Must-read kinds: ${pack.mustReadNow.map((item) => item.kind).join(", ")}.`,
    },
    {
      label: "next-inspect-includes-anchor-task",
      pass: pack.nextInspectIds.includes(taskId),
      detail: `Next inspect IDs: ${pack.nextInspectIds.join(", ") || "none"}.`,
    },
  ];

  return toScenario(
    "pack",
    "pack-anchor-task-shape",
    "Task-centered context pack stays compact and anchored",
    "Checks that context-pack assembly keeps the requested task, explicit evidence, and deterministic next-inspect flow in the active bundle.",
    checks,
    {
      anchorTaskId: taskId,
      mustReadCount: pack.mustReadNow.length,
      supportingCount: pack.supporting.length,
      offloadedCount: pack.offloaded.length,
      nextInspectCount: pack.nextInspectIds.length,
    },
  );
}

async function runInjectionEval(rootDir: string): Promise<MemoryEvalScenario> {
  const context = await loadProjectContext(rootDir);
  const { taskId } = pickAnchorIds(context);
  const brief = buildMemoryBriefBundle(context, { taskId });

  const checks: MemoryEvalCheck[] = [
    {
      label: "brief-center-matches-explicit-target",
      pass: brief.center?.id === taskId,
      detail: brief.center ? `Center resolved to ${brief.center.id}.` : "No center document returned.",
    },
    {
      label: "brief-carries-section-evidence",
      pass: (brief.center?.evidence.length ?? 0) > 0,
      detail: `Evidence count: ${brief.center?.evidence.length ?? 0}.`,
    },
    {
      label: "brief-next-inspect-starts-with-target",
      pass: brief.nextInspectIds[0] === taskId,
      detail: `Next inspect IDs: ${brief.nextInspectIds.join(", ") || "none"}.`,
    },
  ];

  return toScenario(
    "injection",
    "injection-explicit-task-brief",
    "Explicit brief keeps source-of-truth target first",
    "Checks that the brief path injects the requested task as the center, carries section-level evidence, and keeps the target first in the follow-up expansion order.",
    checks,
    {
      anchorTaskId: taskId,
      centerId: brief.center?.id ?? "none",
      evidenceCount: brief.center?.evidence.length ?? 0,
      nextInspectHead: brief.nextInspectIds[0] ?? "none",
      neighborCount: brief.neighbors.length,
    },
  );
}

async function writeFixtureNote(rootDir: string): Promise<void> {
  const dir = join(rootDir, ".specpm", "memory", "session");
  await mkdir(dir, { recursive: true });

  await Bun.write(
    join(dir, "NOTE-SESSION-100-adopt-spec-memory.md"),
    `+++
doc_kind = "memory-note"
id = "NOTE-SESSION-100"
title = "Adopt Spec Embryo memory for this repository"
summary = "Session-local rewrite candidate for repo direction."
tags = ["session", "capture"]
expires_at = "2025-01-01T00:00:00.000Z"
updated_at = "2026-04-26T00:00:00.000Z"
+++

# Notes

Capture a cleaner explanation for the current repo direction.
`,
  );

  await Bun.write(
    join(dir, "NOTE-SESSION-101-adopt-spec-memory-copy.md"),
    `+++
doc_kind = "memory-note"
id = "NOTE-SESSION-101"
title = "Adopt Spec Embryo memory for this repository"
summary = "Session-local rewrite candidate for repo direction."
tags = ["session", "duplicate"]
updated_at = "2026-04-26T00:00:00.000Z"
+++

Duplicate scratch note.
`,
  );
}

async function runConsolidationEval(): Promise<MemoryEvalScenario> {
  const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-eval-"));

  try {
    await initializeProject(rootDir);
    await writeFixtureNote(rootDir);

    const dryRun = await buildMemoryConsolidationBundle(rootDir, {
      noteId: "NOTE-SESSION-100",
    });
    const applied = await buildMemoryConsolidationBundle(rootDir, {
      noteId: "NOTE-SESSION-100",
      apply: true,
    });

    const checks: MemoryEvalCheck[] = [
      {
        label: "dry-run-detects-duplicates",
        pass: dryRun.duplicateNoteIds.includes("NOTE-SESSION-101"),
        detail: `Duplicate note IDs: ${dryRun.duplicateNoteIds.join(", ") || "none"}.`,
      },
      {
        label: "dry-run-detects-staleness",
        pass: dryRun.staleReasons.some((reason) => reason.startsWith("expired:")),
        detail: `Stale reasons: ${dryRun.staleReasons.join(", ") || "none"}.`,
      },
      {
        label: "apply-creates-durable-handoff",
        pass: Boolean(applied.createdHandoffId) && applied.retiredSource === true,
        detail: `Created handoff: ${applied.createdHandoffId ?? "none"}; retired source: ${applied.retiredSource ? "yes" : "no"}.`,
      },
    ];

    return toScenario(
      "consolidation",
      "consolidation-synthetic-session-note",
      "Synthetic session note consolidates into durable repo memory",
      "Checks the dry-run and apply path together so duplicate, stale-note, and durable-promotion behavior stay observable without mutating the current repo.",
      checks,
      {
        duplicateCount: dryRun.duplicateNoteIds.length,
        contradictionCount: dryRun.contradictionIds.length,
        staleReasonCount: dryRun.staleReasons.length,
        relatedRepoDocCount: dryRun.relatedRepoIds.length,
        createdHandoffId: applied.createdHandoffId ?? "none",
      },
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

export async function buildMemoryEvalBundle(
  rootDir: string,
  suites: MemoryEvalSuite[],
): Promise<MemoryEvalBundle> {
  const selectedSuites = normalizeSuiteList(suites);
  const scenarios: MemoryEvalScenario[] = [];

  for (const suite of selectedSuites) {
    if (suite === "retrieval") {
      scenarios.push(await runRetrievalEval(rootDir));
      continue;
    }

    if (suite === "pack") {
      scenarios.push(await runPackEval(rootDir));
      continue;
    }

    if (suite === "injection") {
      scenarios.push(await runInjectionEval(rootDir));
      continue;
    }

    scenarios.push(await runConsolidationEval());
  }

  const passedScenarioCount = scenarios.filter((scenario) => scenario.status === "pass").length;
  const failedScenarioCount = scenarios.length - passedScenarioCount;

  return {
    suites: selectedSuites,
    overallStatus: failedScenarioCount === 0 ? "pass" : "fail",
    scenarioCount: scenarios.length,
    passedScenarioCount,
    failedScenarioCount,
    scenarios,
  };
}

export function renderMemoryEvalBundle(bundle: MemoryEvalBundle): string {
  const lines = [
    `Memory eval: ${bundle.overallStatus}`,
    `Suites: ${bundle.suites.join(", ")}`,
    `Scenarios: ${bundle.scenarioCount} total | ${bundle.passedScenarioCount} pass | ${bundle.failedScenarioCount} fail`,
    "",
    "Scenario results:",
  ];

  for (const scenario of bundle.scenarios) {
    lines.push(`- [${scenario.suite}] ${scenario.id}: ${scenario.status}`);
    lines.push(`  ${scenario.title}`);
    lines.push(`  ${scenario.summary}`);

    const failedChecks = scenario.checks.filter((check) => !check.pass);
    if (failedChecks.length > 0) {
      for (const check of failedChecks) {
        lines.push(`  failed ${check.label}: ${check.detail}`);
      }
    } else {
      lines.push(`  checks: ${scenario.checks.length} passed`);
    }
  }

  return lines.join("\n");
}
