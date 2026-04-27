import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runAgentCommand } from "../src/commands/agent.ts";
import { initializeProject } from "../src/repository.ts";
import { CLI_VERSION } from "../src/services/version.ts";

describe("agent command", () => {
  test("renders a short workflow brief for the current repo", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-agent-"));

    try {
      await initializeProject(rootDir);

      const output = await runAgentCommand(rootDir, parseArgs(["agent"]));

      expect(output).toContain("Spec Embryo agent brief");
      expect(output).toContain("Start here:");
      expect(output).toContain("spm status");
      expect(output).toContain("docs/spm/current.md");
      expect(output).toContain("spm memory pack");
      expect(output).toContain("spm memory note create");
      expect(output).toContain("Optional AGENTS.md snippet:");
      expect(output).toContain("## Optional SpM workflow");
      expect(output).toContain("No version-driven capability refresh is currently required.");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("renders the bounded AGENTS snippet directly", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-agent-"));

    try {
      await initializeProject(rootDir);

      const output = await runAgentCommand(rootDir, parseArgs(["agent", "snippet"]));
      const parsed = JSON.parse(await runAgentCommand(rootDir, parseArgs(["agent", "snippet", "--json"]))) as {
        note: string;
        snippetLines: string[];
      };

      expect(output).toContain("Spec Embryo AGENTS.md snippet");
      expect(output).toContain("## Optional SpM workflow");
      expect(output).toContain("spm status");
      expect(output).toContain("spm memory pack");
      expect(parsed.note).toContain("Optional additive snippet");
      expect(parsed.snippetLines[0]).toBe("## Optional SpM workflow");
      expect(parsed.snippetLines.some((item) => item.includes("spm status"))).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("avoids pointing fresh repos at a missing current state file", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-agent-"));

    try {
      const output = await runAgentCommand(rootDir, parseArgs(["agent"]));
      const parsed = JSON.parse(await runAgentCommand(rootDir, parseArgs(["agent", "--json"]))) as {
        repo: { currentStateAvailable: boolean; currentStateFile: string; currentStateStatus: string };
        startHere: string[];
        workflowLoop: string[];
        externalAgentsSnippet: { snippetLines: string[] };
      };

      expect(output).toContain("spm init");
      expect(output).toContain("spm current set");
      expect(output).toContain("Current checkpoint: spm/current.md (not present yet)");
      expect(output).not.toContain("Read `docs/spm/current.md` before multi-step or resume-heavy work");
      expect(parsed.repo.currentStateAvailable).toBe(false);
      expect(parsed.repo.currentStateFile).toBe("spm/current.md");
      expect(parsed.repo.currentStateStatus).toBe("missing");
      expect(parsed.startHere.some((item) => item.includes("spm init"))).toBe(true);
      expect(parsed.workflowLoop.some((item) => item.includes("current.md` is still missing"))).toBe(true);
      expect(parsed.externalAgentsSnippet.snippetLines.some((item) => item.includes("`spm current set`"))).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("treats an unreadable current state file as unavailable", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-agent-"));

    try {
      await initializeProject(rootDir);
      const stateFile = join(rootDir, "docs", "spm", "current.md");
      const raw = await Bun.file(stateFile).text();
      await writeFile(stateFile, raw.replace('doc_kind = "current-state"', 'doc_kind = 7'), "utf8");

      const output = await runAgentCommand(rootDir, parseArgs(["agent"]));
      const parsed = JSON.parse(await runAgentCommand(rootDir, parseArgs(["agent", "--json"]))) as {
        repo: { currentStateAvailable: boolean; currentStateFile: string; currentStateStatus: string };
        startHere: string[];
        workflowLoop: string[];
        externalAgentsSnippet: { snippetLines: string[] };
      };

      expect(output).toContain("repair its frontmatter");
      expect(output).toContain("Current checkpoint: docs/spm/current.md (currently unreadable)");
      expect(output).not.toContain("Read `docs/spm/current.md` before multi-step or resume-heavy work");
      expect(parsed.repo.currentStateAvailable).toBe(false);
      expect(parsed.repo.currentStateFile).toBe("docs/spm/current.md");
      expect(parsed.repo.currentStateStatus).toBe("unreadable");
      expect(parsed.startHere.some((item) => item.includes("repair its frontmatter"))).toBe(true);
      expect(parsed.workflowLoop.some((item) => item.includes("repair its frontmatter"))).toBe(true);
      expect(parsed.externalAgentsSnippet.snippetLines.some((item) => item.includes("repair its frontmatter"))).toBe(true);
      expect(parsed.externalAgentsSnippet.snippetLines.some((item) => item.includes("`spm current set`"))).toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("returns structured upgrade-aware guidance as json", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-agent-"));

    try {
      await initializeProject(rootDir);
      const configFile = join(rootDir, ".specpm", "config.toml");
      const configRaw = await Bun.file(configFile).text();
      await writeFile(configFile, configRaw.replace(`tool_version = "${CLI_VERSION}"`, 'tool_version = "0.1.0"'), "utf8");

      const output = await runAgentCommand(rootDir, parseArgs(["agent", "brief", "--json"]));
      const parsed = JSON.parse(output) as {
        repo: { updateAvailable: boolean; currentStateFile: string; currentStateAvailable: boolean };
        workflowLoop: string[];
        scopedMemoryWorkflow: string[];
        externalAgentsSnippet: { note: string; snippetLines: string[] };
        capabilityRefresh: { required: boolean; actions: string[] };
      };

      expect(parsed.repo.updateAvailable).toBe(true);
      expect(parsed.repo.currentStateFile).toBe("docs/spm/current.md");
      expect(parsed.repo.currentStateAvailable).toBe(true);
      expect(parsed.workflowLoop[0]).toContain("spm status");
      expect(parsed.scopedMemoryWorkflow.some((item) => item.includes("spm memory scopes"))).toBe(true);
      expect(parsed.externalAgentsSnippet.note).toContain("Optional additive snippet");
      expect(parsed.externalAgentsSnippet.snippetLines[1]).toContain("spm status");
      expect(parsed.capabilityRefresh.required).toBe(true);
      expect(parsed.capabilityRefresh.actions.some((item) => item.includes("Refresh your SpM usage policy"))).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("rejects unsupported subcommands", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-agent-"));

    try {
      await initializeProject(rootDir);

      await expect(runAgentCommand(rootDir, parseArgs(["agent", "plan"]))).rejects.toThrow(
        "Supported agent commands are `agent`, `agent brief`, and `agent snippet`.",
      );
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("rejects unsupported subcommands before unhealthy repo state is loaded", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-agent-"));

    try {
      await initializeProject(rootDir);
      const stateFile = join(rootDir, "docs", "spm", "current.md");
      const raw = await Bun.file(stateFile).text();
      await writeFile(stateFile, raw.replace('doc_kind = "current-state"', 'doc_kind = 7'), "utf8");

      await expect(runAgentCommand(rootDir, parseArgs(["agent", "plan"]))).rejects.toThrow(
        "Supported agent commands are `agent`, `agent brief`, and `agent snippet`.",
      );
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
