import { describe, expect, spyOn, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as repository from "../src/repository.ts";
import * as agents from "../src/services/agents.ts";
import * as currentEngine from "../src/engine.ts";
import * as currentDashboard from "../src/services/dashboard.ts";
import * as legacyEngine from "./fixtures/graph-baseline/engine.ts";
import * as legacyDashboard from "./fixtures/graph-baseline/dashboard.ts";
import { chainGraph, graphContext, graphTask, seededGraph, volumeGraph } from "./fixtures/graph-inputs.ts";
import type { ProjectContext } from "../src/domain.ts";

function freeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value); for (const entry of Object.values(value)) freeze(entry);
  }
  return value;
}
function cards(context: ProjectContext) {
  const index = currentEngine.buildTaskAnalysisIndex(context.tasks);
  return context.tasks.map(task => currentDashboard.toTaskCard(task, index.byId, index));
}
const health: agents.AgentsHealthReport = { config: { contextWindowTokens: 400000, rootTarget: 900, rootHardCap: 1200, chainTarget: 1800, chainHardCap: 2200 },
  files: [], chains: [], failures: [], summary: { fileCount: 0, failureCount: 0, maxFileTokens: 0, maxChainTokens: 0, ok: true } };

describe("pinned graph compatibility", () => {
  test("the legacy oracle is the pinned committed bytes with import-path-only adaptation", async () => {
    const root = new URL("./fixtures/graph-baseline/", import.meta.url);
    const provenance = JSON.parse(await readFile(new URL("provenance.json", root), "utf8"));
    expect(provenance.commit).toBe("cd01b72841f7203f085708d5e08ed9224efa5cd1");
    for (const file of provenance.files) {
      const raw = await readFile(new URL(file.raw, root));
      expect(createHash("sha256").update(raw).digest("hex")).toBe(file.sha256);
      const adapted = file.executable === "engine.ts" ? raw.toString().replace('"./domain.ts"', '"../../../src/domain.ts"')
        : raw.toString().replace('"../engine.ts"', '"./engine.ts"').replace('"../repository.ts"', '"../../../src/repository.ts"').replace('"./agents.ts"', '"../../../src/services/agents.ts"');
      expect(await readFile(new URL(file.executable, root), "utf8")).toBe(adapted);
    }
  });

  test("entire status/resume/next-action and Timeline outputs match deterministic DAGs and cycles", () => {
    const contexts = [graphContext([]), graphContext([graphTask("SELF", { dependsOn: ["SELF", "SELF", "MISSING"] })]),
      ...Array.from({ length: 80 }, (_, n) => seededGraph(n + 1, n % 2 === 0))];
    for (const context of contexts) {
      const before = JSON.stringify(context); freeze(context);
      const actual = currentEngine.deriveStatusSnapshot(context), expected = legacyEngine.deriveStatusSnapshot(context);
      expect(actual).toEqual(expected);
      expect(currentEngine.buildResumeContext(context)).toEqual(legacyEngine.buildResumeContext(context));
      expect(currentEngine.deriveNextActions(context, actual)).toEqual(legacyEngine.deriveNextActions(context, expected));
      const taskCards = freeze(cards(context)), baselineIndex = legacyEngine.buildTaskIndex(context.tasks);
      expect(taskCards).toEqual(context.tasks.map(task => legacyDashboard.toTaskCard(task, baselineIndex)));
      const specs = freeze(context.specs.map(({ id, title, status }) => ({ id, title, status })));
      for (const mode of ["active", "all"] as const) for (const selectedTaskId of [undefined, "UNKNOWN", context.tasks[0]?.id, "TASK-3"]) {
        const filters = { mode, selectedTaskId, selectedSpecIds: ["SPEC-1", "UNKNOWN", "SPEC-0", "SPEC-1"] };
        expect(currentDashboard.buildTimelineProjection(taskCards, specs, filters)).toEqual(legacyDashboard.buildTimelineProjection(taskCards, specs, filters));
      }
      expect(JSON.stringify(context)).toBe(before);
    }
  });

  test("strict ties and cache-before-cycle preserve repeated IDs and ancestor placements", () => {
    const context = freeze(graphContext([
      graphTask("ROOT", { dependsOn: ["LEFT", "RIGHT"] }),
      graphTask("LEFT"), graphTask("RIGHT", { priority: 0 }),
    ]));
    expect(currentEngine.deriveStatusSnapshot(context)).toEqual(legacyEngine.deriveStatusSnapshot(context));
    expect(currentEngine.deriveStatusSnapshot(context).criticalPath.map(task => task.id)).toEqual(["LEFT", "ROOT"]);
    const cycle = freeze(graphContext([graphTask("A", { dependsOn: ["B", "B"] }), graphTask("B", { dependsOn: ["A"] })]));
    expect(currentEngine.deriveStatusSnapshot(cycle).criticalPath.map(task => task.id)).toEqual(["A", "B", "A"]);
    const taskCards = freeze(cards(cycle));
    const result = currentDashboard.buildTimelineProjection(taskCards, cycle.specs, { mode: "all", selectedSpecIds: [], selectedTaskId: "A" });
    expect(result).toEqual(legacyDashboard.buildTimelineProjection(taskCards, cycle.specs, { mode: "all", selectedSpecIds: [], selectedTaskId: "A" }));
    expect(result.selection?.directDependencyIds).toEqual(["B", "B"]);
    expect(result.selection?.directDependentIds).toEqual(["B"]);
    expect(result.selection?.transitiveDependencyIds).toEqual(["A"]);
    expect(result.selection?.transitiveDependentIds).toEqual(["A"]);
    expect(result.groups.flatMap(group => group.rows).map(row => [row.taskId, row.start, row.end])).toEqual([["B", 4, 8], ["A", 8, 12]]);
  });

  test("complete legacy dashboard facade matches duplicates, archives, filters and lifecycle windows", async () => {
    const now = spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-15T12:00:00Z"));
    const load = spyOn(repository, "loadProjectContext");
    const report = spyOn(agents, "buildAgentsHealthReport").mockResolvedValue(health);
    try {
      for (let seed = 1; seed <= 12; seed += 1) {
        const context = freeze(seededGraph(seed, true)); const before = JSON.stringify(context); load.mockResolvedValue(context);
        for (const filter of [{}, { timelineMode: "all" }, { selectedSpecIds: [" SPEC-1 ", "SPEC-1", "UNKNOWN"], timelineMode: "all", selectedTimelineTaskId: " TASK-3 " },
          ...(["7d", "30d", "90d"] as const).map(timeWindow => ({ timeWindow, selectedSpecIds: ["SPEC-0", "SPEC-1"], selectedTimelineTaskId: "TASK-0" }))] as currentDashboard.DashboardFilterOptions[]) {
          expect(await currentDashboard.buildDashboardData("/fixture", filter)).toEqual(await legacyDashboard.buildDashboardData("/fixture", filter));
        }
        expect(JSON.stringify(context)).toBe(before);
      }
    } finally { now.mockRestore(); load.mockRestore(); report.mockRestore(); }
  });

  test("10k reverse chain completes status and selected/unselected Timeline without recursive overflow", () => {
    const context = freeze(chainGraph());
    const snapshot = currentEngine.deriveStatusSnapshot(context);
    expect(snapshot.criticalPath.length).toBe(10000);
    expect(snapshot.criticalPath[0]?.id).toBe("TASK-0"); expect(snapshot.criticalPath[9999]?.id).toBe("TASK-9999");
    const taskCards = cards(context); const specs = context.specs;
    for (const selectedTaskId of [undefined, "TASK-5000"]) {
      const result = currentDashboard.buildTimelineProjection(taskCards, specs, { mode: "all", selectedSpecIds: [], selectedTaskId });
      expect(result.taskCount).toBe(10000); expect(result.totalUnits).toBeGreaterThan(10000);
      if (selectedTaskId) { expect(result.selection?.transitiveDependencyIds.length).toBe(4999); expect(result.selection?.transitiveDependentIds.length).toBe(4998); }
    }
  }, 15000);

  test("10k tasks/2k specs/30k edges complete shared projections and full facade", async () => {
    const context = freeze(volumeGraph()); expect(context.tasks.reduce((n, task) => n + task.dependsOn.length, 0)).toBe(30000);
    expect(currentEngine.deriveStatusSnapshot(context).taskCount).toBe(10000);
    const taskCards = cards(context);
    for (const selectedTaskId of [undefined, "TASK-5000"]) {
      const result = currentDashboard.buildTimelineProjection(taskCards, context.specs, { mode: "all", selectedSpecIds: [], selectedTaskId });
      expect(result.taskCount).toBe(10000); expect(result.groups.length).toBe(2000);
    }
    const load = spyOn(repository, "loadProjectContext").mockResolvedValue(context);
    const report = spyOn(agents, "buildAgentsHealthReport").mockResolvedValue(health);
    try { const result = await currentDashboard.buildDashboardData("/fixture", { timelineMode: "all", selectedTimelineTaskId: "TASK-5000" });
      expect(result.tasks.length).toBe(10000); expect(result.specs.length).toBe(2000); expect(result.timeline.selection?.taskId).toBe("TASK-5000");
    } finally { load.mockRestore(); report.mockRestore(); }
  }, 15000);
});
