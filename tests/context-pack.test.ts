import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildPromptBundle, renderPromptBundleText } from "../src/backends/prompt.ts";
import { parseArgs } from "../src/cli.ts";
import { runMemoryCommand } from "../src/commands/memory.ts";
import { buildResumeContext } from "../src/engine.ts";
import { initializeProject, loadProjectContext } from "../src/repository.ts";
import { buildMemoryContextPack, buildResumeContextPack } from "../src/services/context-pack.ts";

async function writeMemoryNote(rootDir: string, scope: "session" | "org", fileName: string, body: string): Promise<void> {
  const dir = join(rootDir, ".specpm", "memory", scope);
  await mkdir(dir, { recursive: true });
  await Bun.write(join(dir, fileName), body);
}

function runGit(rootDir: string, args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  }

  return result.stdout;
}

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
      expect(pack.mustReadNow.some((item) => item.kind === "evidence" && item.ref === "TASK-001")).toBe(true);
      expect(pack.mustReadNow.every((item) => item.scope === "repo")).toBe(true);
      expect(pack.mustReadNow.some((item) => item.kind === "current")).toBe(true);
      expect(pack.supporting.some((item) => item.ref === "SPEC-001")).toBe(true);
      expect(pack.nextInspectIds).toContain("TASK-001");
      expect(pack.nextInspect.some((item) => item.kind === "managed-doc" && item.ref === "TASK-001")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("preserves non-repo scope information inside compact packs", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-context-pack-"));

    try {
      await initializeProject(rootDir);
      await writeMemoryNote(
        rootDir,
        "session",
        "NOTE-SESSION-pack.md",
        `+++
doc_kind = "memory-note"
id = "NOTE-SESSION-PACK"
title = "Session pack note"
summary = "Session-scoped detail for the current flow."
tags = ["session", "pack"]
updated_at = "2026-04-26T00:00:00.000Z"
+++

Use this note for the current local flow.
`,
      );
      const context = await loadProjectContext(rootDir);
      const pack = buildMemoryContextPack(context, { text: "session pack", scope: "session" });

      expect(pack.mustReadNow.some((item) => item.ref === "NOTE-SESSION-PACK" && item.scope === "session")).toBe(true);
      expect(pack.offloaded.every((artifact) => !artifact.scope || artifact.scope === "session")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("threads ranking controls into text-oriented memory packs", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-context-pack-"));

    try {
      await initializeProject(rootDir);
      const context = await loadProjectContext(rootDir);
      const pack = buildMemoryContextPack(context, { text: "adoption", rank: "active" });

      expect(pack.mode).toBe("text");
      expect(pack.mustReadNow[0]?.ref).toBe("SPEC-001");
      expect(pack.mustReadNow[0]?.reason).toContain("rank:active");
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
      expect(pack.mustReadNow.every((item) => item.scope === "repo")).toBe(true);
      expect(pack.mustReadNow.some((item) => item.kind === "next-actions")).toBe(true);
      expect(pack.mustReadNow.some((item) => item.kind === "active-spec")).toBe(true);
      expect(pack.nextInspectIds).toContain("SPEC-001");
      expect(pack.nextInspect.some((item) => item.kind === "managed-doc" && item.ref === "SPEC-001")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("includes changed managed item summaries with a compact hint, identity, and path", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-context-pack-"));

    try {
      await initializeProject(rootDir);
      runGit(rootDir, ["init"]);
      runGit(rootDir, ["config", "user.name", "Spec Embryo Test"]);
      runGit(rootDir, ["config", "user.email", "spm@example.test"]);
      runGit(rootDir, ["add", "."]);
      runGit(rootDir, ["commit", "-m", "initial"]);

      const currentFile = join(rootDir, "docs/spm/current.md");
      const currentRaw = await readFile(currentFile, "utf8");
      await writeFile(currentFile, `${currentRaw}\ntracked change\n`, "utf8");
      const configFile = join(rootDir, ".specpm/config.toml");
      const configRaw = await readFile(configFile, "utf8");
      await writeFile(configFile, `${configRaw}\n`, "utf8");

      const projectContext = await loadProjectContext(rootDir);
      const pack = buildResumeContextPack(buildResumeContext(projectContext));
      const changedItems = pack.supporting.filter((item) => item.kind === "changed-item");
      const changedItem = changedItems.find((item) => item.ref === "docs/spm/current.md");

      expect(changedItem?.summary).toBe("M CURRENT: Current Project State (docs/spm/current.md)");
      expect(changedItems[0]?.ref).toBe("docs/spm/current.md");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("notes when additional changed files were offloaded from the resume context pack", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-context-pack-"));

    try {
      await initializeProject(rootDir);
      runGit(rootDir, ["init"]);
      runGit(rootDir, ["config", "user.name", "Spec Embryo Test"]);
      runGit(rootDir, ["config", "user.email", "spm@example.test"]);
      runGit(rootDir, ["add", "."]);
      runGit(rootDir, ["commit", "-m", "initial"]);

      const currentFile = join(rootDir, "docs/spm/current.md");
      const currentRaw = await readFile(currentFile, "utf8");
      await writeFile(currentFile, `${currentRaw}\ntracked change\n`, "utf8");

      for (let index = 1; index <= 4; index += 1) {
        await writeFile(join(rootDir, `scratch-${index}.md`), `# scratch ${index}\n`, "utf8");
      }

      const projectContext = await loadProjectContext(rootDir);
      const pack = buildResumeContextPack(buildResumeContext(projectContext));
      const summaryItem = pack.supporting.find((item) => item.kind === "changed-summary");

      expect(summaryItem?.summary).toBe("... and 2 more changed files.");
      expect(pack.supporting.filter((item) => item.kind === "changed-item")).toHaveLength(3);
      expect(pack.offloaded.some((artifact) => artifact.kind === "inspect-change" && artifact.ref === "scratch-4.md")).toBe(true);
      expect(pack.nextInspectIds).toContain("scratch-3.md");
      expect(pack.nextInspectIds).toContain("scratch-4.md");
      expect(pack.nextInspect.some((item) => item.kind === "change-path" && item.ref === "scratch-3.md")).toBe(true);
      expect(pack.nextInspect.some((item) => item.kind === "change-path" && item.ref === "scratch-4.md")).toBe(true);
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
      expect(human).toContain("[evidence");
      expect(human).toContain("Supporting context:");
      expect(human).toContain("Offloaded detail:");

      const json = await runMemoryCommand(rootDir, parseArgs(["memory", "pack", "--text", "adoption", "--rank", "active", "--json"]));
      const pack = JSON.parse(json) as {
        source: string;
        profile: string;
        mustReadNow: Array<{ ref?: string }>;
      };

      expect(pack.source).toBe("memory");
      expect(pack.profile).toBe("implementation");
      expect(pack.mustReadNow[0]?.ref).toBe("SPEC-001");
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
      expect(bundle.context_pack.supporting.some((item) => item.kind === "changed-summary")).toBe(false);
      expect(bundle.context_pack.nextInspect.every((item) => item.kind === "managed-doc")).toBe(true);
      expect(text).toContain("Context pack:");
      expect(text).toContain("\"profile\": \"resume\"");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
