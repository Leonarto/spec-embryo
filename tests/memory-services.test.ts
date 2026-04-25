import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeProject, loadProjectContext } from "../src/repository.ts";
import { buildMemoryIndex, extractBodySearchValues } from "../src/services/memory-index.ts";
import {
  buildMemoryLinkGraph,
  buildMemoryNeighborhood,
  getIncomingMemoryRelations,
  getOutgoingMemoryRelations,
} from "../src/services/memory-links.ts";

describe("memory retrieval foundation services", () => {
  async function writeMemoryNote(rootDir: string, scope: "session" | "org", fileName: string, body: string): Promise<void> {
    const dir = join(rootDir, ".specpm", "memory", scope);
    await mkdir(dir, { recursive: true });
    await Bun.write(join(dir, fileName), body);
  }

  test("extracts section-aware body search values while skipping fenced-code noise", () => {
    const values = extractBodySearchValues(`
# Problem

Agents need stronger retrieval trust.

## Resolved Decisions

- Keep deterministic ranking.
- Avoid vector databases.

\`\`\`ts
const noisy = "do not index me";
\`\`\`

## Notes

Use [memory query](https://example.com) for navigation.
`);

    expect(values).toContain("Problem Agents need stronger retrieval trust.");
    expect(values).toContain("Resolved Decisions");
    expect(values).toContain("Resolved Decisions Keep deterministic ranking.");
    expect(values).toContain("Resolved Decisions Avoid vector databases.");
    expect(values).toContain("Notes Use memory query for navigation.");
    expect(values.some((value) => value.includes("noisy"))).toBe(false);
    expect(values).not.toContain("Problem");
  });

  test("recovers body indexing after an unclosed fenced block", () => {
    const values = extractBodySearchValues(`
# Problem

Keep the adoption guidance searchable.

\`\`\`ts
const noisy = "skip me";

## Notes

Index the prose that comes after the unfinished fence.
`);

    expect(values).toContain("Problem Keep the adoption guidance searchable.");
    expect(values).toContain("Notes Index the prose that comes after the unfinished fence.");
    expect(values.some((value) => value.includes("noisy"))).toBe(false);
  });

  test("builds a deterministic index from managed docs with normalized retrieval terms", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-"));

    try {
      await initializeProject(rootDir);
      await writeMemoryNote(
        rootDir,
        "session",
        "NOTE-SESSION-001.md",
        `+++
doc_kind = "memory-note"
id = "NOTE-SESSION-001"
title = "Local scratch"
summary = "Session scoped note."
tags = ["session", "scratch"]
updated_at = "2026-04-26T00:00:00.000Z"
+++

Keep local scratch notes here.
`,
      );
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
      expect(currentEntry?.scope).toBe("repo");
      expect(currentEntry?.normalizedTerms).toContain("current");

      const noteEntry = index.byId.get("NOTE-SESSION-001");
      expect(noteEntry?.docKind).toBe("memory-note");
      expect(noteEntry?.scope).toBe("session");
      expect(noteEntry?.normalizedTerms).toContain("scratch");
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
