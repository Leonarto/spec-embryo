import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { listMarkdownFiles } from "../src/storage.ts";

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
});
