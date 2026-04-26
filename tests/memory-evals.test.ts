import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseArgs } from "../src/cli.ts";
import { runMemoryCommand } from "../src/commands/memory.ts";
import { loadProjectContext } from "../src/repository.ts";
import { buildMemoryEvalBundle } from "../src/services/memory-evals.ts";
import { buildMemoryBriefBundle } from "../src/services/memory-brief.ts";
import { buildMemoryQueryBundle } from "../src/services/memory-query.ts";

const repoRoot = join(import.meta.dir, "..");

describe("agent-style memory retrieval evals", () => {
  test("adoption queries prefer the parent spec as the conceptual anchor", async () => {
    const context = await loadProjectContext(repoRoot);
    const bundle = buildMemoryQueryBundle(context, { text: "adoption", limit: 10 });

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

describe("memory eval harness", () => {
  test("builds passing retrieval, pack, consolidation, and injection scenarios", async () => {
    const bundle = await buildMemoryEvalBundle(repoRoot, [
      "retrieval",
      "pack",
      "consolidation",
      "injection",
    ]);

    expect(bundle.overallStatus).toBe("pass");
    expect(bundle.scenarioCount).toBe(4);
    expect(bundle.failedScenarioCount).toBe(0);
    expect(bundle.scenarios.some((scenario) => scenario.suite === "consolidation")).toBe(true);
    expect(bundle.scenarios.every((scenario) => scenario.checks.length > 0)).toBe(true);
  });

  test("renders filtered eval suites through the memory command", async () => {
    const human = await runMemoryCommand(repoRoot, parseArgs(["memory", "eval", "--suite", "retrieval,pack"]));
    expect(human).toContain("Memory eval: pass");
    expect(human).toContain("Suites: pack, retrieval");
    expect(human).toContain("[retrieval] retrieval-anchor-spec-title: pass");
    expect(human).toContain("[pack] pack-anchor-task-shape: pass");

    const json = await runMemoryCommand(
      repoRoot,
      parseArgs(["memory", "eval", "--suite", "consolidation", "--json"]),
    );
    const bundle = JSON.parse(json) as {
      suites: string[];
      overallStatus: string;
      scenarios: Array<{ suite: string; status: string }>;
    };

    expect(bundle.suites).toEqual(["consolidation"]);
    expect(bundle.overallStatus).toBe("pass");
    expect(bundle.scenarios).toHaveLength(1);
    expect(bundle.scenarios[0]?.suite).toBe("consolidation");
    expect(bundle.scenarios[0]?.status).toBe("pass");
  });
});
