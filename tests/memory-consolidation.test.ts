import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runMemoryCommand } from "../src/commands/memory.ts";
import { findMemoryNote, initializeProject, loadProjectContext } from "../src/repository.ts";
import { buildMemoryConsolidationBundle } from "../src/services/memory-consolidation.ts";
import { buildMemoryQueryBundle } from "../src/services/memory-query.ts";

async function writeMemoryNote(
  rootDir: string,
  scope: "session" | "org",
  fileName: string,
  body: string,
): Promise<void> {
  const dir = join(rootDir, ".specpm", "memory", scope);
  await mkdir(dir, { recursive: true });
  await Bun.write(join(dir, fileName), body);
}

describe("memory consolidation service", () => {
  test("builds a dry-run consolidation plan with duplicates and contradictions", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-consolidation-"));

    try {
      await initializeProject(rootDir);
      await writeMemoryNote(
        rootDir,
        "session",
        "NOTE-SESSION-001-current-direction.md",
        `+++
doc_kind = "memory-note"
id = "NOTE-SESSION-001"
title = "Adopt Spec Embryo memory for this repository"
summary = "Session-local rewrite candidate for repo direction."
tags = ["session", "capture"]
updated_at = "2026-04-26T00:00:00.000Z"
+++

# Notes

Capture a cleaner explanation for the current repo direction.
`,
      );
      await writeMemoryNote(
        rootDir,
        "session",
        "NOTE-SESSION-002-current-direction-copy.md",
        `+++
doc_kind = "memory-note"
id = "NOTE-SESSION-002"
title = "Adopt Spec Embryo memory for this repository"
summary = "Session-local rewrite candidate for repo direction."
tags = ["session", "duplicate"]
updated_at = "2026-04-26T00:00:00.000Z"
+++

Duplicate scratch note.
`,
      );

      const bundle = await buildMemoryConsolidationBundle(rootDir, {
        noteId: "NOTE-SESSION-001",
      });

      expect(bundle.apply).toBe(false);
      expect(bundle.target).toBe("handoff");
      expect(bundle.duplicateNoteIds).toContain("NOTE-SESSION-002");
      expect(bundle.contradictionIds).toContain("SPEC-001");
      expect(bundle.relatedRepoIds.length).toBeGreaterThan(0);
      expect(bundle.recommendedAction).toBe("promote-and-retire");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("applies consolidation by creating a handoff and retiring the source note", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-consolidation-"));

    try {
      await initializeProject(rootDir);
      await writeMemoryNote(
        rootDir,
        "session",
        "NOTE-SESSION-003-release-checkpoint.md",
        `+++
doc_kind = "memory-note"
id = "NOTE-SESSION-003"
title = "Release checkpoint"
summary = "A session note that should become a durable checkpoint."
tags = ["session", "release"]
updated_at = "2026-04-26T00:00:00.000Z"
+++

# Notes

Promote this release checkpoint into durable repo memory.
`,
      );

      const bundle = await buildMemoryConsolidationBundle(rootDir, {
        noteId: "NOTE-SESSION-003",
        apply: true,
      });

      expect(bundle.apply).toBe(true);
      expect(bundle.createdHandoffId).toMatch(/^HANDOFF-/);
      expect(bundle.retiredSource).toBe(true);

      const note = await findMemoryNote(rootDir, "NOTE-SESSION-003");
      expect(note.promotedTo).toBe(bundle.createdHandoffId);
      expect(note.consolidatedAt).toBeDefined();
      expect(note.archivedAt).toBeDefined();
      expect(note.tags).toContain("consolidated");

      const context = await loadProjectContext(rootDir);
      const sessionResults = buildMemoryQueryBundle(context, {
        scope: "session",
        docKind: "memory-note",
      });
      expect(sessionResults.results.some((result) => result.id === "NOTE-SESSION-003")).toBe(false);

      const handoffFiles = context.handoffs.filter((handoff) => handoff.id === bundle.createdHandoffId);
      expect(handoffFiles).toHaveLength(1);
      const raw = await readFile(handoffFiles[0]!.filePath, "utf8");
      expect(raw).toContain("## Source Note");
      expect(raw).toContain("NOTE-SESSION-003");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("surfaces expired notes as stale during dry-run consolidation", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-consolidation-"));

    try {
      await initializeProject(rootDir);
      await writeMemoryNote(
        rootDir,
        "session",
        "NOTE-SESSION-005-expired-scratch.md",
        `+++
doc_kind = "memory-note"
id = "NOTE-SESSION-005"
title = "Expired scratch note"
summary = "A temporary note that should be treated as stale."
tags = ["session", "scratch"]
expires_at = "2025-01-01T00:00:00.000Z"
updated_at = "2026-04-26T00:00:00.000Z"
+++

This note overstayed its intended lifetime.
`,
      );

      const bundle = await buildMemoryConsolidationBundle(rootDir, {
        noteId: "NOTE-SESSION-005",
      });

      expect(bundle.staleReasons).toContain("expired:2025-01-01T00:00:00.000Z");
      expect(bundle.recommendedAction).toBe("promote-and-retire");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});

describe("memory consolidate command", () => {
  test("renders dry-run and apply output for session-note consolidation", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-consolidation-"));

    try {
      await initializeProject(rootDir);
      await writeMemoryNote(
        rootDir,
        "session",
        "NOTE-SESSION-004-work-checkpoint.md",
        `+++
doc_kind = "memory-note"
id = "NOTE-SESSION-004"
title = "Work checkpoint"
summary = "A note ready for consolidation."
tags = ["session"]
updated_at = "2026-04-26T00:00:00.000Z"
+++

Checkpoint details here.
`,
      );

      const human = await runMemoryCommand(
        rootDir,
        parseArgs(["memory", "consolidate", "NOTE-SESSION-004"]),
      );
      expect(human).toContain("Memory consolidation [handoff] for NOTE-SESSION-004");
      expect(human).toContain("Duplicate session notes:");

      const json = await runMemoryCommand(
        rootDir,
        parseArgs(["memory", "consolidate", "NOTE-SESSION-004", "--apply", "--json"]),
      );
      const payload = JSON.parse(json) as {
        apply: boolean;
        createdHandoffId?: string;
        retiredSource?: boolean;
      };

      expect(payload.apply).toBe(true);
      expect(payload.createdHandoffId).toMatch(/^HANDOFF-/);
      expect(payload.retiredSource).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("rejects unsupported targets and non-session notes", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-consolidation-"));

    try {
      await initializeProject(rootDir);
      await writeMemoryNote(
        rootDir,
        "org",
        "NOTE-ORG-001-policy.md",
        `+++
doc_kind = "memory-note"
id = "NOTE-ORG-001"
title = "Shared policy"
summary = "Org guidance should not consolidate through the session workflow."
tags = ["org"]
updated_at = "2026-04-26T00:00:00.000Z"
+++

Org policy content.
`,
      );

      await expect(
        runMemoryCommand(rootDir, parseArgs(["memory", "consolidate", "NOTE-ORG-001"])),
      ).rejects.toThrow("Only session memory notes can be consolidated");

      await expect(
        runMemoryCommand(rootDir, parseArgs(["memory", "consolidate", "NOTE-ORG-001", "--target", "current"])),
      ).rejects.toThrow("Invalid memory consolidation target");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
