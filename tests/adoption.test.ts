import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runInitCommand } from "../src/commands/init.ts";
import {
  buildAdoptionArtifactPaths,
  buildAdoptionGuidance,
  renderDirectAgentBrief,
  renderMigrationGuideMarkdown,
} from "../src/services/adoption.ts";
import { buildDoctorReport } from "../src/services/doctor.ts";
import type { AdoptionInspection } from "../src/services/layout.ts";
import type { DoctorFinding } from "../src/services/doctor.ts";

function createInspection(overrides: Partial<AdoptionInspection>): AdoptionInspection {
  return {
    state: "fresh",
    layoutChoice: {
      memoryDir: "docs/spm",
      source: "default",
      candidates: [],
      requiresChoice: false,
    },
    hasConfig: false,
    hasHiddenSpecpmDir: false,
    managedHomes: [],
    findings: [],
    ...overrides,
  };
}

describe("adoption guidance", () => {
  test("recommends import flow for legacy docs repos", () => {
    const guidance = buildAdoptionGuidance({
      adoption: createInspection({
        state: "legacy-docs",
        layoutChoice: {
          memoryDir: "docs/spm",
          source: "adopted",
          adoptedHome: "docs",
          candidates: [{ relativePath: "docs", reason: "docs" }],
          requiresChoice: false,
        },
        findings: ["Detected documentation/spec surfaces: `docs` (docs)."],
      }),
      memoryDir: "docs/spm",
      created: ["docs/spm/current.md"],
    });

    expect(guidance.overview).toContain("importable");
    expect(guidance.spmOrientation.whatSpmIs).toContain("local-first CLI");
    expect(guidance.spmOrientation.whenToUse.length).toBeGreaterThan(0);
    expect(guidance.memoryWorkflow.preferredWorkflows.some((item) => item.includes("spm memory note create"))).toBe(true);
    expect(guidance.capabilityRefresh.required).toBe(false);
    expect(guidance.recommendedCommands.some((item) => item.command.includes("spec import-prompt --source docs"))).toBe(true);
    expect(guidance.remainingWork.some((item) => item.includes("Legacy docs"))).toBe(true);
  });

  test("strongly orients agents away from treating scaffold as literal product work", () => {
    const guidance = buildAdoptionGuidance({
      adoption: createInspection({
        state: "adopted",
        findings: ["The managed memory home is already present."],
      }),
      memoryDir: "docs/spm",
      doctorFindings: [
        {
          severity: "warning",
          code: "seed-scaffold-present",
          message: "The repo still contains onboarding scaffold docs.",
        },
      ],
      seedScaffoldDetected: true,
      commandContext: "doctor",
    });

    expect(guidance.overview).toContain("onboarding scaffold");
    expect(guidance.spmOrientation.deterministicResponsibilities.some((item) => item.includes("doctor findings"))).toBe(true);
    expect(guidance.agentOrientation.some((item) => item.includes("It is not the adopted repo's product direction"))).toBe(true);
    expect(guidance.remainingWork[0]).toContain("temporary orientation");
    expect(guidance.recommendedCommands.some((item) => item.command.includes("spm spec import-prompt"))).toBe(true);
  });

  test("includes doctor-driven cleanup guidance for partially adopted repos", () => {
    const doctorFindings: DoctorFinding[] = [
      {
        severity: "warning",
        code: "missing-current-state",
        message: "A partially adopted repo is missing its current state file.",
      },
    ];

    const guidance = buildAdoptionGuidance({
      adoption: createInspection({
        state: "partially-adopted",
        findings: ["This repo already shows partial Spec Embryo signals."],
      }),
      memoryDir: "docs/spm",
      doctorFindings,
    });

    expect(guidance.recommendedCommands.some((item) => item.command === "spm doctor --json")).toBe(true);
    expect(guidance.remainingWork.some((item) => item.includes("still needs migration or cleanup"))).toBe(true);
    expect(guidance.remainingWork.some((item) => item.includes("Doctor reported 1 issue"))).toBe(true);
  });

  test("renders migration artifacts for the user-mediated adoption loop", () => {
    const adoption = createInspection({
      state: "partially-adopted",
      findings: ["Detected docs and partial SpM structure that still needs cleanup."],
      layoutChoice: {
        memoryDir: "specs/spm",
        source: "adopted",
        adoptedHome: "specs",
        candidates: [{ relativePath: "specs", reason: "legacy specs" }],
        requiresChoice: false,
      },
    });
    const guidance = buildAdoptionGuidance({
      adoption,
      memoryDir: "specs/spm",
      doctorFindings: [
        {
          severity: "warning",
          code: "partial-adoption",
          message: "The repo still needs migration cleanup.",
        },
      ],
      commandContext: "doctor",
    });

    const guide = renderMigrationGuideMarkdown({
      projectName: "Nina",
      memoryDir: "specs/spm",
      adoption,
      guidance,
    });
    const brief = renderDirectAgentBrief({
      projectName: "Nina",
      memoryDir: "specs/spm",
      adoption,
      guidance,
    });
    const artifactPaths = buildAdoptionArtifactPaths("specs/spm");

    expect(artifactPaths.migrationGuideFile).toBe("specs/spm/adoption/migration-guide.md");
    expect(artifactPaths.agentBriefFile).toBe("specs/spm/adoption/direct-agent-brief.md");
    expect(guide).toContain("User-Mediated Agent Handoff");
    expect(guide).toContain("Copy the direct agent brief");
    expect(guide).toContain("Partial Adoption Checks");
    expect(guide).toContain("Adopting Newer SpM Guidance");
    expect(guide).toContain("Re-run `spm init`");
    expect(guide).toContain("Reading Doctor Efficiently");
    expect(guide).toContain("Use `spm doctor` first for a cheap status");
    expect(guide).toContain("Use `spm doctor --verbose` only when");
    expect(guide).toContain("Use `spm doctor --json` when an agent needs structured findings");
    expect(guide).toContain("Default Workflow Loop");
    expect(guide).toContain("spm status");
    expect(guide).toContain("spm memory pack");
    expect(guide).toContain("Canonical Statuses");
    expect(guide).toContain("planned");
    expect(guide).toContain("completed");
    expect(guide).toContain("Tag Guidance For Retrieval");
    expect(guide).toContain("Current Memory Workflow");
    expect(guide).toContain("spm memory note create");
    expect(guide).toContain("spm memory consolidate");
      expect(guide).toContain("Treat tags as retrieval handles");
      expect(guide).toContain("short, stable tags");
      expect(guide).toContain("normalize spaces, underscores, and hyphens");
      expect(guide).toContain("Nexus Coexistence");
      expect(guide).toContain("Nexus is optional and external to Spec Embryo");
      expect(guide).toContain("Do not let Nexus replace or overwrite root `AGENTS.md`");
      expect(guide).toContain("Nexus Setup Flow");
      expect(guide).toContain("spm nexus setup --apply");
      expect(brief).toContain("You are helping adopt Spec Embryo into this repository.");
      expect(brief).toContain("Before declaring adoption complete, check:");
      expect(brief).toContain("spm ui");
    expect(brief).toContain("Use `spm doctor` first for a cheap status");
    expect(brief).toContain("Use `spm doctor --verbose` only when");
    expect(brief).toContain("Use `spm doctor --json` when an agent needs structured findings");
    expect(brief).toContain("Loop 1: Start with `spm status`");
    expect(brief).toContain("spm memory pack");
    expect(brief).toContain("spm memory note create");
    expect(brief).toContain("spm memory scopes");
    expect(brief).toContain("spm memory consolidate");
    expect(brief).toContain("If doctor reports that the running CLI is newer");
    expect(brief).toContain("Use only canonical spec statuses");
    expect(brief).toContain("Use only canonical task statuses");
      expect(brief).toContain("Treat tags as retrieval handles");
      expect(brief).toContain("Do not expect partial substring matches");
      expect(brief).toContain("Do not use tags as a replacement");
      expect(brief).toContain("Use Nexus for code impact, related-code, and blast-radius analysis only.");
      expect(brief).toContain("spm nexus setup --apply");
    });

  test("adds upgrade commands when doctor reports a newer CLI version", () => {
    const guidance = buildAdoptionGuidance({
      adoption: createInspection({
        state: "adopted",
        findings: ["The managed memory home is already present."],
      }),
      memoryDir: "docs/spm",
      doctorFindings: [
        {
          severity: "info",
          code: "tool-upgrade-available",
          message: "The running CLI is newer than the repo tool version.",
        },
      ],
      commandContext: "doctor",
    });

    expect(guidance.remainingWork.some((item) => item.includes("newer than the repo's recorded tool version"))).toBe(true);
    expect(guidance.remainingWork.some((item) => item.includes("refresh the agent's SpM usage policy"))).toBe(true);
    expect(guidance.capabilityRefresh.required).toBe(true);
    expect(guidance.capabilityRefresh.reason).toContain("repo-local usage guidance may lag");
    expect(guidance.capabilityRefresh.actions.some((item) => item.includes("Refresh your SpM usage policy"))).toBe(true);
    expect(guidance.recommendedCommands.some((item) => item.command === "spm init")).toBe(true);
    expect(guidance.recommendedCommands.some((item) => item.command === "spm doctor")).toBe(true);
    expect(guidance.recommendedCommands.some((item) => item.command === "spm memory scopes")).toBe(true);
  });
});

