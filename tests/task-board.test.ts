import { describe, expect, test } from "bun:test";
import { countKanbanTasks, filterKanbanBySpecs, groupTaskPage, matchesSelectedSpecs } from "../web/src/lib/task-board.ts";
import type { DashboardKanbanColumn, DashboardTaskCard } from "../src/services/dashboard.ts";

function createTask(overrides: Partial<DashboardTaskCard>): DashboardTaskCard {
  return {
    id: "TASK-001",
    title: "Task",
    summary: "Summary",
    rawStatus: "todo",
    effectiveStatus: "todo",
    priority: 2,
    specIds: ["SPEC-001"],
    dependsOn: [],
    unmetDependencies: [],
    downstreamCount: 0,
    effort: 3,
    ...overrides,
  };
}

describe("task board helpers", () => {
  test("groups only the received page without reordering it and preserves cancelled lane semantics", () => {
    const page = [createTask({id:"TASK-B",effectiveStatus:"done"}),createTask({id:"TASK-A",effectiveStatus:"cancelled"}),createTask({id:"TASK-C",rawStatus:"todo",effectiveStatus:"blocked"})];
    const columns = groupTaskPage(page);
    expect(columns.map(column=>column.id)).toEqual(["blocked","todo","in_progress","review","done"]);
    expect(columns.find(column=>column.id==="done")?.tasks.map(task=>task.id)).toEqual(["TASK-B","TASK-A"]);
    expect(columns.find(column=>column.id==="blocked")?.tasks.map(task=>task.id)).toEqual(["TASK-C"]);
    expect(countKanbanTasks(columns)).toBe(page.length);
  });
  test("matches any selected spec and all tasks when no filter exists", () => {
    expect(matchesSelectedSpecs(createTask({ specIds: ["SPEC-001", "SPEC-002"] }), [])).toBe(true);
    expect(matchesSelectedSpecs(createTask({ specIds: ["SPEC-001", "SPEC-002"] }), ["SPEC-002"])).toBe(true);
    expect(matchesSelectedSpecs(createTask({ specIds: ["SPEC-001", "SPEC-002"] }), ["SPEC-003", "SPEC-002"])).toBe(true);
    expect(matchesSelectedSpecs(createTask({ specIds: ["SPEC-001"] }), ["SPEC-005"])).toBe(false);
  });

  test("filters each kanban lane by selected specs", () => {
    const columns: DashboardKanbanColumn[] = [
      {
        id: "todo",
        title: "Todo",
        tasks: [
          createTask({ id: "TASK-001", specIds: ["SPEC-001"] }),
          createTask({ id: "TASK-002", specIds: ["SPEC-002"] }),
        ],
      },
      {
        id: "review",
        title: "Review",
        tasks: [createTask({ id: "TASK-003", effectiveStatus: "review", rawStatus: "review", specIds: ["SPEC-001", "SPEC-003"] })],
      },
    ];

    const filtered = filterKanbanBySpecs(columns, ["SPEC-001", "SPEC-003"]);

    expect(filtered[0]?.tasks.map((task) => task.id)).toEqual(["TASK-001"]);
    expect(filtered[1]?.tasks.map((task) => task.id)).toEqual(["TASK-003"]);
    expect(countKanbanTasks(filtered)).toBe(2);
  });
});
