import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runStatusCommand } from "../src/commands/status.ts";
import { initializeProject } from "../src/repository.ts";

function runGit(rootDir: string, args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  }

  return result.stdout;
}

describe("status command", () => {
  test("shows managed changed item identity together with the change hint and concrete path", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-status-"));

    try {
      await initializeProject(rootDir);
      runGit(rootDir, ["init"]);
      runGit(rootDir, ["config", "user.name", "Spec Embryo Test"]);
      runGit(rootDir, ["config", "user.email", "spm@example.test"]);
      runGit(rootDir, ["add", "."]);
      runGit(rootDir, ["commit", "-m", "initial"]);

      const currentFile = join(rootDir, "docs/spm/current.md");
      const currentRaw = await readFile(currentFile, "utf8");
      await writeFile(currentFile, `${currentRaw}\ntracked change\n`, "utf8");
      const configFile = join(rootDir, ".specpm/config.toml");
      const configRaw = await readFile(configFile, "utf8");
      await writeFile(configFile, `${configRaw}\n`, "utf8");

      const output = await runStatusCommand(rootDir, parseArgs(["status"]));

      expect(output).toContain("[current-state] M CURRENT: Current Project State (docs/spm/current.md)");
      expect(output).toContain("[other] M .specpm/config.toml");
      expect(output.indexOf("[current-state] M CURRENT: Current Project State (docs/spm/current.md)")).toBeLessThan(
        output.indexOf("[other] M .specpm/config.toml"),
      );
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("includes compact raw git status codes in structured changed-item output", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-status-"));

    try {
      await initializeProject(rootDir);
      runGit(rootDir, ["init"]);
      runGit(rootDir, ["config", "user.name", "Spec Embryo Test"]);
      runGit(rootDir, ["config", "user.email", "spm@example.test"]);
      runGit(rootDir, ["add", "."]);
      runGit(rootDir, ["commit", "-m", "initial"]);

      const currentFile = join(rootDir, "docs/spm/current.md");
      const currentRaw = await readFile(currentFile, "utf8");
      await writeFile(currentFile, `${currentRaw}\ntracked change\n`, "utf8");
      const configFile = join(rootDir, ".specpm/config.toml");
      const configRaw = await readFile(configFile, "utf8");
      await writeFile(configFile, `${configRaw}\n`, "utf8");

      const output = await runStatusCommand(rootDir, parseArgs(["status", "--json"]));
      const payload = JSON.parse(output) as {
        changed_items: Array<{ kind: string; path: string; changeHint: string; statusCode: string }>;
      };

      expect(payload.changed_items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "current-state",
            path: "docs/spm/current.md",
            changeHint: "M",
            statusCode: "M",
          }),
        ]),
      );
      expect(payload.changed_items[0]?.kind).toBe("other");
      expect(payload.changed_items[0]?.path).toBe(".specpm/config.toml");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("notes when additional changed files were omitted from human output", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-status-"));

    try {
      await initializeProject(rootDir);
      runGit(rootDir, ["init"]);
      runGit(rootDir, ["config", "user.name", "Spec Embryo Test"]);
      runGit(rootDir, ["config", "user.email", "spm@example.test"]);
      runGit(rootDir, ["add", "."]);
      runGit(rootDir, ["commit", "-m", "initial"]);

      const currentFile = join(rootDir, "docs/spm/current.md");
      const currentRaw = await readFile(currentFile, "utf8");
      await writeFile(currentFile, `${currentRaw}\ntracked change\n`, "utf8");

      for (let index = 1; index <= 11; index += 1) {
        await writeFile(join(rootDir, `scratch-${index}.md`), `# scratch ${index}\n`, "utf8");
      }

      const output = await runStatusCommand(rootDir, parseArgs(["status"]));
      expect(output).toContain("... and 2 more changed files.");

      const json = await runStatusCommand(rootDir, parseArgs(["status", "--json"]));
      const payload = JSON.parse(json) as {
        changed_items: Array<{ path: string }>;
      };
      expect(payload.changed_items).toHaveLength(12);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