describe("init adoption artifacts", () => {
  test("writes a migration guide and direct agent brief during init", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-init-adoption-"));

    try {
      const output = await runInitCommand(rootDir, parseArgs(["init", "--json"]));
      const parsed = JSON.parse(output) as {
        migration_guide_file: string;
        direct_agent_brief_file: string;
        direct_agent_brief: string;
      };
      const guideFile = join(rootDir, parsed.migration_guide_file);
      const briefFile = join(rootDir, parsed.direct_agent_brief_file);
      const guide = await readFile(guideFile, "utf8");
      const brief = await readFile(briefFile, "utf8");

      expect(parsed.direct_agent_brief).toContain("You are helping adopt Spec Embryo into this repository.");
      expect(guide).toContain("# Spec Embryo Migration Guide");
      expect(guide).toContain("User-Mediated Agent Handoff");
      expect(brief).toContain("You are helping adopt Spec Embryo into this repository.");
      expect(brief).toContain("Treat any SpM seed scaffold as migration backlog");
      expect(guide).toContain("Reading Doctor Efficiently");
      expect(guide).toContain("Default Workflow Loop");
      expect(guide).toContain("Current Memory Workflow");
      expect(brief).toContain("Use `spm doctor` first for a cheap status");
      expect(brief).toContain("Loop 1: Start with `spm status`");
      expect(brief).toContain("spm memory note update`, `archive`, `restore`, and `list`");
      expect(guide).toContain("Tag Guidance For Retrieval");
      expect(brief).toContain("Treat tags as retrieval handles");
      expect(brief).toContain("Do not expect partial substring matches");
      expect(guide).toContain("Nexus Coexistence");
      expect(brief).toContain("Nexus is optional and external to Spec Embryo");

      const doctorReport = await buildDoctorReport(rootDir);
      expect(doctorReport.findings.some((finding) => finding.code === "stale-adoption-migration-guide")).toBe(false);
      expect(doctorReport.findings.some((finding) => finding.code === "stale-adoption-agent-brief")).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("refreshes config and adoption artifacts on upgraded adopted repos without force", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-init-refresh-"));

    try {
      const initialOutput = await runInitCommand(rootDir, parseArgs(["init", "--json"]));
      const initial = JSON.parse(initialOutput) as {
        migration_guide_file: string;
        direct_agent_brief_file: string;
      };

      const configFile = join(rootDir, ".specpm", "config.toml");
      const guideFile = join(rootDir, initial.migration_guide_file);
      const briefFile = join(rootDir, initial.direct_agent_brief_file);

      const configRaw = await readFile(configFile, "utf8");
      await writeFile(configFile, configRaw.replace(/tool_version = ".*"/u, 'tool_version = "0.1.0"'), "utf8");
      await writeFile(guideFile, "# stale migration guide\n", "utf8");
      await writeFile(briefFile, "# stale brief\n", "utf8");

      const output = await runInitCommand(rootDir, parseArgs(["init", "--json"]));
      const parsed = JSON.parse(output) as {
        refreshed: string[];
        skipped: string[];
      };

      const refreshed = new Set(parsed.refreshed);
      expect(refreshed.has(".specpm/config.toml")).toBe(true);
      expect(refreshed.has(initial.migration_guide_file)).toBe(true);
      expect(refreshed.has(initial.direct_agent_brief_file)).toBe(true);

      const nextConfig = await readFile(configFile, "utf8");
      const nextGuide = await readFile(guideFile, "utf8");
      const nextBrief = await readFile(briefFile, "utf8");

      expect(nextConfig).not.toContain('tool_version = "0.1.0"');
      expect(nextGuide).toContain("Current Memory Workflow");
      expect(nextBrief).toContain("Refresh your SpM usage policy");
      expect(parsed.skipped.some((path) => path.endsWith("/current.md") || path === "spm/current.md")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("still refreshes adoption artifacts when existing managed docs are malformed", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-init-broken-"));

    try {
      const initialOutput = await runInitCommand(rootDir, parseArgs(["init", "--json"]));
      const initial = JSON.parse(initialOutput) as {
        memory_dir: string;
        migration_guide_file: string;
        direct_agent_brief_file: string;
      };
      const specFile = join(rootDir, initial.memory_dir, "specs", "SPEC-001-adopt-spec-embryo-memory-for-this-repository.md");
      const specRaw = await readFile(specFile, "utf8");
      await writeFile(specFile, specRaw.replace('status = "active"', 'status = "planned"'), "utf8");

      const output = await runInitCommand(rootDir, parseArgs(["init", "--json"]));
      const parsed = JSON.parse(output) as {
        migration_guide_file: string;
        direct_agent_brief_file: string;
      };

      const guide = await readFile(join(rootDir, parsed.migration_guide_file), "utf8");
      const brief = await readFile(join(rootDir, parsed.direct_agent_brief_file), "utf8");

      expect(parsed.migration_guide_file).toBe(initial.migration_guide_file);
      expect(parsed.direct_agent_brief_file).toBe(initial.direct_agent_brief_file);
      expect(guide).toContain("Current Memory Workflow");
      expect(brief).toContain("Treat any SpM seed scaffold as migration backlog");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
