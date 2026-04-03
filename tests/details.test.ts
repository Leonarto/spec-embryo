import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { archiveTask, initializeProject, setTaskStatus } from "../src/repository.ts";
import { buildSpecDetailData, buildTaskDetailData } from "../src/services/details.ts";

describe("detail service", () => {
  test("builds a spec detail payload with linked tasks and body sections", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-details-"));

    try {
      await initializeProject(rootDir);
      const detail = await buildSpecDetailData(rootDir, "SPEC-001");

      expect(detail.found).toBe(true);
      if (!detail.found) {
        return;
      }

      expect(detail.spec.id).toBe("SPEC-001");
      expect(detail.linkedTasks.map((task) => task.id)).toEqual(["TASK-001", "TASK-002", "TASK-003"]);
      expect(detail.linkedTaskGroups.map((group) => group.id)).toEqual(["in_progress", "blocked"]);
      expect(detail.progress.inProgress).toBe(1);
      expect(detail.bodySections.length).toBeGreaterThan(0);
      expect(detail.currentState.focus.length).toBeGreaterThan(0);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("builds a task detail payload with dependency and archival context", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-details-"));

    try {
      await initializeProject(rootDir);
      await setTaskStatus(rootDir, "TASK-002", "done");
      await archiveTask(rootDir, "TASK-002", { reason: "Aged out." });

      const detail = await buildTaskDetailData(rootDir, "TASK-002");

      expect(detail.found).toBe(true);
      if (!detail.found) {
        return;
      }

      expect(detail.task.id).toBe("TASK-002");
      expect(detail.linkedSpecs.map((spec) => spec.id)).toEqual(["SPEC-001"]);
      expect(detail.dependencies.map((task) => task.id)).toEqual(["TASK-001"]);
      expect(detail.task.archivedAt).toBeTruthy();
      expect(detail.task.archiveReason).toBe("Aged out.");
      expect(detail.bodySections.length).toBeGreaterThan(0);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("returns deterministic not-found results", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-details-"));

    try {
      await initializeProject(rootDir);

      const missingSpec = await buildSpecDetailData(rootDir, "SPEC-999");
      const missingTask = await buildTaskDetailData(rootDir, "TASK-999");

      expect(missingSpec.found).toBe(false);
      expect(missingSpec.availableIds).toContain("SPEC-001");
      expect(missingTask.found).toBe(false);
      expect(missingTask.availableIds).toContain("TASK-001");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
