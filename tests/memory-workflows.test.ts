import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runMemoryCommand } from "../src/commands/memory.ts";
import { createSpec, createTask, initializeProject, updateCurrentState } from "../src/repository.ts";

describe("memory workflow scenarios", () => {
  test("multi-spec workflow stays coherent from query to links to brief", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-workflow-"));

    try {
      await initializeProject(rootDir);

      const anchorSpec = await createSpec(rootDir, {
        title: "Lantern adoption brief workflow",
        summary: "Coordinate the lantern adoption brief across migration and rollout work.",
        tags: ["adoption", "brief", "workflow"],
      });
      const rolloutSpec = await createSpec(rootDir, {
        title: "Lantern rollout coordination",
        summary: "Track follow-on rollout work after the adoption brief is drafted.",
        tags: ["rollout", "coordination"],
      });
      const draftTask = await createTask(rootDir, {
        title: "Draft the lantern adoption brief",
        summary: "Produce the first lantern adoption brief for migration guidance.",
        specIds: [anchorSpec.id],
        tags: ["adoption", "brief"],
      });
      const reviewTask = await createTask(rootDir, {
        title: "Review the lantern adoption brief",
        summary: "Review the draft and capture the decisions for rollout.",
        specIds: [anchorSpec.id],
        dependsOn: [draftTask.id],
        tags: ["adoption", "review"],
      });
      const crossSpecTask = await createTask(rootDir, {
        title: "Coordinate lantern rollout after the brief",
        summary: "Use the adoption brief to coordinate the rollout sequence.",
        specIds: [rolloutSpec.id],
        dependsOn: [draftTask.id],
        tags: ["rollout", "brief"],
      });

      await updateCurrentState(rootDir, {
        summary: "Lantern brief work is active across adoption and rollout.",
        focus: "Use memory tools to navigate the lantern adoption brief workflow.",
        activeSpecIds: [anchorSpec.id],
        activeTaskIds: [draftTask.id],
        blockedTaskIds: [reviewTask.id],
        nextActionHints: ["Review the lantern adoption brief and coordinate rollout follow-up."],
      });

      const query = JSON.parse(
        await runMemoryCommand(
          rootDir,
          parseArgs(["memory", "query", "--text", "lantern adoption brief", "--limit", "5", "--json"]),
        ),
      ) as {
        results: Array<{ id: string }>;
      };

      expect(query.results[0]?.id).toBe(anchorSpec.id);
      expect(query.results.some((item) => item.id === draftTask.id)).toBe(true);
      expect(query.results.some((item) => item.id === reviewTask.id)).toBe(true);

      const links = JSON.parse(
        await runMemoryCommand(
          rootDir,
          parseArgs(["memory", "links", draftTask.id, "--depth", "2", "--json"]),
        ),
      ) as {
        outgoing: Array<{ relation: string; items: Array<{ id: string }> }>;
        incoming: Array<{ relation: string; items: Array<{ id: string }> }>;
        neighborhood: Array<{ id: string }>;
      };

      expect(
        links.outgoing.some(
          (group) => group.relation === "task-spec" && group.items.some((target) => target.id === anchorSpec.id),
        ),
      ).toBe(true);
      expect(
        links.incoming.some(
          (group) => group.relation === "task-depends-on" && group.items.some((target) => target.id === reviewTask.id),
        ),
      ).toBe(true);
      expect(
        links.incoming.some(
          (group) => group.relation === "task-depends-on" && group.items.some((target) => target.id === crossSpecTask.id),
        ),
      ).toBe(true);
      expect(links.neighborhood.some((item) => item.id === rolloutSpec.id)).toBe(true);

      const brief = JSON.parse(
        await runMemoryCommand(
          rootDir,
          parseArgs(["memory", "brief", "--text", "lantern adoption brief", "--profile", "migration", "--json"]),
        ),
      ) as {
        matches?: Array<{ id: string }>;
        current?: { activeSpecIds: string[]; activeTaskIds: string[]; blockedTaskIds: string[] };
        nextInspectIds: string[];
      };

      expect(brief.matches?.[0]?.id).toBe(anchorSpec.id);
      expect(brief.current?.activeSpecIds).toContain(anchorSpec.id);
      expect(brief.current?.activeTaskIds).toContain(draftTask.id);
      expect(brief.current?.blockedTaskIds).toContain(reviewTask.id);
      expect(brief.nextInspectIds).toContain(anchorSpec.id);
      expect(brief.nextInspectIds).toContain(draftTask.id);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("tag-driven workflow uses exact normalized tags across query, links, and brief", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-memory-workflow-"));

    try {
      await initializeProject(rootDir);

      const spec = await createSpec(rootDir, {
        title: "Migration guide alignment",
        summary: "Align migration guide expectations for external adoption.",
        tags: ["migration-guide", "adoption"],
      });
      const task = await createTask(rootDir, {
        title: "Draft the migration guide outline",
        summary: "Create the first migration guide outline for adopted repos.",
        specIds: [spec.id],
        tags: ["migration_guide", "adoption"],
      });

      const query = JSON.parse(
        await runMemoryCommand(
          rootDir,
          parseArgs(["memory", "query", "--tag", "migration guide", "--limit", "5", "--json"]),
        ),
      ) as {
        results: Array<{ id: string; matchReasons: string[] }>;
      };

      expect(query.results.some((item) => item.id === spec.id)).toBe(true);
      expect(query.results.some((item) => item.id === task.id)).toBe(true);
      expect(query.results.every((item) => item.matchReasons.includes("tag:migration-guide"))).toBe(true);

      const links = JSON.parse(
        await runMemoryCommand(rootDir, parseArgs(["memory", "links", task.id, "--json"])),
      ) as {
        outgoing: Array<{ relation: string; items: Array<{ id: string }> }>;
      };

      expect(
        links.outgoing.some(
          (group) => group.relation === "task-spec" && group.items.some((target) => target.id === spec.id),
        ),
      ).toBe(true);

      const brief = JSON.parse(
        await runMemoryCommand(
          rootDir,
          parseArgs(["memory", "brief", "--task", task.id, "--profile", "migration", "--json"]),
        ),
      ) as {
        center?: { id: string; tags: string[] };
        nextInspectIds: string[];
      };

      expect(brief.center?.id).toBe(task.id);
      expect(brief.center?.tags).toContain("migration_guide");
      expect(brief.nextInspectIds).toContain(task.id);
      expect(brief.nextInspectIds).toContain(spec.id);

      const noMatch = await runMemoryCommand(
        rootDir,
        parseArgs(["memory", "query", "--tag", "guide", "--limit", "5"]),
      );
      expect(noMatch).toContain("No managed memory documents matched the query.");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
