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
  test("shows managed changed item identity together with the concrete path", async () => {
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
      await writeFile(join(rootDir, "README.md"), "# scratch\n", "utf8");

      const output = await runStatusCommand(rootDir, parseArgs(["status"]));

      expect(output).toContain("[current-state] CURRENT: Current Project State (docs/spm/current.md)");
      expect(output).toContain("[other] README.md");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
