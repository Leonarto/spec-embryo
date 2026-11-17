import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runHooksCommand } from "../src/commands/hooks.ts";
import { runReleaseCommand } from "../src/commands/release.ts";
import { createTask, initializeProject, setSpecStatus, setTaskStatus } from "../src/repository.ts";

describe("hooks and release workflows", () => {
  test("installs hook config and renders event plans", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-hooks-"));

    try {
      await initializeProject(rootDir);
      const install = await runHooksCommand(rootDir, parseArgs(["hooks", "install", "--events", "commit,release", "--json"]));
      const installPayload = JSON.parse(install) as { config: { enabledEvents: string[] } };
      expect(installPayload.config.enabledEvents).toEqual(["commit", "release"]);

      const plan = await runHooksCommand(rootDir, parseArgs(["hooks", "plan", "--event", "release", "--json"]));
      const payload = JSON.parse(plan) as { event: string; installed: boolean; actions: Array<{ command: string }> };
      expect(payload.event).toBe("release");
      expect(payload.installed).toBe(true);
      expect(payload.actions.some((action) => action.command === "spm release plan")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("builds release recommendations and notes from managed state", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-release-"));

    try {
      await initializeProject(rootDir);
      await setSpecStatus(rootDir, "SPEC-001", "done");
      await setTaskStatus(rootDir, "TASK-001", "done");

      const plan = await runReleaseCommand(rootDir, parseArgs(["release", "plan", "--json"]));
      const payload = JSON.parse(plan) as { recommendation: string; ready: boolean; notes: string[] };
      expect(payload.recommendation).toBe("minor");
      expect(payload.ready).toBe(true);
      expect(payload.notes.some((note) => note.includes("SPEC-001"))).toBe(true);

      const notes = await runReleaseCommand(rootDir, parseArgs(["release", "notes"]));
      expect(notes).toContain("Release notes candidates:");
      expect(notes).toContain("TASK-001");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("uses the latest completion window instead of stale done specs", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-release-"));

    try {
      await initializeProject(rootDir);
      await setSpecStatus(rootDir, "SPEC-001", "done");
      const specFile = join(rootDir, "docs", "spm", "specs", "SPEC-001-adopt-spec-embryo-memory-for-this-repository.md");
      const oldSpec = await readFile(specFile, "utf8");
      await writeFile(specFile, oldSpec.replace(/updated_at = ".+?"/u, 'updated_at = "2020-01-01T00:00:00.000Z"'), "utf8");
      await createTask(rootDir, {
        title: "Fix packaging typo",
        summary: "Patch-only release candidate.",
        specIds: ["SPEC-001"],
        status: "done",
        priority: 2,
      });
      const relinkedSpec = await readFile(specFile, "utf8");
      await writeFile(specFile, relinkedSpec.replace(/updated_at = ".+?"/u, 'updated_at = "2020-01-01T00:00:00.000Z"'), "utf8");

      const plan = await runReleaseCommand(rootDir, parseArgs(["release", "plan", "--json"]));
      const payload = JSON.parse(plan) as { recommendation: string; notes: string[] };

      expect(payload.recommendation).toBe("patch");
      expect(payload.notes.some((note) => note.includes("Fix packaging typo"))).toBe(true);
      expect(payload.notes.some((note) => note.includes("SPEC-001"))).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
