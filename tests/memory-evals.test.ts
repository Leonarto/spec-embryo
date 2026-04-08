import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { loadProjectContext } from "../src/repository.ts";
import { buildMemoryBriefBundle } from "../src/services/memory-brief.ts";
import { buildMemoryQueryBundle } from "../src/services/memory-query.ts";

const repoRoot = join(import.meta.dir, "..");

describe("agent-style memory retrieval evals", () => {
  test("adoption queries prefer the parent spec as the conceptual anchor", async () => {
    const context = await loadProjectContext(repoRoot);
    const bundle = buildMemoryQueryBundle(context, { text: "adoption", limit: 5 });

    expect(bundle.results[0]?.id).toBe("SPEC-010");
    expect(bundle.results[0]?.matchReasons).toContain("spec anchor");
    expect(bundle.results.some((item) => item.id === "TASK-040")).toBe(true);
  });

  test("memory command family queries surface the umbrella spec before narrower tasks", async () => {
    const context = await loadProjectContext(repoRoot);
    const bundle = buildMemoryQueryBundle(context, { text: "memory query", limit: 5 });

    expect(bundle.results[0]?.id).toBe("SPEC-013");
    expect(bundle.results[0]?.matchReasons).toContain("spec anchor");
    expect(bundle.results.some((item) => item.id === "TASK-047")).toBe(true);
  });

  test("migration briefs preserve ranked spec matches and explain why they were selected", async () => {
    const context = await loadProjectContext(repoRoot);
    const bundle = buildMemoryBriefBundle(context, {
      text: "adoption",
      profile: "migration",
    });

    expect(bundle.matches?.[0]?.id).toBe("SPEC-010");
    expect(bundle.matches?.[0]?.matchReasons).toContain("spec anchor");
    expect(bundle.nextInspectIds).toContain("SPEC-010");
  });
});
