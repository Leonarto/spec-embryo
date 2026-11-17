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
      await mkdir(join(rootDir, ".specpm"), { recursive: true });
      await writeFile(join(rootDir, ".specpm", "config.toml"), 'tool_version = "0.1.0"\nproject_name = "tmp"\n', "utf8");
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
      await mkdir(join(rootDir, ".specpm"), { recursive: true });
      await writeFile(join(rootDir, ".specpm", "config.toml"), 'tool_version = "0.1.0"\nproject_name = "tmp"\n', "utf8");
      const oversized = `# AGENTS\n\n${"word ".repeat(1500)}`;
      await writeFile(join(rootDir, "AGENTS.md"), oversized, "utf8");

      const report = await buildAgentsHealthReport(rootDir);

      expect(report.summary.ok).toBe(false);
      expect(report.failures[0]).toContain("exceeds hard cap");
      expect(report.config.rootHardCap).toBe(1200);
      expect(renderAgentsHealthReport(report)).toContain("context_window=400000");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("scales budgets from project context policy", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-agents-"));

    try {
      await mkdir(join(rootDir, ".specpm"), { recursive: true });
      await writeFile(
        join(rootDir, ".specpm", "config.toml"),
        [
          'tool_version = "0.1.0"',
          'project_name = "tmp"',
          "",
          "[agents]",
          "context_window_tokens = 1000000",
        ].join("\n"),
        "utf8",
      );
      await writeFile(join(rootDir, "AGENTS.md"), `# AGENTS\n\n${"word ".repeat(1500)}`, "utf8");

      const report = await buildAgentsHealthReport(rootDir);

      expect(report.summary.ok).toBe(true);
      expect(report.config.contextWindowTokens).toBe(1_000_000);
      expect(report.config.rootHardCap).toBe(3000);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("ignores local Nexus and Claude artifact AGENTS files", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-agents-"));

    try {
      await mkdir(join(rootDir, ".specpm"), { recursive: true });
      await writeFile(join(rootDir, ".specpm", "config.toml"), 'tool_version = "0.1.0"\nproject_name = "tmp"\n', "utf8");
      await writeFile(join(rootDir, "AGENTS.md"), "# AGENTS\n\nShort root guidance.\n", "utf8");
      await mkdir(join(rootDir, ".gitnexus", "generated"), { recursive: true });
      await mkdir(join(rootDir, ".claude", "skills"), { recursive: true });
      await writeFile(join(rootDir, ".gitnexus", "generated", "AGENTS.md"), `# AGENTS\n\n${"word ".repeat(5000)}`, "utf8");
      await writeFile(join(rootDir, ".claude", "skills", "AGENTS.md"), `# AGENTS\n\n${"word ".repeat(5000)}`, "utf8");

      const report = await buildAgentsHealthReport(rootDir);

      expect(report.summary.ok).toBe(true);
      expect(report.summary.fileCount).toBe(1);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
