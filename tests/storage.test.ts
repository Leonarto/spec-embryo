import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { initializeProject, loadProjectContext } from "../src/repository.ts";
import { listMarkdownFiles, withLock } from "../src/storage.ts";

describe("storage", () => {
  test("ignores AGENTS.md when listing markdown collections", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-storage-"));

    try {
      await mkdir(join(rootDir, "specs"), { recursive: true });
      await writeFile(join(rootDir, "specs", "AGENTS.md"), "# AGENTS\n\nLocal guidance.\n", "utf8");
      await writeFile(join(rootDir, "specs", "SPEC-001.md"), "# Spec\n", "utf8");

      const files = await listMarkdownFiles(join(rootDir, "specs"));
      expect(files).toHaveLength(1);
      expect(files[0]?.endsWith("SPEC-001.md")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("keeps an active lock alive past staleMs with heartbeat updates", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-storage-"));
    const lockPath = join(rootDir, ".specpm", "locks", "heartbeat.lock");
    const events: string[] = [];

    try {
      const first = withLock(
        lockPath,
        async () => {
          events.push("first:start");
          await delay(120);
          events.push("first:end");
        },
        { staleMs: 30, retryDelayMs: 10, timeoutMs: 500 },
      );

      await delay(20);

      const second = withLock(
        lockPath,
        async () => {
          events.push("second:start");
          events.push("second:end");
        },
        { staleMs: 30, retryDelayMs: 10, timeoutMs: 500 },
      );

      await Promise.all([first, second]);

      expect(events).toEqual(["first:start", "first:end", "second:start", "second:end"]);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("serializes cross-process task creation through the shared repository lock", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-storage-"));

    try {
      await initializeProject(rootDir);

      const workerCode = `
        import { createTask } from ${JSON.stringify(join(process.cwd(), "src", "repository.ts"))};
        const rootDir = process.env.SPM_TEST_ROOT_DIR;
        const title = process.env.SPM_TEST_TITLE;
        if (!rootDir || !title) {
          throw new Error("missing worker env");
        }
        const task = await createTask(rootDir, {
          title,
          summary: title,
          specIds: ["SPEC-001"],
        });
        console.log(task.id);
      `;

      const runWorker = (title: string) =>
        new Promise<string>((resolve, reject) => {
          const child = spawn(process.execPath, ["-e", workerCode], {
            cwd: process.cwd(),
            env: {
              ...process.env,
              SPM_TEST_ROOT_DIR: rootDir,
              SPM_TEST_TITLE: title,
            },
            stdio: ["ignore", "pipe", "pipe"],
          });

          let stdout = "";
          let stderr = "";
          child.stdout.on("data", (chunk) => {
            stdout += String(chunk);
          });
          child.stderr.on("data", (chunk) => {
            stderr += String(chunk);
          });
          child.on("error", reject);
          child.on("close", (code) => {
            if (code !== 0) {
              reject(new Error(stderr || `worker exited with code ${code}`));
              return;
            }

            resolve(stdout.trim());
          });
        });

      const ids = (await Promise.all([
        runWorker("Worker task one"),
        runWorker("Worker task two"),
        runWorker("Worker task three"),
      ])).sort();

      const taskFiles = (await readdir(join(rootDir, "docs/spm/tasks"))).filter((name) => name.startsWith("TASK-00"));
      const context = await loadProjectContext(rootDir);
      const spec = context.specs.find((candidate) => candidate.id === "SPEC-001");

      expect(ids).toEqual(["TASK-004", "TASK-005", "TASK-006"]);
      expect(taskFiles.some((name) => name.startsWith("TASK-004-"))).toBe(true);
      expect(taskFiles.some((name) => name.startsWith("TASK-005-"))).toBe(true);
      expect(taskFiles.some((name) => name.startsWith("TASK-006-"))).toBe(true);
      expect(spec?.taskIds).toEqual(["TASK-001", "TASK-002", "TASK-003", "TASK-004", "TASK-005", "TASK-006"]);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
