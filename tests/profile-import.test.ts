import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runImportCommand } from "../src/commands/import.ts";
import { runInitCommand } from "../src/commands/init.ts";
import { runProfileCommand } from "../src/commands/profile.ts";
import { loadProjectContext } from "../src/repository.ts";
import { readProjectProfileManifest } from "../src/services/profiles.ts";

describe("project profiles and legacy import", () => {
  test("lists profiles and writes a profile manifest during init", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-profile-"));

    try {
      const profiles = await runProfileCommand(rootDir, parseArgs(["profile", "list"]));
      expect(profiles).toContain("library:");
      expect(profiles).toContain("frontend-app:");

      const initOutput = await runInitCommand(rootDir, parseArgs(["init", "--profile", "library", "--json"]));
      const payload = JSON.parse(initOutput) as { profile: string; created: string[] };
      expect(payload.profile).toBe("library");
      expect(payload.created).toContain(".specpm/profile.json");

      const manifest = await readProjectProfileManifest(rootDir);
      expect(manifest).toEqual(
        expect.objectContaining({
          profile: "library",
          defaultTags: ["library", "api", "release"],
        }),
      );
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("builds and applies a deterministic legacy import plan", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-import-"));
    const sourceDir = join(rootDir, "legacy");

    try {
      await runInitCommand(rootDir, parseArgs(["init"]));
      await mkdir(sourceDir, { recursive: true });
      await writeFile(
        join(sourceDir, "roadmap.md"),
        `# Billing Roadmap

Add subscription support to the existing product.

- [ ] Model pricing tiers
- [ ] Add checkout flow
`,
        "utf8",
      );

      const preview = await runImportCommand(rootDir, parseArgs(["import", "legacy", "--source", "legacy", "--json"]));
      const previewPayload = JSON.parse(preview) as { apply: boolean; files: Array<{ title: string; taskTitles: string[] }> };
      expect(previewPayload.apply).toBe(false);
      expect(previewPayload.files[0]?.title).toBe("Billing Roadmap");
      expect(previewPayload.files[0]?.taskTitles).toEqual(["Model pricing tiers", "Add checkout flow"]);

      const applied = await runImportCommand(rootDir, parseArgs(["import", "legacy", "--source", "legacy", "--apply"]));
      expect(applied).toContain("Legacy import applied");
      expect(applied).toContain("Created specs: SPEC-002");
      expect(applied).toContain("Created tasks: TASK-004, TASK-005");

      const context = await loadProjectContext(rootDir);
      expect(context.specs.some((spec) => spec.title === "Billing Roadmap" && spec.tags.includes("legacy-import"))).toBe(true);
      expect(context.tasks.some((task) => task.title === "Model pricing tiers" && task.tags.includes("legacy-import"))).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("does not import SpM managed docs when source contains the memory home", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-import-"));

    try {
      await runInitCommand(rootDir, parseArgs(["init", "--home", "docs"]));
      await writeFile(
        join(rootDir, "docs", "roadmap.md"),
        `# Product Roadmap

Capture the legacy product roadmap.
`,
        "utf8",
      );

      const preview = await runImportCommand(rootDir, parseArgs(["import", "legacy", "--source", "docs", "--json"]));
      const previewPayload = JSON.parse(preview) as { files: Array<{ relativePath: string; title: string }> };

      expect(previewPayload.files).toEqual([
        expect.objectContaining({
          relativePath: "docs/roadmap.md",
          title: "Product Roadmap",
        }),
      ]);
      expect(previewPayload.files.some((file) => file.relativePath.startsWith("docs/spm/"))).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
