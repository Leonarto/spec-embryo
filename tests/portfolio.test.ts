import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runPortfolioCommand } from "../src/commands/portfolio.ts";
import { initializeProject } from "../src/repository.ts";

describe("portfolio command", () => {
  test("registers projects and renders cross-project status", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-portfolio-"));
    const projectDir = join(rootDir, "project-a");
    const registryFile = join(rootDir, "portfolio.json");

    try {
      await initializeProject(projectDir);

      const registerOutput = await runPortfolioCommand(
        rootDir,
        parseArgs(["portfolio", "register", projectDir, "--id", "project-a", "--name", "Project A", "--tags", "library,core", "--registry", registryFile]),
      );
      expect(registerOutput).toContain("Registered project-a");

      const jsonOutput = await runPortfolioCommand(rootDir, parseArgs(["portfolio", "status", "--registry", registryFile, "--json"]));
      const payload = JSON.parse(jsonOutput) as {
        projects: Array<{ id: string; name: string; health: string; focus: string; tags: string[] }>;
      };

      expect(payload.projects).toEqual([
        expect.objectContaining({
          id: "project-a",
          name: "Project A",
          health: "ok",
          tags: ["core", "library"],
        }),
      ]);
      expect(payload.projects[0]?.focus).toContain("managed memory");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("reports unavailable projects without failing the whole portfolio", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-portfolio-"));
    const registryFile = join(rootDir, "portfolio.json");

    try {
      const projectDir = join(rootDir, "missing");
      await initializeProject(projectDir);
      await runPortfolioCommand(rootDir, parseArgs(["portfolio", "register", projectDir, "--id", "missing", "--registry", registryFile]));
      await rm(projectDir, { recursive: true, force: true });

      const output = await runPortfolioCommand(rootDir, parseArgs(["portfolio", "list", "--registry", registryFile]));
      expect(output).toContain("missing [unavailable: Project path does not exist.]");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("searches portfolio summaries and renders explicit relationship issues", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-portfolio-"));
    const projectDir = join(rootDir, "project-a");
    const registryFile = join(rootDir, "portfolio.json");

    try {
      await initializeProject(projectDir);
      await runPortfolioCommand(rootDir, parseArgs(["portfolio", "register", projectDir, "--id", "project-a", "--name", "Project A", "--registry", registryFile]));
      const projectBDir = join(rootDir, "project-b");
      await initializeProject(projectBDir);
      await runPortfolioCommand(rootDir, parseArgs(["portfolio", "register", projectBDir, "--id", "project-b", "--name", "Project B", "--registry", registryFile]));
      await runPortfolioCommand(
        rootDir,
        parseArgs(["portfolio", "link", "project-a", "--depends-on", "missing-project,project-b", "--milestones", "fleet-rollout", "--registry", registryFile]),
      );
      await runPortfolioCommand(rootDir, parseArgs(["portfolio", "link", "project-b", "--depends-on", "project-a", "--registry", registryFile]));

      const searchJson = await runPortfolioCommand(rootDir, parseArgs(["portfolio", "search", "fleet", "--registry", registryFile, "--json"]));
      const searchPayload = JSON.parse(searchJson) as {
        results: Array<{ id: string; reasons: string[]; milestones: string[] }>;
      };
      expect(searchPayload.results).toEqual([
        expect.objectContaining({
          id: "project-a",
          reasons: ["milestones"],
          milestones: ["fleet-rollout"],
        }),
      ]);

      const status = await runPortfolioCommand(rootDir, parseArgs(["portfolio", "status", "--registry", registryFile]));
      expect(status).toContain("project-a depends on unknown project missing-project");
      expect(status).toContain("Dependency cycle detected: project-a -> project-b -> project-a");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
