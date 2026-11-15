import type { ProjectContext, SpecDocument, TaskDocument } from "../../src/domain.ts";
import { createDefaultConfig } from "../../src/repository.ts";

export function graphTask(id: string, patch: Partial<TaskDocument> = {}): TaskDocument {
  return { docKind: "task", id, title: id, summary: `Summary ${id}`, status: "todo", priority: 2,
    specIds: ["SPEC-0"], dependsOn: [], blockedBy: [], tags: [], body: "Task source", filePath: `/fixture/${id}.md`, ...patch };
}
export function graphSpec(id: string, taskIds: string[], patch: Partial<SpecDocument> = {}): SpecDocument {
  return { docKind: "spec", id, title: `First ${id}`, summary: `Summary ${id}`, status: "active", taskIds,
    tags: [], body: "Spec source", filePath: `/fixture/${id}.md`, ...patch };
}
export function graphContext(tasks: TaskDocument[], specs: SpecDocument[] = [graphSpec("SPEC-0", tasks.map(task => task.id))]): ProjectContext {
  return { rootDir: "/fixture", config: createDefaultConfig("/fixture"), tasks, specs, handoffs: [], sessionNotes: [], orgNotes: [],
    currentState: { docKind: "current-state", id: "CURRENT", title: "Current", summary: "Shared graph fixture", focus: "Preserve behavior",
      activeSpecIds: [], activeTaskIds: [], blockedTaskIds: [], nextActionHints: [], tags: [], body: "Current source", filePath: "/fixture/current.md" },
    git: { available: true, branch: "fixture", dirty: false, shortStatus: [] } };
}
export function seededGraph(seed: number, cyclic: boolean): ProjectContext {
  let state = seed >>> 0;
  const random = (limit: number) => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % limit; };
  const statuses = ["todo", "blocked", "in_progress", "review", "done", "cancelled"] as const;
  const tasks: TaskDocument[] = [];
  for (let i = 0; i < 18; i += 1) {
    const dependencies: string[] = [];
    for (let edge = 0, count = random(5); edge < count; edge += 1) {
      const target = random(cyclic ? 20 : i + 1);
      dependencies.push(target === i && !cyclic ? "MISSING" : `TASK-${target}`);
      if (random(4) === 0) dependencies.push(dependencies[dependencies.length - 1]!);
    }
    const status = statuses[random(statuses.length)]!;
    tasks.push(graphTask(`TASK-${i}`, { status, dependsOn: dependencies, specIds: random(4) ? [`SPEC-${random(3)}`] : [], priority: random(5) - 1,
      ...(status === "done" ? { completedAt: random(2) ? "2026-11-14T00:00:00Z" : "2020-01-01T00:00:00Z" } : {}),
      ...(status === "cancelled" ? { cancelledAt: "2026-11-13T00:00:00Z" } : {}),
      ...(random(4) === 0 ? { archivedAt: "2026-11-14T00:00:00Z", archiveReason: "Fixture archive" } : {}) }));
  }
  if (cyclic) tasks.push(graphTask("TASK-3", { title: "Last duplicate task", dependsOn: ["TASK-3", "TASK-0", "TASK-0"], status: "review", specIds: ["SPEC-1", "SPEC-0"] }));
  const specs = [0, 1, 2].map(n => graphSpec(`SPEC-${n}`, tasks.filter(task => task.specIds.includes(`SPEC-${n}`)).map(task => task.id)));
  specs.push(graphSpec("SPEC-1", ["TASK-3", "TASK-3", "MISSING"], { title: "Later duplicate spec", status: "archived" }));
  const context = graphContext(tasks, specs);
  if (seed % 3 === 0) { context.currentState.activeTaskIds = ["TASK-0", "TASK-0", "UNKNOWN"]; context.currentState.activeSpecIds = ["SPEC-1", "SPEC-1", "UNKNOWN"]; }
  return context;
}

/** Reverse source order forces a full-depth initial traversal instead of cache hits. */
export function chainGraph(count = 10000): ProjectContext {
  return graphContext(Array.from({ length: count }, (_, n) => graphTask(`TASK-${count - n - 1}`, {
    dependsOn: count - n - 1 ? [`TASK-${count - n - 2}`] : [],
  })));
}
/** Exactly 10k tasks / 2k specs / 30k existing DAG edges. */
export function volumeGraph(): ProjectContext {
  const specs = Array.from({ length: 2000 }, (_, n) => graphSpec(`SPEC-${n}`, []));
  const tasks = Array.from({ length: 10000 }, (_, n) => {
    const task = graphTask(`TASK-${n}`, { specIds: [`SPEC-${n % 2000}`],
      dependsOn: n < 3 ? Array.from({ length: n }, (_, dependency) => `TASK-${dependency}`)
        : [`TASK-${n - 1}`, `TASK-${n - 2}`, `TASK-${n - 3}`, ...(n >= 10 && n < 16 ? ["TASK-0"] : [])] });
    specs[n % 2000]!.taskIds.push(task.id);
    return task;
  });
  return graphContext(tasks.reverse(), specs);
}
