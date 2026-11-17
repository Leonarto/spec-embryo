import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runMemoryCommand } from "../src/commands/memory.ts";
import { findMemoryNote, initializeProject, loadProjectContext } from "../src/repository.ts";
import { buildMemoryQueryBundle } from "../src/services/memory-query.ts";

async function writeOrgNote(rootDir: string, fileName: string, body: string): Promise<void> {
  const dir = join(rootDir, ".specpm", "memory", "org");
  await mkdir(dir, { recursive: true });
  await Bun.write(join(dir, fileName), body);
}

describe("memory note commands", () => {
  test("creates a session memory note through the CLI and makes it queryable", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-note-"));

    try {
      const init = await initializeProject(rootDir);
      expect(init.created.length).toBeGreaterThan(0);

      const human = await runMemoryCommand(
        rootDir,
        parseArgs([
          "memory",
          "note",
          "create",
          "--scope",
          "session",
          "--title",
          "Capture repo onboarding follow-up",
          "--summary",
          "A scratch note for the current migration flow.",
          "--tags",
          "session,onboarding",
          "--expires-at",
          "2026-05-01T12:00:00.000Z",
          "--body",
          "# Notes\n\nRemember to revisit the onboarding flow after the next doctor run.",
        ]),
      );

      expect(human).toContain("Created memory note NOTE-SESSION-");
      expect(human).toContain("Scope: session");

      const context = await loadProjectContext(rootDir);
      const bundle = buildMemoryQueryBundle(context, {
        scope: "session",
        docKind: "memory-note",
        text: "onboarding follow-up",
      });

      expect(bundle.results[0]?.id).toMatch(/^NOTE-SESSION-\d+$/);
      const note = await findMemoryNote(rootDir, bundle.results[0]!.id);
      expect(note.writePolicy).toBe("read-write");
      expect(note.expiresAt).toBe("2026-05-01T12:00:00.000Z");
      expect(note.body).toContain("Remember to revisit");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("updates an existing session note deterministically", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-note-"));

    try {
      await initializeProject(rootDir);
      const created = JSON.parse(
        await runMemoryCommand(
          rootDir,
          parseArgs([
            "memory",
            "note",
            "create",
            "--scope",
            "session",
            "--title",
            "Original scratch note",
            "--summary",
            "Initial summary.",
            "--tags",
            "session,scratch",
            "--json",
          ]),
        ),
      ) as { note: { id: string } };

      const json = await runMemoryCommand(
        rootDir,
        parseArgs([
          "memory",
          "note",
          "update",
          created.note.id,
          "--title",
          "Updated scratch note",
          "--summary",
          "Updated summary.",
          "--tags",
          "session,updated",
          "--expires-at",
          "2026-06-01T00:00:00.000Z",
          "--body",
          "# Notes\n\nUpdated body.",
          "--json",
        ]),
      );
      const bundle = JSON.parse(json) as {
        action: string;
        changedFields: string[];
        note: { id: string; title: string; summary: string; tags: string[]; expiresAt?: string };
      };

      expect(bundle.action).toBe("update");
      expect(bundle.changedFields).toEqual(["title", "summary", "tags", "body", "expiresAt"]);
      expect(bundle.note.title).toBe("Updated scratch note");
      expect(bundle.note.summary).toBe("Updated summary.");
      expect(bundle.note.tags).toEqual(["session", "updated"]);
      expect(bundle.note.expiresAt).toBe("2026-06-01T00:00:00.000Z");

      const note = await findMemoryNote(rootDir, created.note.id);
      expect(note.body).toContain("Updated body.");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("rejects org-scope writes when the scope is read-only", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-note-"));

    try {
      await initializeProject(rootDir);

      await expect(
        runMemoryCommand(
          rootDir,
          parseArgs([
            "memory",
            "note",
            "create",
            "--scope",
            "org",
            "--title",
            "Shared policy note",
          ]),
        ),
      ).rejects.toThrow("Memory scope is read-only under current config: org");

      await writeOrgNote(
        rootDir,
        "NOTE-ORG-001-policy.md",
        `+++
doc_kind = "memory-note"
id = "NOTE-ORG-001"
title = "Shared policy note"
summary = "Existing org note."
tags = ["org", "policy"]
updated_at = "2026-04-26T00:00:00.000Z"
+++

# Notes

Policy content.
`,
      );

      await expect(
        runMemoryCommand(
          rootDir,
          parseArgs([
            "memory",
            "note",
            "update",
            "NOTE-ORG-001",
            "--title",
            "Attempted rewrite",
          ]),
        ),
      ).rejects.toThrow("is not writable under the configured scope policy");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("rejects invalid note updates with no fields", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-note-"));

    try {
      await initializeProject(rootDir);
      const createOutput = await runMemoryCommand(
        rootDir,
        parseArgs([
          "memory",
          "note",
          "create",
          "--scope",
          "session",
          "--title",
          "No-op note",
        ]),
      );
      const noteId = createOutput.match(/Created memory note (NOTE-SESSION-\d+)/)?.[1];
      expect(noteId).toBeDefined();

      await expect(
        runMemoryCommand(rootDir, parseArgs(["memory", "note", "update", noteId!])),
      ).rejects.toThrow("requires at least one field to change");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("archives and restores a session note through the CLI", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-note-"));

    try {
      await initializeProject(rootDir);
      const created = JSON.parse(
        await runMemoryCommand(
          rootDir,
          parseArgs([
            "memory",
            "note",
            "create",
            "--scope",
            "session",
            "--title",
            "Archive me later",
            "--json",
          ]),
        ),
      ) as { note: { id: string } };

      const archived = await runMemoryCommand(
        rootDir,
        parseArgs([
          "memory",
          "note",
          "archive",
          created.note.id,
          "--reason",
          "No longer needed in the active set",
          "--json",
        ]),
      );
      const archivedBundle = JSON.parse(archived) as {
        action: string;
        note: { archivedAt?: string };
        changedFields: string[];
      };

      expect(archivedBundle.action).toBe("archive");
      expect(archivedBundle.note.archivedAt).toBeDefined();
      expect(archivedBundle.changedFields).toContain("archivedAt");

      const activeList = await runMemoryCommand(
        rootDir,
        parseArgs(["memory", "note", "list", "--scope", "session"]),
      );
      expect(activeList).not.toContain(created.note.id);

      const archivedList = await runMemoryCommand(
        rootDir,
        parseArgs(["memory", "note", "list", "--scope", "session", "--include-archived"]),
      );
      expect(archivedList).toContain(created.note.id);
      expect(archivedList).toContain("archive reason: No longer needed in the active set");

      const restored = await runMemoryCommand(
        rootDir,
        parseArgs(["memory", "note", "restore", created.note.id, "--json"]),
      );
      const restoredBundle = JSON.parse(restored) as {
        action: string;
        note: { archivedAt?: string };
      };

      expect(restoredBundle.action).toBe("restore");
      expect(restoredBundle.note.archivedAt).toBeUndefined();

      const note = await findMemoryNote(rootDir, created.note.id);
      expect(note.archivedAt).toBeUndefined();
      expect(note.archiveReason).toBeUndefined();
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("lists notes with scoped and archived filters", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-note-"));

    try {
      await initializeProject(rootDir);
      const first = JSON.parse(
        await runMemoryCommand(
          rootDir,
          parseArgs([
            "memory",
            "note",
            "create",
            "--scope",
            "session",
            "--title",
            "Alpha session note",
            "--summary",
            "First session note.",
            "--json",
          ]),
        ),
      ) as { note: { id: string } };
      const second = JSON.parse(
        await runMemoryCommand(
          rootDir,
          parseArgs([
            "memory",
            "note",
            "create",
            "--scope",
            "session",
            "--title",
            "Beta session note",
            "--summary",
            "Second session note.",
            "--json",
          ]),
        ),
      ) as { note: { id: string } };

      await runMemoryCommand(rootDir, parseArgs(["memory", "note", "archive", first.note.id]));

      const human = await runMemoryCommand(
        rootDir,
        parseArgs(["memory", "note", "list", "--scope", "session", "--limit", "5"]),
      );
      expect(human).toContain("Memory notes [scope:session]");
      expect(human).toContain(second.note.id);
      expect(human).not.toContain(first.note.id);

      const json = await runMemoryCommand(
        rootDir,
        parseArgs(["memory", "note", "list", "--scope", "session", "--include-archived", "--json"]),
      );
      const bundle = JSON.parse(json) as {
        totalMatches: number;
        notes: Array<{ id: string; archivedAt?: string }>;
      };

      expect(bundle.totalMatches).toBe(2);
      expect(bundle.notes.some((note) => note.id === first.note.id && note.archivedAt)).toBe(true);
      expect(bundle.notes.some((note) => note.id === second.note.id && !note.archivedAt)).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
