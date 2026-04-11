import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runNexusCommand } from "../src/commands/nexus.ts";
import { initializeProject } from "../src/repository.ts";
import { buildNexusSetupReport } from "../src/services/nexus.ts";

function countOccurrences(input: string, pattern: string): number {
  return input.split(pattern).length - 1;
}

describe("nexus setup service", () => {
  test("plans setup without writing files by default", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-nexus-"));

    try {
      await initializeProject(rootDir);
      const beforeConfig = await readFile(join(rootDir, ".specpm", "config.toml"), "utf8");

      const report = await buildNexusSetupReport(rootDir);

      expect(report.applied).toBe(false);
      expect(report.command).toBe("gitnexus");
      expect(report.actions.some((action) => action.status === "planned")).toBe(true);
      expect(await readFile(join(rootDir, ".specpm", "config.toml"), "utf8")).toBe(beforeConfig);
      expect(await Bun.file(join(rootDir, "AGENTS.md")).exists()).toBe(false);
      expect(await Bun.file(join(rootDir, ".gitignore")).exists()).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("applies bounded Nexus setup and can be rerun without duplicates", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-nexus-"));

    try {
      await initializeProject(rootDir);

      const report = await buildNexusSetupReport(rootDir, { apply: true });
      const secondReport = await buildNexusSetupReport(rootDir, { apply: true });
      const configRaw = await readFile(join(rootDir, ".specpm", "config.toml"), "utf8");
      const agentsRaw = await readFile(join(rootDir, "AGENTS.md"), "utf8");
      const gitignoreRaw = await readFile(join(rootDir, ".gitignore"), "utf8");
      const migrationGuide = await readFile(join(rootDir, "docs", "spm", "adoption", "migration-guide.md"), "utf8");
      const agentBrief = await readFile(join(rootDir, "docs", "spm", "adoption", "direct-agent-brief.md"), "utf8");

      expect(report.applied).toBe(true);
      expect(secondReport.actions.some((action) => action.code === "config" && action.status === "already-ok")).toBe(true);
      expect(configRaw).toContain("[nexus]");
      expect(configRaw).toContain("enabled = true");
      expect(configRaw).toContain('command = "gitnexus"');
      expect(countOccurrences(configRaw, "[nexus]")).toBe(1);
      expect(agentsRaw).toContain("Nexus Coexistence");
      expect(countOccurrences(agentsRaw, "Nexus Coexistence")).toBe(1);
      expect(gitignoreRaw).toContain(".gitnexus");
      expect(gitignoreRaw).toContain(".claude");
      expect(countOccurrences(gitignoreRaw, ".gitnexus")).toBe(1);
      expect(countOccurrences(gitignoreRaw, ".claude")).toBe(1);
      expect(migrationGuide).toContain("Nexus Setup Flow");
      expect(agentBrief).toContain("Use Nexus for code impact, related-code, and blast-radius analysis only.");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("refreshes older Nexus AGENTS contracts with setup guidance", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-nexus-"));

    try {
      await initializeProject(rootDir);
      await Bun.write(
        join(rootDir, "AGENTS.md"),
        [
          "# AGENTS",
          "",
          "## Nexus Coexistence",
          "",
          "- Nexus is optional and external to Spec Embryo; install and upgrade it separately using the upstream project instructions.",
          "- Use `spm` as the source of truth for specs, tasks, current state, handoffs, adoption structure, and deterministic workflow.",
          "- Use Nexus for code impact, related-code, and blast-radius analysis only.",
          "- Do not let Nexus replace or overwrite root `AGENTS.md`; keep any Nexus-specific guidance additive or scoped below the root.",
          "- After enabling Nexus in `.specpm/config.toml`, re-run `spm doctor` so the bounded coexistence checks can confirm the setup.",
          "",
        ].join("\n"),
      );

      const report = await buildNexusSetupReport(rootDir, { apply: true });
      const agentsRaw = await readFile(join(rootDir, "AGENTS.md"), "utf8");

      expect(report.actions.some((action) => action.code === "agents" && action.status === "applied")).toBe(true);
      expect(agentsRaw).toContain("spm nexus setup");
      expect(agentsRaw).toContain("spm nexus setup --apply");
      expect(countOccurrences(agentsRaw, "Nexus Coexistence")).toBe(1);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("honors anchored gitignore rules without adding duplicates", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-nexus-"));

    try {
      await initializeProject(rootDir);
      await Bun.write(join(rootDir, ".gitignore"), "/.gitnexus/\n/.claude/\n");

      const report = await buildNexusSetupReport(rootDir, { apply: true });
      const gitignoreRaw = await readFile(join(rootDir, ".gitignore"), "utf8");

      expect(report.actions.some((action) => action.code === "gitignore" && action.status === "already-ok")).toBe(true);
      expect(gitignoreRaw).toBe("/.gitnexus/\n/.claude/\n");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("can place the coexistence contract in a scoped AGENTS file", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-nexus-"));

    try {
      await initializeProject(rootDir);

      await buildNexusSetupReport(rootDir, {
        apply: true,
        command: "custom-nexus",
        rootAgentsMode: "scoped",
      });
      const configRaw = await readFile(join(rootDir, ".specpm", "config.toml"), "utf8");
      const scopedAgentsRaw = await readFile(join(rootDir, "docs", "spm", "AGENTS.md"), "utf8");

      expect(configRaw).toContain('command = "custom-nexus"');
      expect(configRaw).toContain('root_agents_mode = "scoped"');
      expect(await Bun.file(join(rootDir, "AGENTS.md")).exists()).toBe(false);
      expect(scopedAgentsRaw).toContain("Nexus Coexistence");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("explains missing adoption before applying Nexus setup", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-nexus-"));

    try {
      const report = await buildNexusSetupReport(rootDir);

      expect(report.actions[0]?.code).toBe("missing-config");
      await expect(buildNexusSetupReport(rootDir, { apply: true })).rejects.toThrow("Run `spm init` first");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("uses the selected Nexus command in follow-up indexing guidance", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-nexus-"));

    try {
      await initializeProject(rootDir);

      const report = await buildNexusSetupReport(rootDir, { command: "custom-nexus" });

      expect(report.nextCommands).toContain(`custom-nexus analyze --skip-agents-md --force ${rootDir}`);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});

describe("nexus setup command", () => {
  test("renders human and structured setup output", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-nexus-"));

    try {
      await initializeProject(rootDir);

      const human = await runNexusCommand(rootDir, parseArgs(["nexus", "setup"]));
      expect(human).toContain("Nexus setup plan");
      expect(human).toContain("Run `spm nexus setup --apply`");

      const json = await runNexusCommand(rootDir, parseArgs(["nexus", "setup", "--json"]));
      const report = JSON.parse(json) as { applied: boolean; command: string; actions: Array<{ code: string }> };
      expect(report.applied).toBe(false);
      expect(report.command).toBe("gitnexus");
      expect(report.actions.some((action) => action.code === "config")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
