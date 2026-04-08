import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeProject, loadProjectContext } from "../src/repository.ts";
import { buildMemoryIndex } from "../src/services/memory-index.ts";
import {
  buildMemoryLinkGraph,
  buildMemoryNeighborhood,
  getIncomingMemoryRelations,
  getOutgoingMemoryRelations,
} from "../src/services/memory-links.ts";

describe("memory retrieval foundation services", () => {
  test("builds a deterministic index from managed docs with normalized retrieval terms", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-"));

    try {
      await initializeProject(rootDir);
      const context = await loadProjectContext(rootDir);
      const index = buildMemoryIndex(context);

      expect(index.entries.some((entry) => entry.id === "SPEC-001")).toBe(true);
      expect(index.entries.some((entry) => entry.id === "TASK-001")).toBe(true);
      expect(index.byKind.get("task")?.some((entry) => entry.id === "TASK-001")).toBe(true);

      const specEntry = index.byId.get("SPEC-001");
      expect(specEntry?.docKind).toBe("spec");
      expect(specEntry?.status).toBe("active");
      expect(specEntry?.normalizedTerms).toContain("spec-001");
      expect(specEntry?.normalizedTerms).toContain("adoption");
      expect(specEntry?.normalizedTerms).toContain("memory");
      expect(specEntry?.normalizedTerms).toContain("seed");

      const currentEntry = index.byId.get("CURRENT");
      expect(currentEntry?.docKind).toBe("current-state");
      expect(currentEntry?.normalizedTerms).toContain("current");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("derives typed incoming and outgoing relations across managed memory", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-"));

    try {
      await initializeProject(rootDir);
      const context = await loadProjectContext(rootDir);
      const graph = buildMemoryLinkGraph(context);

      const specOutgoing = getOutgoingMemoryRelations(graph, "SPEC-001");
      expect(specOutgoing.some((relation) => relation.relation === "spec-task" && relation.toId === "TASK-001")).toBe(true);

      const taskOutgoing = getOutgoingMemoryRelations(graph, "TASK-002");
      expect(taskOutgoing.some((relation) => relation.relation === "task-depends-on" && relation.toId === "TASK-001")).toBe(true);
      expect(taskOutgoing.some((relation) => relation.relation === "task-spec" && relation.toId === "SPEC-001")).toBe(true);

      const taskIncoming = getIncomingMemoryRelations(graph, "TASK-001");
      expect(taskIncoming.some((relation) => relation.relation === "task-depends-on" && relation.fromId === "TASK-002")).toBe(true);
      expect(taskIncoming.some((relation) => relation.relation === "spec-task" && relation.fromId === "SPEC-001")).toBe(true);

      const currentOutgoing = getOutgoingMemoryRelations(graph, "CURRENT");
      expect(currentOutgoing.some((relation) => relation.relation === "current-active-spec" && relation.toId === "SPEC-001")).toBe(true);
      expect(currentOutgoing.some((relation) => relation.relation === "current-active-task" && relation.toId === "TASK-001")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("builds deterministic local neighborhoods around a managed doc", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-"));

    try {
      await initializeProject(rootDir);
      const context = await loadProjectContext(rootDir);
      const graph = buildMemoryLinkGraph(context);

      const neighborhood = buildMemoryNeighborhood(graph, "TASK-001", { depth: 1 });

      expect(neighborhood.centerId).toBe("TASK-001");
      expect(neighborhood.documentIds).toContain("TASK-001");
      expect(neighborhood.documentIds).toContain("SPEC-001");
      expect(neighborhood.documentIds).toContain("TASK-002");
      expect(neighborhood.relations.some((relation) => relation.fromId === "SPEC-001" && relation.toId === "TASK-001")).toBe(true);
      expect(neighborhood.relations.some((relation) => relation.fromId === "TASK-002" && relation.toId === "TASK-001")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
