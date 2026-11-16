import { describe, expect, test } from "bun:test";
import { parseArgs } from "../src/cli.ts";
import { runTestsCommand } from "../src/commands/tests.ts";
import { buildTestDiagnosticsBundle } from "../src/services/test-diagnostics.ts";

describe("test diagnostics", () => {
  test("documents sensitive self-hosting test areas and rerun commands", async () => {
    const bundle = buildTestDiagnosticsBundle();

    expect(bundle.areas.some((area) => area.id === "git-worktree-state" && area.risk === "git")).toBe(true);
    expect(bundle.areas.some((area) => area.rerunCommand.includes("tests/storage.test.ts"))).toBe(true);
    const locking = bundle.areas.find(area => area.id === "filesystem-locking")!;
    expect(locking.files).toContain("tests/spec-answer-write.test.ts");
    expect(locking.rerunCommand).toContain("tests/spec-answer-write.test.ts");
    expect(locking.files).toContain("tests/document-parse-memo.test.ts");
    expect(locking.rerunCommand).toContain("tests/document-parse-memo.test.ts");

    const human = await runTestsCommand(process.cwd(), parseArgs(["tests", "diagnose"]));
    expect(human).toContain("Self-hosting test diagnostics");
    expect(human).toContain("git-worktree-state");

    const json = await runTestsCommand(process.cwd(), parseArgs(["tests", "diagnose", "--json"]));
    const payload = JSON.parse(json) as { areas: Array<{ id: string; mitigation: string }> };
    expect(payload.areas[0]?.mitigation).toContain("temporary");
  });
});
