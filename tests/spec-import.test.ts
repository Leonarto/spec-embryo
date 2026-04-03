import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildSpecImportBundle, renderSpecImportBundle } from "../src/services/spec-import.ts";

describe("spec import service", () => {
  test("builds a migration bundle from an existing docs folder", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-import-"));

    try {
      const sourceDir = join(rootDir, "legacy-specs");
      await mkdir(sourceDir, { recursive: true });
      await writeFile(
        join(sourceDir, "roadmap.md"),
        "# Product roadmap\n\n## Goals\n\nShip the CLI.\n\n## Constraints\n\nStay local-first.\n",
        "utf8",
      );
      await writeFile(join(sourceDir, "notes.txt"), "Execution notes for the first sprint.", "utf8");

      const bundle = await buildSpecImportBundle(rootDir, "legacy-specs", {
        instructions: "Prefer one foundation spec and linked tasks.",
        maxCharsPerFile: 120,
      });

      expect(bundle.fileCount).toBe(2);
      expect(bundle.files[0]?.relativePath).toContain("legacy-specs");
      expect(bundle.recommendedPrompt).toContain("Prefer one foundation spec and linked tasks.");
      expect(bundle.migrationRules).toContain("Use `doc_kind = \"spec\"` for specs and `doc_kind = \"task\"` for tasks.");
      expect(renderSpecImportBundle(bundle)).toContain("Spec import prompt bundle");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
