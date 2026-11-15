import { spawnSync } from "node:child_process";
import type { ProjectContext, ResumeWindowSummary } from "../domain.ts";
export type { ResumeWindowSummary } from "../domain.ts";

function git(rootDir: string, args: string[]): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    stdout: args.includes("-z") ? result.stdout ?? "" : result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() || result.error?.message || "",
  };
}

export function buildResumeWindowSummary(context: ProjectContext, since: string): ResumeWindowSummary {
  const unavailable = (error: string, resolvedSince: string | null = null): ResumeWindowSummary => ({
    since, resolvedSince, available: false, changedFiles: [], commits: [], error,
  });
  if (!context.git.available) {
    return unavailable("Git is not available in this project.");
  }
  if (!since.trim() || since.startsWith("-") || since.includes("..") || /[\r\n\0]/.test(since)) {
    return unavailable("Expected a single Git commit revision, not an option or revision range.");
  }
  const resolved = git(context.rootDir, ["rev-parse", "--verify", "--end-of-options", `${since}^{commit}`]);
  if (!resolved.ok || !/^[a-f0-9]{40,64}$/.test(resolved.stdout)) {
    return unavailable(resolved.stderr || `Could not resolve a single commit: ${since}.`);
  }
  const resolvedSince = resolved.stdout;
  const head = git(context.rootDir, ["rev-parse", "--verify", "HEAD^{commit}"]);
  if (!head.ok) return unavailable("Git HEAD has no available commit.", resolvedSince);
  const files = git(context.rootDir, ["diff", "--name-only", "-z", resolvedSince, head.stdout, "--"]);
  if (!files.ok) {
    return unavailable(files.stderr || `Could not inspect changes since ${since}.`, resolvedSince);
  }
  const commits = git(context.rootDir, ["log", "--oneline", `${resolvedSince}..${head.stdout}`, "--"]);
  if (!commits.ok) return unavailable(commits.stderr || "Could not inspect committed history.", resolvedSince);

  return {
    since,
    resolvedSince,
    available: true,
    changedFiles: files.stdout ? files.stdout.split("\0").filter(Boolean) : [],
    commits: commits.ok && commits.stdout ? commits.stdout.split("\n").filter(Boolean) : [],
  };
}

export function renderResumeWindowSummary(summary: ResumeWindowSummary): string {
  if (!summary.available) {
    return `Interruption window since ${summary.since}: unavailable (${summary.error ?? "unknown error"})`;
  }

  return [
    `Interruption window since ${summary.since}`,
    "Scope: committed changes only; local working-tree changes are listed separately.",
    `Commits: ${summary.commits.length}`,
    `Changed files: ${summary.changedFiles.length}`,
    ...(summary.commits.length > 0 ? ["Recent commits:", ...summary.commits.slice(0, 10).map((commit) => `- ${commit}`)] : []),
    ...(summary.changedFiles.length > 0 ? ["Changed files:", ...summary.changedFiles.slice(0, 20).map((file) => `- ${file}`)] : []),
  ].join("\n");
}
