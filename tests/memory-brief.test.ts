import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runMemoryCommand } from "../src/commands/memory.ts";
import { initializeProject, loadProjectContext } from "../src/repository.ts";
import { buildMemoryBriefBundle } from "../src/services/memory-brief.ts";

describe("memory brief service", () => {
  test("builds a compact task-centered brief with current state and neighbors", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-brief-"));

    try {
      await initializeProject(rootDir);
      const context = await loadProjectContext(rootDir);
      const bundle = buildMemoryBriefBundle(context, { taskId: "TASK-001" });

      expect(bundle.center?.id).toBe("TASK-001");
      expect(bundle.center?.matchReasons).toContain("explicit task");
      expect(bundle.center?.evidence.length).toBeGreaterThan(0);
      expect(bundle.center?.evidence[0]?.reason).toContain("explicit target");
      expect(bundle.current?.activeTaskIds).toContain("TASK-001");
      expect(bundle.neighbors.some((item) => item.id === "SPEC-001")).toBe(true);
      expect(bundle.nextInspectIds).toContain("TASK-001");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("builds a text-oriented brief from memory query matches", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-brief-"));

    try {
      await initializeProject(rootDir);
      const context = await loadProjectContext(rootDir);
      const bundle = buildMemoryBriefBundle(context, {
        text: "real project direction",
        profile: "migration",
      });

      expect(bundle.matches?.some((item) => item.id === "TASK-001")).toBe(true);
      expect(bundle.matches?.some((item) => item.matchReasons.length > 0)).toBe(true);
      expect(bundle.matches?.some((item) => item.evidence.length > 0)).toBe(true);
      expect(bundle.neighbors.length).toBeGreaterThan(0);
      expect(bundle.current?.activeSpecIds).toContain("SPEC-001");
      expect(bundle.nextInspectIds.length).toBeGreaterThan(0);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("honors include flags for neighbors, current state, and handoffs", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-brief-"));

    try {
      await initializeProject(rootDir);
      const context = await loadProjectContext(rootDir);

      const explicit = buildMemoryBriefBundle(context, {
        taskId: "TASK-001",
        includeNeighbors: false,
        includeCurrent: false,
        includeHandoffs: false,
      });
      expect(explicit.neighbors).toEqual([]);
      expect(explicit.current).toBeUndefined();
      expect(explicit.handoffs).toEqual([]);

      const textBundle = buildMemoryBriefBundle(context, {
        text: "real project direction",
        profile: "migration",
        includeNeighbors: false,
        includeCurrent: false,
        includeHandoffs: false,
      });
      expect(textBundle.neighbors).toEqual([]);
      expect(textBundle.current).toBeUndefined();
      expect(textBundle.handoffs).toEqual([]);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});

describe("memory brief command", () => {
  test("renders compact human output and stable JSON", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-brief-"));

    try {
      await initializeProject(rootDir);

      const human = await runMemoryCommand(rootDir, parseArgs(["memory", "brief", "--task", "TASK-001"]));
      expect(human).toContain("Memory brief [implementation]");
      expect(human).toContain("Center: TASK-001");
      expect(human).toContain("Match: explicit task");
      expect(human).toContain("Evidence:");
      expect(human).toContain("Neighbors:");

      const json = await runMemoryCommand(
        rootDir,
        parseArgs(["memory", "brief", "--text", "real project direction", "--profile", "migration", "--json"]),
      );
      const bundle = JSON.parse(json) as {
        request: { mode: string; profile: string };
        matches: Array<{ id: string; matchReasons: string[]; evidence: Array<{ text: string }> }>;
      };

      expect(bundle.request.mode).toBe("text");
      expect(bundle.request.profile).toBe("migration");
      expect(bundle.matches.some((item) => item.id === "TASK-001")).toBe(true);
      expect(bundle.matches.some((item) => item.matchReasons.length > 0)).toBe(true);
      expect(bundle.matches.some((item) => item.evidence.length > 0)).toBe(true);

      const trimmed = await runMemoryCommand(
        rootDir,
        parseArgs(["memory", "brief", "--task", "TASK-001", "--no-neighbors", "--no-current", "--no-handoffs"]),
      );
      expect(trimmed).not.toContain("Current:");
      expect(trimmed).toContain("Neighbors:\n- none");
      expect(trimmed).toContain("Handoffs:\n- none");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("rejects invalid brief entry modes and profiles", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-brief-"));

    try {
      await initializeProject(rootDir);

      await expect(runMemoryCommand(rootDir, parseArgs(["memory", "brief", "--task", "TASK-001", "--text", "cli"]))).rejects.toThrow(
        "requires exactly one",
      );
      await expect(
        runMemoryCommand(
          rootDir,
          parseArgs(["memory", "brief", "--task", "TASK-001", "--include-neighbors", "--no-neighbors"]),
        ),
      ).rejects.toThrow("Use either `--include-neighbors` or `--no-neighbors`, not both.");
      await expect(runMemoryCommand(rootDir, parseArgs(["memory", "brief", "--profile", "deep"]))).rejects.toThrow(
        "Invalid memory brief profile",
      );
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
