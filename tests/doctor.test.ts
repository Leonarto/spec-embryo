import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runInitCommand } from "../src/commands/init.ts";
import { buildDoctorReport, renderDoctorReport } from "../src/services/doctor.ts";
import { initializeProject } from "../src/repository.ts";
import { CLI_VERSION } from "../src/services/version.ts";
import { loadProjectContext } from "../src/repository.ts";

const NEXUS_AGENTS_SECTION = `## Nexus Coexistence

- Use \`spm\` as the source of truth for specs, tasks, current state, handoffs, adoption structure, and deterministic workflow.
- Use Nexus for code impact, related-code, and blast-radius analysis only.
- Do not let Nexus replace or overwrite root \`AGENTS.md\`; keep any Nexus-specific guidance additive or scoped below the root.
`;

function replaceNexusSection(
  configRaw: string,
  replacement: {
    enabled: boolean;
    command: string;
    rootAgentsMode: string;
  },
): string {
  return configRaw.replace(
    /\[nexus\][\s\S]*?\n\n\[backends\.deterministic\]/u,
    `[nexus]
enabled = ${replacement.enabled ? "true" : "false"}
command = "${replacement.command}"
args = []
root_agents_mode = "${replacement.rootAgentsMode}"

[backends.deterministic]`,
  );
}

