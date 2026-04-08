import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runMemoryCommand } from "../src/commands/memory.ts";
import { loadProjectContext, initializeProject } from "../src/repository.ts";
import { buildMemoryQueryBundle } from "../src/services/memory-query.ts";

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
});

describe("memory query command", () => {
  test("renders compact human output and structured JSON", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-query-"));

    try {
      await initializeProject(rootDir);

      const human = await runMemoryCommand(rootDir, parseArgs(["memory", "query", "--tag", "seed", "--limit", "2"]));
      expect(human).toContain("SPEC-001 [spec active]");
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
