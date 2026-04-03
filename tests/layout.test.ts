import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildReshapePlan, findDocumentationHomeCandidates, resolveLayoutChoice } from "../src/services/layout.ts";

describe("layout service", () => {
  test("adopts a single docs home automatically", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-layout-"));

    try {
      await mkdir(join(rootDir, "docs"), { recursive: true });
      const choice = await resolveLayoutChoice(rootDir);
      expect(choice.requiresChoice).toBe(false);
      expect(choice.memoryDir).toBe("docs/spm");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("requires a choice when multiple docs homes exist", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-layout-"));

    try {
      await mkdir(join(rootDir, "docs"), { recursive: true });
      await mkdir(join(rootDir, "specs"), { recursive: true });
      const choice = await resolveLayoutChoice(rootDir);
      expect(choice.requiresChoice).toBe(true);
      expect(choice.candidates).toHaveLength(2);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("builds a reshape plan from the old root layout to docs/spm", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-layout-"));

    try {
      await mkdir(join(rootDir, "docs", "state", "handoffs"), { recursive: true });
      await mkdir(join(rootDir, "specs"), { recursive: true });
      await mkdir(join(rootDir, "tasks"), { recursive: true });
      await writeFile(join(rootDir, "docs", "state", "current.md"), "# Current", "utf8");

      const plan = await buildReshapePlan(
        rootDir,
        {
          toolVersion: "0.1.0",
          projectName: "legacy",
          memoryDir: "docs/spm",
          stateFile: "docs/state/current.md",
          handoffsDir: "docs/state/handoffs",
          specsDir: "specs",
          tasksDir: "tasks",
          skillsDir: "skills",
          defaults: { resumeBackend: "deterministic" },
          backends: {
            deterministic: { enabled: true },
            prompt: { enabled: true },
            codex: { enabled: false },
            claude: { enabled: false },
          },
        },
        "docs/spm",
      );

      expect(plan.actions.some((action) => action.message.includes("Move current state"))).toBe(true);
      expect(plan.actions.some((action) => action.message.includes("Move specs"))).toBe(true);
      expect(plan.actions.some((action) => action.message.includes("Rewrite config"))).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
