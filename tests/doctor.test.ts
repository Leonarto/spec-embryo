import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildDoctorReport } from "../src/services/doctor.ts";
import { initializeProject } from "../src/repository.ts";
import { CLI_VERSION } from "../src/services/version.ts";
import { loadProjectContext } from "../src/repository.ts";

describe("doctor service", () => {
  test("reports a healthy adopted repo", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-doctor-"));

    try {
      await initializeProject(rootDir);
      const report = await buildDoctorReport(rootDir);

      expect(report.summary.overall).toBe("needs-attention");
      expect(report.adoption.state).toBe("adopted");
      expect(report.config.valid).toBe(true);
      expect(report.summary.blockingCount).toBe(0);
      expect(report.summary.warningCount).toBe(1);
      expect(report.findings.some((finding) => finding.code === "seed-scaffold-present")).toBe(true);
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
});
