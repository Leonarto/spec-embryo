import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runResumeCommand } from "../src/commands/resume.ts";
import { initializeProject } from "../src/repository.ts";

function runGit(rootDir: string, args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

describe("resume interruption window", () => {
  test("summarizes commits and changed files since a commit", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-resume-window-"));

    try {
      await initializeProject(rootDir);
      runGit(rootDir, ["init"]);
      runGit(rootDir, ["config", "user.name", "Spec Embryo Test"]);
      runGit(rootDir, ["config", "user.email", "spm@example.test"]);
      runGit(rootDir, ["add", "."]);
      runGit(rootDir, ["commit", "-m", "initial"]);
      const base = runGit(rootDir, ["rev-parse", "HEAD"]);

      const currentFile = join(rootDir, "docs/spm/current.md");
      await writeFile(currentFile, `${await readFile(currentFile, "utf8")}\nchanged after interruption\n`, "utf8");
      runGit(rootDir, ["add", "."]);
      runGit(rootDir, ["commit", "-m", "update current"]);

      const human = await runResumeCommand(rootDir, parseArgs(["resume", "--since", base]));
      expect(human).toContain(`Interruption window since ${base}`);
      expect(human).toContain("Changed files: 1");
      expect(human).toContain("docs/spm/current.md");

      const json = await runResumeCommand(rootDir, parseArgs(["resume", "--since", base, "--json"]));
      const payload = JSON.parse(json) as { interruption_window: { changedFiles: string[]; commits: string[] } };
      expect(payload.interruption_window.changedFiles).toContain("docs/spm/current.md");
      expect(payload.interruption_window.commits[0]).toContain("update current");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
