import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runMemoryCommand } from "../src/commands/memory.ts";
import { createSpec, loadProjectContext, initializeProject } from "../src/repository.ts";
import { buildMemoryQueryBundle } from "../src/services/memory-query.ts";

async function writeMemoryNote(rootDir: string, scope: "session" | "org", fileName: string, body: string): Promise<void> {
  const dir = join(rootDir, ".specpm", "memory", scope);
  await mkdir(dir, { recursive: true });
  await Bun.write(join(dir, fileName), body);
}

describe("memory query service", () => {
  test("retrieves managed docs by typed filters and normalized tags", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-query-"));

    try {
      await initializeProject(rootDir);
      const context = await loadProjectContext(rootDir);
      const bundle = buildMemoryQueryBundle(context, {
        text: "adopt spec embryo memory",
        docKind: "spec",
        status: "active",
        tags: ["seed"],
      });

      expect(bundle.totalMatches).toBe(1);
      expect(bundle.results[0]?.id).toBe("SPEC-001");
      expect(bundle.results[0]?.docKind).toBe("spec");
      expect(bundle.results[0]?.matchReasons).toContain("spec anchor");
      expect(bundle.results[0]?.matchReasons).toContain("tag:seed");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("matches tags by exact normalized value and rejects partial tag substrings", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-query-"));

    try {
      await initializeProject(rootDir);
      await createSpec(rootDir, {
        title: "Self hosting memory query fixture",
        summary: "A fixture spec with a hyphenated tag.",
        tags: ["self-hosting"],
      });
      const context = await loadProjectContext(rootDir);

      const normalizedBundle = buildMemoryQueryBundle(context, {
        tags: ["self hosting"],
      });
      expect(normalizedBundle.results.some((result) => result.id === "SPEC-002")).toBe(true);

      const underscoreBundle = buildMemoryQueryBundle(context, {
        tags: ["self_hosting"],
      });
      expect(underscoreBundle.results.some((result) => result.id === "SPEC-002")).toBe(true);

      const partialBundle = buildMemoryQueryBundle(context, {
        tags: ["host"],
      });
      expect(partialBundle.totalMatches).toBe(0);

      await createSpec(rootDir, {
        title: "Punctuation preserving tags",
        summary: "Ensure punctuation-bearing tags stay distinct.",
        tags: ["c#"],
      });
      await createSpec(rootDir, {
        title: "C plus plus guide",
        summary: "Ensure c++ tags do not collapse into c#.",
        tags: ["c++"],
      });

      const punctuationContext = await loadProjectContext(rootDir);
      const cPlusPlusBundle = buildMemoryQueryBundle(punctuationContext, {
        tags: ["c++"],
      });
      expect(cPlusPlusBundle.results.some((result) => result.tags.includes("c++"))).toBe(true);
      expect(cPlusPlusBundle.results.some((result) => result.tags.includes("c#"))).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("retrieves matches from managed document bodies, not only summaries", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-query-"));

    try {
      await initializeProject(rootDir);
      const context = await loadProjectContext(rootDir);
      const bundle = buildMemoryQueryBundle(context, {
        text: "real product direction",
        docKind: "spec",
      });

      expect(bundle.totalMatches).toBeGreaterThan(0);
      expect(bundle.results[0]?.id).toBe("SPEC-001");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("supports linked-to and neighborhood-aware retrieval", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-query-"));

    try {
      await initializeProject(rootDir);
      const context = await loadProjectContext(rootDir);

      const linkedBundle = buildMemoryQueryBundle(context, { linkedTo: "SPEC-001", limit: 10 });
      expect(linkedBundle.results.some((result) => result.id === "TASK-001")).toBe(true);
      expect(linkedBundle.results.some((result) => result.id === "CURRENT")).toBe(true);
      expect(linkedBundle.results.some((result) => result.id === "SPEC-001")).toBe(false);

      const neighborhoodBundle = buildMemoryQueryBundle(context, { neighborOf: "TASK-001", limit: 10 });
      expect(neighborhoodBundle.results.some((result) => result.id === "SPEC-001")).toBe(true);
      expect(neighborhoodBundle.results.some((result) => result.id === "TASK-002")).toBe(true);
      expect(neighborhoodBundle.results.some((result) => result.id === "CURRENT")).toBe(true);
      expect(neighborhoodBundle.results.some((result) => result.id === "TASK-001")).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("supports scoped note retrieval without changing repo-memory defaults", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-query-"));

    try {
      await initializeProject(rootDir);
      await writeMemoryNote(
        rootDir,
        "session",
        "NOTE-SESSION-current-scratchpad.md",
        `+++
doc_kind = "memory-note"
id = "NOTE-SESSION-001"
title = "Current scratchpad"
summary = "Session-local implementation notes."
tags = ["scratch", "session"]
updated_at = "2026-04-26T00:00:00.000Z"
+++

# Notes

Track the current scratch plan here.
`,
      );
      await writeMemoryNote(
        rootDir,
        "org",
        "NOTE-ORG-style-guide.md",
        `+++
doc_kind = "memory-note"
id = "NOTE-ORG-001"
title = "Shared style guide"
summary = "Org-level guidance for future agents."
tags = ["policy", "org"]
updated_at = "2026-04-26T00:00:00.000Z"
+++

# Guidance

Prefer stable file references and concise answers.
`,
      );

      const context = await loadProjectContext(rootDir);

      const sessionBundle = buildMemoryQueryBundle(context, { scope: "session", docKind: "memory-note" });
      expect(sessionBundle.totalMatches).toBe(1);
      expect(sessionBundle.results[0]?.id).toBe("NOTE-SESSION-001");
      expect(sessionBundle.results[0]?.scope).toBe("session");

      const orgBundle = buildMemoryQueryBundle(context, { scope: "org", text: "style guide" });
      expect(orgBundle.results[0]?.id).toBe("NOTE-ORG-001");
      expect(orgBundle.results[0]?.scope).toBe("org");

      const repoBundle = buildMemoryQueryBundle(context, { scope: "repo", tags: ["seed"] });
      expect(repoBundle.results.some((result) => result.id === "SPEC-001")).toBe(true);
      expect(repoBundle.results.some((result) => result.scope !== "repo")).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});

describe("memory query command", () => {
  test("renders compact human output and structured JSON", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-query-"));

    try {
      await initializeProject(rootDir);
      await createSpec(rootDir, {
        title: "Self hosting memory query fixture",
        summary: "A fixture spec with a hyphenated tag.",
        tags: ["self-hosting"],
      });

      const human = await runMemoryCommand(rootDir, parseArgs(["memory", "query", "--tag", "seed", "--limit", "2"]));
      expect(human).toContain("SPEC-001 [spec active scope:repo]");
      expect(human).toContain("match:");
      expect(human).toContain("tags: adoption, seed");

      const json = await runMemoryCommand(
        rootDir,
        parseArgs(["memory", "query", "--linked-to", "SPEC-001", "--json"]),
      );
      const bundle = JSON.parse(json) as {
        totalMatches: number;
        results: Array<{ id: string; relationHints: string[]; matchReasons: string[] }>;
      };

      expect(bundle.totalMatches).toBeGreaterThan(0);
      expect(bundle.results.some((result) => result.id === "TASK-001")).toBe(true);
      expect(bundle.results.some((result) => result.relationHints.length > 0)).toBe(true);
      expect(bundle.results.some((result) => result.matchReasons.some((reason) => reason.startsWith("linked:")))).toBe(true);

      const normalizedTagHuman = await runMemoryCommand(
        rootDir,
        parseArgs(["memory", "query", "--tag", "self hosting", "--limit", "3"]),
      );
      expect(normalizedTagHuman).toContain("match: tag:self-hosting");

      await writeMemoryNote(
        rootDir,
        "session",
        "NOTE-SESSION-work-log.md",
        `+++
doc_kind = "memory-note"
id = "NOTE-SESSION-002"
title = "Work log"
summary = "Session notes for the current flow."
tags = ["session"]
updated_at = "2026-04-26T00:00:00.000Z"
+++

Keep the local work log here.
`,
      );

      const scopedHuman = await runMemoryCommand(
        rootDir,
        parseArgs(["memory", "query", "--scope", "session", "--doc-kind", "memory-note"]),
      );
      expect(scopedHuman).toContain("NOTE-SESSION-002 [memory-note scope:session]");

      const scopesJson = await runMemoryCommand(rootDir, parseArgs(["memory", "scopes", "--json"]));
      const scopesBundle = JSON.parse(scopesJson) as {
        scopes: Array<{ scope: string; writePolicy: string; documentCount: number }>;
      };

      expect(scopesBundle.scopes.some((scope) => scope.scope === "repo" && scope.writePolicy === "read-write")).toBe(true);
      expect(scopesBundle.scopes.some((scope) => scope.scope === "session" && scope.documentCount === 1)).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("rejects invalid typed filters", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-query-"));

    try {
      await initializeProject(rootDir);

      await expect(runMemoryCommand(rootDir, parseArgs(["memory", "query", "--doc-kind", "note"]))).rejects.toThrow(
        "Invalid memory doc kind",
      );
      await expect(runMemoryCommand(rootDir, parseArgs(["memory", "query", "--scope", "team"]))).rejects.toThrow(
        "Invalid memory scope",
      );
      await expect(
        runMemoryCommand(rootDir, parseArgs(["memory", "query", "--text", "   "])),
      ).rejects.toThrow("`--text` must contain at least one non-whitespace character.");
      await expect(
        runMemoryCommand(rootDir, parseArgs(["memory", "query", "--linked-to", "DOC-999"])),
      ).rejects.toThrow("Unknown document ID");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
