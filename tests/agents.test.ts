import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildAgentsHealthReport, renderAgentsHealthReport } from "../src/services/agents.ts";

describe("agents service", () => {
  test("reports healthy AGENTS chains", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-agents-"));

    try {
      await writeFile(join(rootDir, "AGENTS.md"), "# AGENTS\n\nShort root guidance.\n", "utf8");
      await mkdir(join(rootDir, "src", "commands"), { recursive: true });
      await writeFile(join(rootDir, "src", "AGENTS.md"), "# AGENTS\n\nShort src guidance.\n", "utf8");
      await writeFile(join(rootDir, "src", "commands", "AGENTS.md"), "# AGENTS\n\nShort commands guidance.\n", "utf8");

      const report = await buildAgentsHealthReport(rootDir);

      expect(report.summary.ok).toBe(true);
      expect(report.summary.fileCount).toBe(3);
      expect(report.summary.maxChainTokens).toBeGreaterThan(0);
      expect(renderAgentsHealthReport(report)).toContain("Chain report");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("flags oversized AGENTS files", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-agents-"));

    try {
      const oversized = `# AGENTS\n\n${"word ".repeat(1500)}`;
      await writeFile(join(rootDir, "AGENTS.md"), oversized, "utf8");

      const report = await buildAgentsHealthReport(rootDir);

      expect(report.summary.ok).toBe(false);
      expect(report.failures[0]).toContain("exceeds hard cap");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
