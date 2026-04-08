import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  archiveCancelledTasks,
  archiveDoneTasks,
  archiveTask,
  answerSpecOpenQuestions,
  createSpec,
  createTask,
  initializeProject,
  restoreTask,
  setSpecStatus,
  setTaskStatus,
  updateCurrentState,
} from "../src/repository.ts";
import { CLI_VERSION } from "../src/services/version.ts";

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
      expect(raw).toContain("# Purpose");
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
      const taskRaw = await readFile(join(rootDir, "docs/spm/tasks/TASK-002-create-or-import-the-first-real-project-spec.md"), "utf8");

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
      const specRaw = await readFile(join(rootDir, "docs/spm/specs/SPEC-001-adopt-spec-embryo-memory-for-this-repository.md"), "utf8");

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

  test("serializes concurrent task creation so ids stay unique", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);

      const created = await Promise.all([
        createTask(rootDir, {
          title: "Parallel task one",
          summary: "First concurrent task.",
          specIds: ["SPEC-001"],
        }),
        createTask(rootDir, {
          title: "Parallel task two",
          summary: "Second concurrent task.",
          specIds: ["SPEC-001"],
        }),
        createTask(rootDir, {
          title: "Parallel task three",
          summary: "Third concurrent task.",
          specIds: ["SPEC-001"],
        }),
      ]);

      const ids = created.map((task) => task.id).sort();
      const specRaw = await readFile(join(rootDir, "docs/spm/specs/SPEC-001-adopt-spec-embryo-memory-for-this-repository.md"), "utf8");

      expect(ids).toEqual(["TASK-004", "TASK-005", "TASK-006"]);
      expect(new Set(ids).size).toBe(3);
      expect(specRaw).toContain('"TASK-004"');
      expect(specRaw).toContain('"TASK-005"');
      expect(specRaw).toContain('"TASK-006"');
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("serializes concurrent spec creation so ids stay unique", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);

      const created = await Promise.all([
        createSpec(rootDir, {
          title: "Parallel spec one",
          summary: "First concurrent spec.",
          taskIds: ["TASK-001"],
        }),
        createSpec(rootDir, {
          title: "Parallel spec two",
          summary: "Second concurrent spec.",
          taskIds: ["TASK-001"],
        }),
        createSpec(rootDir, {
          title: "Parallel spec three",
          summary: "Third concurrent spec.",
          taskIds: ["TASK-001"],
        }),
      ]);

      const ids = created.map((spec) => spec.id).sort();
      const taskRaw = await readFile(join(rootDir, "docs/spm/tasks/TASK-001-inventory-the-real-project-direction-and-existing-docs.md"), "utf8");

      expect(ids).toEqual(["SPEC-002", "SPEC-003", "SPEC-004"]);
      expect(new Set(ids).size).toBe(3);
      expect(taskRaw).toContain('"SPEC-002"');
      expect(taskRaw).toContain('"SPEC-003"');
      expect(taskRaw).toContain('"SPEC-004"');
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

      const seedRaw = await readFile(join(rootDir, "docs/spm/tasks/TASK-001-inventory-the-real-project-direction-and-existing-docs.md"), "utf8");
      expect(seedRaw).toContain("created_at = ");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("writes the current CLI version into the project config during init", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);

      const configRaw = await readFile(join(rootDir, ".specpm/config.toml"), "utf8");
      expect(configRaw).toContain(`tool_version = "${CLI_VERSION}"`);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("does not reseed onboarding specs and tasks into an already adopted repo", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);
      await createSpec(rootDir, {
        title: "Real project spec",
        summary: "A project-specific spec should prevent reseeding scaffold.",
      });

      await initializeProject(rootDir);

      expect(await Bun.file(join(rootDir, "docs/spm/specs/SPEC-001-adopt-spec-embryo-memory-for-this-repository.md")).exists()).toBe(true);
      expect(await Bun.file(join(rootDir, "docs/spm/specs/SPEC-003-adopt-spec-embryo-memory-for-this-repository.md")).exists()).toBe(false);
      expect(await Bun.file(join(rootDir, "docs/spm/tasks/TASK-005-inventory-the-real-project-direction-and-existing-docs.md")).exists()).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("archives a closed task and preserves its closed status", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);
      await setTaskStatus(rootDir, "TASK-002", "done");

      const archived = await archiveTask(rootDir, "TASK-002", {
        reason: "Aged out of the active board.",
      });
      const raw = await readFile(archived.filePath, "utf8");

      expect(archived.status).toBe("done");
      expect(archived.archivedAt).toBeDefined();
      expect(archived.archiveReason).toBe("Aged out of the active board.");
      expect(raw).toContain("archived_at = ");
      expect(raw).toContain('archive_reason = "Aged out of the active board."');
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("restores an archived task by clearing archival metadata", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);
      await setTaskStatus(rootDir, "TASK-002", "done");
      await archiveTask(rootDir, "TASK-002", { reason: "Aged out." });

      const restored = await restoreTask(rootDir, "TASK-002");
      const raw = await readFile(restored.filePath, "utf8");

      expect(restored.archivedAt).toBeUndefined();
      expect(restored.archiveReason).toBeUndefined();
      expect(raw).not.toContain("archived_at = ");
      expect(raw).not.toContain("archive_reason = ");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("archives done and cancelled tasks by explicit lifecycle age", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);

      const doneTask = await createTask(rootDir, {
        title: "Old done task",
        summary: "A historical completed task.",
        specIds: ["SPEC-001"],
        status: "done",
      });
      const cancelledTask = await createTask(rootDir, {
        title: "Old cancelled task",
        summary: "A historical cancelled task.",
        specIds: ["SPEC-001"],
        status: "cancelled",
      });

      const doneArchived = await archiveDoneTasks(rootDir, "0d", { reason: "Done archive sweep." });
      const cancelledArchived = await archiveCancelledTasks(rootDir, "0d", { reason: "Cancelled archive sweep." });

      expect(doneArchived.map((task) => task.id)).toContain(doneTask.id);
      expect(cancelledArchived.map((task) => task.id)).toContain(cancelledTask.id);
      expect(doneArchived.every((task) => task.archivedAt)).toBe(true);
      expect(cancelledArchived.every((task) => task.archivedAt)).toBe(true);
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

  test("answers open questions and rewrites the spec deterministically", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-repository-"));

    try {
      await initializeProject(rootDir);
      const spec = await createSpec(rootDir, {
        title: "Answer questions in specs",
        summary: "Support deterministic spec rewrites after UI answers.",
      });
      const raw = await readFile(spec.filePath, "utf8");

      await writeFile(
        spec.filePath,
        `${raw.trim()}\n\n## Open Questions\n\n- Should answered questions move into resolved decisions?\n- Should unanswered questions remain visible?\n`,
      );

      const result = await answerSpecOpenQuestions(rootDir, spec.id, [
        {
          question: "Should answered questions move into resolved decisions?",
          answer: "Yes. Preserve the original question and store the answer underneath it.",
        },
      ]);
      const nextRaw = await readFile(spec.filePath, "utf8");

      expect(result.answeredQuestions).toEqual(["Should answered questions move into resolved decisions?"]);
      expect(result.remainingQuestions).toEqual(["Should unanswered questions remain visible?"]);
      expect(nextRaw).toContain("## Resolved Decisions");
      expect(nextRaw).toContain("- Question: Should answered questions move into resolved decisions?");
      expect(nextRaw).toContain("Answer:");
      expect(nextRaw).not.toContain("- Should answered questions move into resolved decisions?");
      expect(nextRaw).toContain("- Should unanswered questions remain visible?");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
