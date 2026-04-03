import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createSpec, createTask, initializeProject, setSpecStatus, setTaskStatus, updateCurrentState } from "../src/repository.ts";

describe("repository status updates", () => {
  test("updates a spec status and preserves the body", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);

      const spec = await setSpecStatus(rootDir, "SPEC-001", "done");
      const raw = await readFile(spec.filePath, "utf8");

      expect(spec.status).toBe("done");
      expect(spec.updatedAt).toBeDefined();
      expect(raw).toContain('status = "done"');
      expect(raw).toContain("# Problem");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("updates a task status and preserves dependency fields", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);

      const task = await setTaskStatus(rootDir, "TASK-002", "blocked");
      const raw = await readFile(task.filePath, "utf8");

      expect(task.status).toBe("blocked");
      expect(task.updatedAt).toBeDefined();
      expect(raw).toContain('status = "blocked"');
      expect(raw).toContain('depends_on = ["TASK-001"]');
      expect(raw).toContain("# Scope");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("writes lifecycle timestamps when task status changes to done and cancelled", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);

      const doneTask = await setTaskStatus(rootDir, "TASK-002", "done");
      const cancelledTask = await setTaskStatus(rootDir, "TASK-003", "cancelled");
      const doneRaw = await readFile(doneTask.filePath, "utf8");
      const cancelledRaw = await readFile(cancelledTask.filePath, "utf8");

      expect(doneTask.completedAt).toBeDefined();
      expect(cancelledTask.cancelledAt).toBeDefined();
      expect(doneRaw).toContain("completed_at = ");
      expect(cancelledRaw).toContain("cancelled_at = ");
      expect(cancelledRaw).not.toContain("completed_at = ");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("does not rewrite lifecycle timestamps when the status does not actually transition", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);

      const firstDone = await setTaskStatus(rootDir, "TASK-002", "done");
      const secondDone = await setTaskStatus(rootDir, "TASK-002", "done");
      const firstCancelled = await setTaskStatus(rootDir, "TASK-003", "cancelled");
      const secondCancelled = await setTaskStatus(rootDir, "TASK-003", "cancelled");

      expect(secondDone.completedAt).toBe(firstDone.completedAt);
      expect(secondCancelled.cancelledAt).toBe(firstCancelled.cancelledAt);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("creates a spec with a deterministic id and back-links linked tasks", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);

      const spec = await createSpec(rootDir, {
        title: "Add structured current-state updates",
        summary: "Create deterministic CLI support for current-state maintenance.",
        taskIds: ["TASK-002"],
        tags: ["self-hosting", "state"],
        owner: "human-ai",
      });

      const specRaw = await readFile(spec.filePath, "utf8");
      const taskRaw = await readFile(join(rootDir, "docs/spm/tasks/TASK-002-deterministic-resume.md"), "utf8");

      expect(spec.id).toBe("SPEC-002");
      expect(spec.filePath.endsWith("SPEC-002-add-structured-current-state-updates.md")).toBe(true);
      expect(specRaw).toContain('id = "SPEC-002"');
      expect(specRaw).toContain("# Problem");
      expect(taskRaw).toContain('spec_ids = ["SPEC-001", "SPEC-002"]');
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("creates a task with a deterministic id and back-links linked specs", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);

      const task = await createTask(rootDir, {
        title: "Create spec docs from the CLI",
        summary: "Generate new specs from deterministic CLI inputs.",
        specIds: ["SPEC-001"],
        dependsOn: ["TASK-001"],
        priority: 2,
        ownerRole: "builder",
        tags: ["self-hosting", "cli"],
      });

      const taskRaw = await readFile(task.filePath, "utf8");
      const specRaw = await readFile(join(rootDir, "docs/spm/specs/SPEC-001-deterministic-local-first-core.md"), "utf8");

      expect(task.id).toBe("TASK-004");
      expect(task.filePath.endsWith("TASK-004-create-spec-docs-from-the-cli.md")).toBe(true);
      expect(task.createdAt).toBeDefined();
      expect(taskRaw).toContain('depends_on = ["TASK-001"]');
      expect(taskRaw).toContain("created_at = ");
      expect(taskRaw).toContain("# Scope");
      expect(specRaw).toContain('task_ids = ["TASK-001", "TASK-002", "TASK-003", "TASK-004"]');
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("creates lifecycle timestamps when a task is created directly in a closed state", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);

      const doneTask = await createTask(rootDir, {
        title: "Seed a closed task",
        summary: "Create a task directly in done for deterministic imports.",
        specIds: ["SPEC-001"],
        status: "done",
      });
      const cancelledTask = await createTask(rootDir, {
        title: "Seed a cancelled task",
        summary: "Create a task directly in cancelled for deterministic imports.",
        specIds: ["SPEC-001"],
        status: "cancelled",
      });

      expect(doneTask.createdAt).toBeDefined();
      expect(doneTask.completedAt).toBeDefined();
      expect(doneTask.cancelledAt).toBeUndefined();
      expect(cancelledTask.createdAt).toBeDefined();
      expect(cancelledTask.cancelledAt).toBeDefined();
      expect(cancelledTask.completedAt).toBeUndefined();
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("initializes seed task files with created_at metadata", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);

      const seedRaw = await readFile(join(rootDir, "docs/spm/tasks/TASK-001-bootstrap-cli.md"), "utf8");
      expect(seedRaw).toContain("created_at = ");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("updates current state and preserves the body", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);

      const current = await updateCurrentState(rootDir, {
        focus: "Keep current state in sync from the CLI.",
        summary: "The CLI can now update current-state fields deterministically.",
        activeSpecIds: ["SPEC-001"],
        activeTaskIds: ["TASK-001"],
        blockedTaskIds: ["TASK-003"],
        nextActionHints: ["Use the CLI to keep project state explicit."],
      });
      const raw = await readFile(current.filePath, "utf8");

      expect(current.focus).toBe("Keep current state in sync from the CLI.");
      expect(current.activeTaskIds).toEqual(["TASK-001"]);
      expect(raw).toContain('blocked_task_ids = ["TASK-003"]');
      expect(raw).toContain('next_action_hints = ["Use the CLI to keep project state explicit."]');
      expect(raw).toContain("# Current State");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
