import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildDashboardData } from "../src/services/dashboard.ts";
import { initializeProject, setTaskStatus } from "../src/repository.ts";

describe("dashboard service", () => {
  test("builds a serialized dashboard view from the repo files", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-dashboard-"));

    try {
      await initializeProject(rootDir);
      const dashboard = await buildDashboardData(rootDir);

      expect(dashboard.project.name).toBeTruthy();
      expect(dashboard.counts.specs).toBeGreaterThan(0);
      expect(dashboard.counts.tasks).toBeGreaterThan(0);
      expect(dashboard.specs.some((spec) => spec.id === "SPEC-001")).toBe(true);
      expect(dashboard.inProgressTasks.some((task) => task.id === "TASK-001")).toBe(true);
      expect(dashboard.kanban.some((column) => column.id === "blocked")).toBe(true);
      expect(dashboard.kanban.map((column) => column.id)).toEqual(["blocked", "todo", "in_progress", "review", "done"]);
      expect(dashboard.kanban.find((column) => column.id === "review")?.tasks).toEqual([]);
      expect(dashboard.timeline.items.some((item) => item.taskId === "TASK-001")).toBe(true);
      expect(dashboard.tasks.find((task) => task.id === "TASK-002")?.effectiveStatus).toBe("blocked");
      expect((dashboard.project as Record<string, unknown>).rootDir).toBeUndefined();
      expect((dashboard.git as Record<string, unknown>).shortStatus).toBeUndefined();
      expect((dashboard.git as Record<string, unknown>).lastCommit).toBeUndefined();
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("surfaces review tasks in the dedicated kanban lane", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-dashboard-"));

    try {
      await initializeProject(rootDir);
      await setTaskStatus(rootDir, "TASK-002", "review");

      const dashboard = await buildDashboardData(rootDir);
      const reviewColumn = dashboard.kanban.find((column) => column.id === "review");

      expect(dashboard.counts.reviewTasks).toBe(1);
      expect(reviewColumn?.tasks.map((task) => task.id)).toEqual(["TASK-002"]);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("uses spec task_ids as the source for spec progress counts", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-dashboard-"));

    try {
      await initializeProject(rootDir);
      const dashboard = await buildDashboardData(rootDir);
      const spec = dashboard.specs.find((entry) => entry.id === "SPEC-001");

      expect(spec?.taskIds).toEqual(["TASK-001", "TASK-002", "TASK-003"]);
      expect(spec?.linkedTaskCount).toBe(3);
      expect(spec?.progress.done).toBe(0);
      expect(spec?.progress.inProgress).toBe(1);
      expect(spec?.progress.blocked).toBe(2);
      expect(spec?.progress.todo).toBe(0);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
