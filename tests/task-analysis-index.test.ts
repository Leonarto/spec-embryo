import { describe, expect, test } from "bun:test";
import { TASK_STATUSES, type TaskDocument } from "../src/domain.ts";
import { buildTaskAnalysisIndex, buildTaskIndex, summarizeTaskNode } from "../src/engine.ts";

function task(id: string, dependsOn: string[] = [], status: TaskDocument["status"] = "todo"): TaskDocument {
  return { docKind: "task", id, title: id, summary: "Fixture", status, dependsOn, specIds: [], blockedBy: [], priority: 2, tags: [], body: "", filePath: `/fixture/${id}.md` };
}

describe("task analysis index", () => {
  test("counts direct dependent tasks once and only done satisfies a dependency", () => {
    const tasks = [task("TASK-1", [], "done"), task("TASK-2", [], "cancelled"), task("TASK-3", ["TASK-1", "TASK-1", "TASK-2", "MISSING"]), task("TASK-4", ["TASK-3"]), task("TASK-5", ["TASK-4", "TASK-3"])];
    const analysis = buildTaskAnalysisIndex(tasks);
    expect(analysis.directDependentCounts.get("TASK-1")).toBe(1);
    expect(analysis.directDependents.get("TASK-1")?.map(t => t.id)).toEqual(["TASK-3"]);
    expect(summarizeTaskNode(tasks[2]!, analysis.byId, analysis).unmetDependencies).toEqual(["TASK-2", "MISSING"]);
    expect(summarizeTaskNode(tasks[2]!, analysis.byId, analysis).downstreamCount).toBe(2);
    expect(analysis.directDependentCounts.get("MISSING")).toBe(1);
  });

  test("matches legacy summaries for seeded graphs with cycles, missing refs, and duplicate edges", () => {
    let seed = 0x625001;
    const next = (max: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
    for (let round = 0; round < 100; round++) {
      const tasks = Array.from({ length: 32 }, (_, n) => task(`TASK-${n}`, Array.from({ length: next(6) }, () => `TASK-${next(36)}`), TASK_STATUSES[next(TASK_STATUSES.length)]!));
      const analysis = buildTaskAnalysisIndex(tasks);
      for (const node of tasks) expect(summarizeTaskNode(node, analysis.byId, analysis)).toEqual(summarizeTaskNode(node, analysis.byId));
    }
  });

  test("preserves last-ID-wins semantics, array isolation, and fallback for unrelated indexes", () => {
    const original = task("TASK-1", ["MISSING"]);
    const replacement = task("TASK-1", []);
    const child = task("TASK-2", ["TASK-1", "MISSING", "MISSING"]);
    const analysis = buildTaskAnalysisIndex([original, replacement, child]);
    expect(analysis.byId.get("TASK-1")).toBe(replacement);
    expect(analysis.directDependentCounts.get("MISSING")).toBe(1);
    expect(summarizeTaskNode(original, analysis.byId, analysis)).toEqual(summarizeTaskNode(original, analysis.byId));
    const result = summarizeTaskNode(child, analysis.byId, analysis);
    result.unmetDependencies.length = 0;
    expect(analysis.unmetDependencies.get(child.id)).toEqual(["TASK-1", "MISSING", "MISSING"]);
    const other = buildTaskIndex([original]);
    expect(summarizeTaskNode(original, other, analysis)).toEqual(summarizeTaskNode(original, other));
  });

  test("builds and summarizes a 10,000-node chain without graph recursion", () => {
    const tasks = Array.from({ length: 10_000 }, (_, n) => task(`TASK-${n}`, n < 9999 ? [`TASK-${n + 1}`] : []));
    const analysis = buildTaskAnalysisIndex(tasks);
    expect(analysis.byId.size).toBe(10_000);
    expect(analysis.directDependentCounts.get("TASK-9999")).toBe(1);
    expect(summarizeTaskNode(tasks[9999]!, analysis.byId, analysis).downstreamCount).toBe(1);
    expect(summarizeTaskNode(tasks[0]!, analysis.byId, analysis).unmetDependencies).toEqual(["TASK-1"]);
  });
});
