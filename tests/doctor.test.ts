import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildDoctorReport } from "../src/services/doctor.ts";
import { initializeProject } from "../src/repository.ts";

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
});
