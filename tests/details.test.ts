import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { archiveTask, createSpec, initializeProject, setTaskStatus } from "../src/repository.ts";
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

  test("extracts open questions and resolved decisions from spec detail data", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-details-"));

    try {
      await initializeProject(rootDir);
      const spec = await createSpec(rootDir, {
        title: "Question extraction",
        summary: "Parse structured question sections from spec details.",
      });
      const raw = await readFile(spec.filePath, "utf8");

      await writeFile(
        spec.filePath,
        `${raw.trim()}\n\n## Resolved Decisions\n\n- Question: Should this be preserved?\n  Answer:\n    Yes, as durable spec memory.\n\n## Open Questions\n\n- What should happen next?\n- How should the UI expose the saved answers?\n`,
      );

      const detail = await buildSpecDetailData(rootDir, spec.id);

      expect(detail.found).toBe(true);
      if (!detail.found) {
        return;
      }

      expect(detail.resolvedDecisions[0]?.question).toBe("Should this be preserved?");
      expect(detail.resolvedDecisions[0]?.answer).toContain("Yes, as durable spec memory.");
      expect(detail.openQuestions.map((entry) => entry.question)).toEqual([
        "What should happen next?",
        "How should the UI expose the saved answers?",
      ]);
      expect(detail.bodySections.some((section) => section.heading === "Open Questions")).toBe(false);
      expect(detail.bodySections.some((section) => section.heading === "Resolved Decisions")).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("preserves fenced mermaid blocks in detail body sections", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-details-"));

    try {
      await initializeProject(rootDir);
      const taskFile = join(rootDir, "docs/spm/tasks/TASK-001-bootstrap-cli.md");
      const raw = await readFile(taskFile, "utf8");

      await writeFile(
        taskFile,
        `${raw.trim()}\n\n## Flow\n\n\`\`\`mermaid\nflowchart TD\n  A[Start] --> B[Resume]\n\`\`\`\n`,
      );

      const detail = await buildTaskDetailData(rootDir, "TASK-001");

      expect(detail.found).toBe(true);
      if (!detail.found) {
        return;
      }

      const flowSection = detail.bodySections.find((section) => section.heading === "Flow");
      expect(flowSection).toBeDefined();
      expect(flowSection?.blocks[0]?.kind).toBe("code");
      expect(flowSection?.blocks[0]?.language).toBe("mermaid");
      expect(flowSection?.blocks[0]?.lines.join("\n")).toContain("flowchart TD");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
