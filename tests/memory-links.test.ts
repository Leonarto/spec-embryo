import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runMemoryCommand } from "../src/commands/memory.ts";
import { initializeProject, loadProjectContext } from "../src/repository.ts";
import { buildMemoryLinkGraph, buildMemoryLinksBundle } from "../src/services/memory-links.ts";

describe("memory links service", () => {
  test("groups outgoing, incoming, and neighborhood relations deterministically", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-links-"));

    try {
      await initializeProject(rootDir);
      const context = await loadProjectContext(rootDir);
      const graph = buildMemoryLinkGraph(context);
      const bundle = buildMemoryLinksBundle(graph, "TASK-001", { depth: 2 });

      expect(bundle.center.id).toBe("TASK-001");
      expect(bundle.depth).toBe(2);
      expect(bundle.outgoing.some((group) => group.relation === "task-spec")).toBe(true);
      expect(bundle.incoming.some((group) => group.relation === "task-depends-on")).toBe(true);
      expect(bundle.neighborhood.some((item) => item.id === "TASK-002")).toBe(true);
      expect(bundle.neighborhood.some((item) => item.id === "SPEC-001")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});

describe("memory links command", () => {
  test("renders grouped human output and structured JSON", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-links-"));

    try {
      await initializeProject(rootDir);

      const human = await runMemoryCommand(rootDir, parseArgs(["memory", "links", "TASK-001", "--depth", "2"]));
      expect(human).toContain("TASK-001 [task]");
      expect(human).toContain("Outgoing:");
      expect(human).toContain("Incoming:");
      expect(human).toContain("Neighborhood:");

      const json = await runMemoryCommand(rootDir, parseArgs(["memory", "links", "TASK-001", "--json"]));
      const bundle = JSON.parse(json) as {
        center: { id: string };
        outgoing: Array<{ relation: string }>;
        incoming: Array<{ relation: string }>;
        neighborhood: Array<{ id: string }>;
      };

      expect(bundle.center.id).toBe("TASK-001");
      expect(bundle.outgoing.some((group) => group.relation === "task-spec")).toBe(true);
      expect(bundle.incoming.some((group) => group.relation === "task-depends-on")).toBe(true);
      expect(bundle.neighborhood.some((item) => item.id === "SPEC-001")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("rejects missing or unknown doc ids", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-links-"));

    try {
      await initializeProject(rootDir);

      await expect(runMemoryCommand(rootDir, parseArgs(["memory", "links"]))).rejects.toThrow(
        "`memory links` requires <DOC-ID>.",
      );
      await expect(runMemoryCommand(rootDir, parseArgs(["memory", "links", "DOC-999"]))).rejects.toThrow(
        "Unknown document ID for memory links",
      );
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
