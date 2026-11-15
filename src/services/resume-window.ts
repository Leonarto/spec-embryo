import { spawnSync } from "node:child_process";
import type { ProjectContext } from "../domain.ts";

export interface ResumeWindowSummary {
  since: string;
  available: boolean;
  changedFiles: string[];
  commits: string[];
  error?: string;
}

function git(rootDir: string, args: string[]): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

export function buildResumeWindowSummary(context: ProjectContext, since: string): ResumeWindowSummary {
  if (!context.git.available) {
    return {
      since,
      available: false,
      changedFiles: [],
      commits: [],
      error: "Git is not available in this project.",
    };
  }

  const files = git(context.rootDir, ["diff", "--name-only", `${since}..HEAD`]);
  if (!files.ok) {
    return {
      since,
      available: false,
      changedFiles: [],
      commits: [],
      error: files.stderr || `Could not inspect changes since ${since}.`,
    };
  }

  const commits = git(context.rootDir, ["log", "--oneline", `${since}..HEAD`]);

  return {
    since,
    available: true,
    changedFiles: files.stdout ? files.stdout.split("\n").filter(Boolean) : [],
    commits: commits.ok && commits.stdout ? commits.stdout.split("\n").filter(Boolean) : [],
  };
}

export function renderResumeWindowSummary(summary: ResumeWindowSummary): string {
  if (!summary.available) {
    return `Interruption window since ${summary.since}: unavailable (${summary.error ?? "unknown error"})`;
  }

  return [
    `Interruption window since ${summary.since}`,
    `Commits: ${summary.commits.length}`,
    `Changed files: ${summary.changedFiles.length}`,
    ...(summary.commits.length > 0 ? ["Recent commits:", ...summary.commits.slice(0, 10).map((commit) => `- ${commit}`)] : []),
    ...(summary.changedFiles.length > 0 ? ["Changed files:", ...summary.changedFiles.slice(0, 20).map((file) => `- ${file}`)] : []),
  ].join("\n");
}
