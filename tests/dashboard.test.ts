import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildDashboardData } from "../src/services/dashboard.ts";
import { archiveTask, initializeProject, setTaskStatus } from "../src/repository.ts";

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

  test("excludes archived tasks from active-flow views by default", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-dashboard-"));

    try {
      await initializeProject(rootDir);
      await setTaskStatus(rootDir, "TASK-001", "done");
      await setTaskStatus(rootDir, "TASK-002", "done");
      await archiveTask(rootDir, "TASK-002", { reason: "Aged out." });

      const dashboard = await buildDashboardData(rootDir);
      const doneColumn = dashboard.kanban.find((column) => column.id === "done");

      expect(dashboard.tasks.some((task) => task.id === "TASK-002" && task.archivedAt)).toBe(true);
      expect(dashboard.analysisTasks.some((task) => task.id === "TASK-002")).toBe(false);
      expect(doneColumn?.tasks.some((task) => task.id === "TASK-002")).toBe(false);
      expect(dashboard.timeline.items.some((item) => item.taskId === "TASK-002")).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("includes archived tasks in analytical slices when filtering by spec", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-dashboard-"));

    try {
      await initializeProject(rootDir);
      await setTaskStatus(rootDir, "TASK-002", "done");
      await archiveTask(rootDir, "TASK-002", { reason: "Aged out." });

      const dashboard = await buildDashboardData(rootDir, {
        selectedSpecIds: ["SPEC-001"],
      });

      expect(dashboard.analysis.hasActiveFilters).toBe(true);
      expect(dashboard.analysis.includesArchived).toBe(true);
      expect(dashboard.analysis.selectedSpecIds).toEqual(["SPEC-001"]);
      expect(dashboard.analysisTasks.some((task) => task.id === "TASK-002" && task.archivedAt)).toBe(true);
      expect(dashboard.timeline.items.some((item) => item.taskId === "TASK-002")).toBe(true);
      expect(dashboard.kanban.some((column) => column.tasks.some((task) => task.id === "TASK-002"))).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("matches any selected spec once in analytical slices", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-dashboard-"));

    try {
      await initializeProject(rootDir);
      const dashboard = await buildDashboardData(rootDir, {
        selectedSpecIds: ["SPEC-001", "SPEC-005", "SPEC-001"],
      });

      expect(dashboard.analysis.selectedSpecIds).toEqual(["SPEC-001"]);
      expect(dashboard.analysisTasks.map((task) => task.id)).toEqual(["TASK-001", "TASK-002", "TASK-003"]);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("uses lifecycle timestamps for time-window analytical filtering", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-dashboard-"));

    try {
      await initializeProject(rootDir);
      await setTaskStatus(rootDir, "TASK-002", "done");
      await archiveTask(rootDir, "TASK-002", { reason: "Aged out." });

      const freshTaskPath = join(rootDir, "docs/spm/tasks/TASK-002-deterministic-resume.md");
      const agedTaskPath = join(rootDir, "docs/spm/tasks/TASK-001-bootstrap-cli.md");

      await Bun.write(
        freshTaskPath,
        (await Bun.file(freshTaskPath).text()).replace(
          /completed_at = ".*"/,
          'completed_at = "2099-01-01T00:00:00.000Z"',
        ),
      );
      await Bun.write(
        agedTaskPath,
        (await Bun.file(agedTaskPath).text()).replace(
          /completed_at = ".*"/,
          'completed_at = "2000-01-01T00:00:00.000Z"',
        ),
      );

      const dashboard = await buildDashboardData(rootDir, {
        timeWindow: "7d",
      });

      expect(dashboard.analysis.hasActiveFilters).toBe(true);
      expect(dashboard.analysisTasks.map((task) => task.id)).toContain("TASK-002");
      expect(dashboard.analysisTasks.map((task) => task.id)).not.toContain("TASK-001");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