describe("doctor service", () => {
  test("reports missing adoption artifacts on a configured repo without generated guidance", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-doctor-"));

    try {
      await initializeProject(rootDir);
      const report = await buildDoctorReport(rootDir);

      expect(report.summary.overall).toBe("needs-attention");
      expect(report.adoption.state).toBe("adopted");
      expect(report.config.valid).toBe(true);
      expect(report.summary.blockingCount).toBe(0);
      expect(report.summary.warningCount).toBe(3);
      expect(report.findings.some((finding) => finding.code === "seed-scaffold-present")).toBe(true);
      expect(report.findings.some((finding) => finding.code === "missing-adoption-migration-guide")).toBe(true);
      expect(report.findings.some((finding) => finding.code === "missing-adoption-agent-brief")).toBe(true);
      expect(report.guidance.agentOrientation.some((item) => item.includes("not the adopted repo's product direction"))).toBe(true);
      expect(report.migrationGuideFile).toBe("docs/spm/adoption/migration-guide.md");
      expect(report.directAgentBriefFile).toBe("docs/spm/adoption/direct-agent-brief.md");
      expect(report.directAgentBrief).toContain("You are helping adopt Spec Embryo into this repository.");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("reports backlink drift as warnings", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-doctor-"));

    try {
      await initializeProject(rootDir);
      const taskFile = join(rootDir, "docs", "spm", "tasks", "TASK-001-inventory-the-real-project-direction-and-existing-docs.md");
      const taskRaw = await Bun.file(taskFile).text();
      await writeFile(taskFile, taskRaw.replace('spec_ids = ["SPEC-001"]', 'spec_ids = ["SPEC-999"]'), "utf8");

      const report = await buildDoctorReport(rootDir);

      expect(report.summary.overall).toBe("needs-attention");
      expect(report.findings.some((finding) => finding.code === "missing-spec-link")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("reports an invalid config as blocking", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-doctor-"));

    try {
      await mkdir(join(rootDir, ".specpm"), { recursive: true });
      await writeFile(join(rootDir, ".specpm", "config.toml"), "tool_version = 1", "utf8");

      const report = await buildDoctorReport(rootDir);

      expect(report.summary.overall).toBe("blocked");
      expect(report.findings.some((finding) => finding.code === "invalid-config")).toBe(true);
      expect(report.config.valid).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("surfaces when the running CLI is newer than the repo tool version", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-doctor-"));

    try {
      await initializeProject(rootDir);
      const configFile = join(rootDir, ".specpm", "config.toml");
      const configRaw = await Bun.file(configFile).text();
      await writeFile(configFile, configRaw.replace(`tool_version = "${CLI_VERSION}"`, 'tool_version = "0.1.0"'), "utf8");

      const report = await buildDoctorReport(rootDir);

      expect(report.versions.cliVersion).toBe(CLI_VERSION);
      expect(report.versions.projectToolVersion).toBe("0.1.0");
      expect(report.versions.updateAvailable).toBe(true);
      expect(report.findings.some((finding) => finding.code === "tool-upgrade-available")).toBe(true);
      expect(report.findings.find((finding) => finding.code === "tool-upgrade-available")?.hint).toContain("Refresh your SpM usage policy");
      expect(report.guidance.capabilityRefresh.required).toBe(true);
      expect(report.guidance.capabilityRefresh.actions.some((item) => item.includes("spm doctor --verbose"))).toBe(true);
      expect(report.directAgentBrief).toContain("spm memory note create");
      expect(report.directAgentBrief).toContain("Refresh your SpM usage policy");
      expect(report.findings.some((finding) => finding.code === "missing-adoption-migration-guide")).toBe(true);
      expect(report.findings.some((finding) => finding.code === "missing-adoption-agent-brief")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("warns when generated adoption artifacts are stale", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-doctor-"));

    try {
      const initOutput = await runInitCommand(rootDir, parseArgs(["init", "--json"]));
      const parsed = JSON.parse(initOutput) as {
        migration_guide_file: string;
        direct_agent_brief_file: string;
      };
      await writeFile(join(rootDir, parsed.migration_guide_file), "# stale migration guide\n", "utf8");
      await writeFile(join(rootDir, parsed.direct_agent_brief_file), "# stale brief\n", "utf8");

      const report = await buildDoctorReport(rootDir);

      expect(report.findings.some((finding) => finding.code === "stale-adoption-migration-guide")).toBe(true);
      expect(report.findings.some((finding) => finding.code === "stale-adoption-agent-brief")).toBe(true);
      expect(report.findings.find((finding) => finding.code === "stale-adoption-agent-brief")?.hint).toContain("Run `spm init`");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("treats non-canonical managed statuses as blocking parse errors", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-doctor-"));

    try {
      await initializeProject(rootDir);
      const specFile = join(rootDir, "docs", "spm", "specs", "SPEC-001-adopt-spec-embryo-memory-for-this-repository.md");
      const specRaw = await Bun.file(specFile).text();
      await writeFile(specFile, specRaw.replace('status = "active"', 'status = "planned"'), "utf8");

      const report = await buildDoctorReport(rootDir);

      expect(report.summary.overall).toBe("blocked");
      expect(report.findings.some((finding) => finding.code === "parse-error")).toBe(true);
      await expect(loadProjectContext(rootDir)).rejects.toThrow("Expected \"status\"");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("renders a concise default doctor report and a verbose expanded variant", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-doctor-"));

    try {
      await initializeProject(rootDir);
      const report = await buildDoctorReport(rootDir);

      const concise = renderDoctorReport(report);
      const verbose = renderDoctorReport(report, { verbose: true });

      expect(concise).toContain("Spec Embryo doctor");
      expect(concise).toContain("Findings:");
      expect(concise).toContain("Run `spm doctor --verbose`");
      expect(concise).toContain("spm agent brief");
      expect(concise).toContain("spm agent snippet");
      expect(concise).not.toContain("Adoption summary:");
      expect(concise).not.toContain("Direct agent brief (copy this to the current coding agent):");

      expect(verbose).toContain("Adoption summary:");
      expect(verbose).toContain("Current memory workflow:");
      expect(verbose).toContain("Optional external AGENTS.md snippet:");
      expect(verbose).toContain("## Optional SpM workflow");
      expect(verbose).toContain("spm agent snippet");
      expect(verbose).toContain("Capability refresh:");
      expect(verbose).toContain("spm memory note create");
      expect(verbose).toContain("Direct agent brief (copy this to the current coding agent):");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("warns when Nexus is enabled without a local command or coexistence guidance", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-doctor-"));

    try {
      await initializeProject(rootDir);
      const configFile = join(rootDir, ".specpm", "config.toml");
      const configRaw = await Bun.file(configFile).text();
      await writeFile(
        configFile,
        replaceNexusSection(configRaw, {
          enabled: true,
          command: "missing-nexus-command",
          rootAgentsMode: "reference-only",
        }),
        "utf8",
      );

      const report = await buildDoctorReport(rootDir);

      expect(report.summary.overall).toBe("needs-attention");
      expect(report.findings.some((finding) => finding.code === "nexus-command-missing")).toBe(true);
      expect(report.findings.some((finding) => finding.code === "nexus-missing-root-agents-guidance")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("blocks when Nexus is configured to own root AGENTS guidance", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-doctor-"));

    try {
      await initializeProject(rootDir);
      const configFile = join(rootDir, ".specpm", "config.toml");
      const configRaw = await Bun.file(configFile).text();
      await writeFile(
        configFile,
        replaceNexusSection(configRaw, {
          enabled: true,
          command: "bun",
          rootAgentsMode: "managed-by-nexus",
        }),
        "utf8",
      );
      await writeFile(join(rootDir, "AGENTS.md"), `# AGENTS\n\n${NEXUS_AGENTS_SECTION}`, "utf8");

      const report = await buildDoctorReport(rootDir);

      expect(report.summary.overall).toBe("blocked");
      expect(report.findings.some((finding) => finding.code === "nexus-unsafe-root-agents-mode")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("reports invalid Nexus AGENTS modes as invalid config", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-doctor-"));

    try {
      await initializeProject(rootDir);
      const configFile = join(rootDir, ".specpm", "config.toml");
      const configRaw = await Bun.file(configFile).text();
      await writeFile(
        configFile,
        replaceNexusSection(configRaw, {
          enabled: true,
          command: "bun",
          rootAgentsMode: "managed_by_nexus",
        }),
        "utf8",
      );

      const report = await buildDoctorReport(rootDir);

      expect(report.summary.overall).toBe("blocked");
      expect(report.findings.some((finding) => finding.code === "invalid-config")).toBe(true);
      expect(report.config.valid).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("accepts a bounded Nexus setup when the command and AGENTS contract are present", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-doctor-"));

    try {
      await initializeProject(rootDir);
      const configFile = join(rootDir, ".specpm", "config.toml");
      const configRaw = await Bun.file(configFile).text();
      await writeFile(
        configFile,
        replaceNexusSection(configRaw, {
          enabled: true,
          command: "bun",
          rootAgentsMode: "reference-only",
        }),
        "utf8",
      );
      await writeFile(join(rootDir, "AGENTS.md"), `# AGENTS\n\n${NEXUS_AGENTS_SECTION}`, "utf8");

      const report = await buildDoctorReport(rootDir);

      expect(report.findings.some((finding) => finding.code === "nexus-command-missing")).toBe(false);
      expect(report.findings.some((finding) => finding.code === "nexus-missing-root-agents-guidance")).toBe(false);
      expect(report.findings.some((finding) => finding.code === "nexus-missing-coexistence-contract")).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("accepts scoped Nexus guidance from a nested AGENTS file", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-doctor-"));

    try {
      await initializeProject(rootDir);
      const configFile = join(rootDir, ".specpm", "config.toml");
      const configRaw = await Bun.file(configFile).text();
      await writeFile(
        configFile,
        replaceNexusSection(configRaw, {
          enabled: true,
          command: "bun",
          rootAgentsMode: "scoped",
        }),
        "utf8",
      );
      await mkdir(join(rootDir, "src"), { recursive: true });
      await writeFile(join(rootDir, "src", "AGENTS.md"), `# AGENTS\n\n${NEXUS_AGENTS_SECTION}`, "utf8");

      const report = await buildDoctorReport(rootDir);

      expect(report.findings.some((finding) => finding.code === "nexus-missing-root-agents-guidance")).toBe(false);
      expect(report.findings.some((finding) => finding.code === "nexus-missing-coexistence-contract")).toBe(false);
      expect(report.findings.some((finding) => finding.code === "nexus-missing-scoped-agents-guidance")).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
