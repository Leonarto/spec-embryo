import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildPromptBundle, renderPromptBundleText } from "../src/backends/prompt.ts";
import { parseArgs } from "../src/cli.ts";
import { runMemoryCommand } from "../src/commands/memory.ts";
import { buildResumeContext } from "../src/engine.ts";
import { initializeProject, loadProjectContext } from "../src/repository.ts";
import { buildMemoryContextPack, buildResumeContextPack } from "../src/services/context-pack.ts";

describe("context pack service", () => {
  test("builds a compact memory pack around an explicit task target", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-context-pack-"));

    try {
      await initializeProject(rootDir);
      const context = await loadProjectContext(rootDir);
      const pack = buildMemoryContextPack(context, { taskId: "TASK-001" });

      expect(pack.source).toBe("memory");
      expect(pack.profile).toBe("implementation");
      expect(pack.mustReadNow.some((item) => item.ref === "TASK-001")).toBe(true);
      expect(pack.mustReadNow.some((item) => item.kind === "current")).toBe(true);
      expect(pack.supporting.some((item) => item.ref === "SPEC-001")).toBe(true);
      expect(pack.nextInspectIds).toContain("TASK-001");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("builds a resume pack that prioritizes focus, next actions, and active work", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-context-pack-"));

    try {
      await initializeProject(rootDir);
      const projectContext = await loadProjectContext(rootDir);
      const pack = buildResumeContextPack(buildResumeContext(projectContext));

      expect(pack.source).toBe("resume");
      expect(pack.profile).toBe("resume");
      expect(pack.mustReadNow[0]?.kind).toBe("focus");
      expect(pack.mustReadNow.some((item) => item.kind === "next-actions")).toBe(true);
      expect(pack.mustReadNow.some((item) => item.kind === "active-spec")).toBe(true);
      expect(pack.nextInspectIds).toContain("SPEC-001");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});

describe("memory pack command", () => {
  test("renders compact human output and stable JSON", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-context-pack-"));

    try {
      await initializeProject(rootDir);

      const human = await runMemoryCommand(
        rootDir,
        parseArgs(["memory", "pack", "--text", "real project direction", "--profile", "migration"]),
      );
      expect(human).toContain("Context pack [migration] from memory");
      expect(human).toContain("Must read now:");
      expect(human).toContain("Supporting context:");
      expect(human).toContain("Offloaded detail:");

      const json = await runMemoryCommand(rootDir, parseArgs(["memory", "pack", "--task", "TASK-001", "--json"]));
      const pack = JSON.parse(json) as {
        source: string;
        profile: string;
        mustReadNow: Array<{ ref?: string }>;
      };

      expect(pack.source).toBe("memory");
      expect(pack.profile).toBe("implementation");
      expect(pack.mustReadNow.some((item) => item.ref === "TASK-001")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});

describe("prompt bundle integration", () => {
  test("includes a resume context pack in prompt-return bundles", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-context-pack-"));

    try {
      await initializeProject(rootDir);
      const projectContext = await loadProjectContext(rootDir);
      const bundle = buildPromptBundle(buildResumeContext(projectContext));
      const text = renderPromptBundleText(bundle);

      expect(bundle.context_pack.profile).toBe("resume");
      expect(bundle.expected_output_format.context_pack_first).toBe(true);
      expect(bundle.context_pack.mustReadNow.some((item) => item.kind === "focus")).toBe(true);
      expect(text).toContain("Context pack:");
      expect(text).toContain("\"profile\": \"resume\"");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
