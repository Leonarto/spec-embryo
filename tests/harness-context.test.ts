import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "../src/cli.ts";
import { runResumeCommand, ResumeCommandError } from "../src/commands/resume.ts";
import { buildResumeContext } from "../src/engine.ts";
import { initializeProject, loadProjectContext } from "../src/repository.ts";
import { buildPromptBundle, renderPromptBundleText } from "../src/backends/prompt.ts";
import { buildSubprocessLaunchPlan } from "../src/backends/subprocess.ts";
import { documentSourceHash } from "../src/services/document-provenance.ts";
import { buildResumeSnapshot, canonicalJson } from "../src/services/resume-snapshot.ts";
import { buildResumeWindowSummary } from "../src/services/resume-window.ts";
import { utf8Prefix } from "../src/services/resume-render.ts";

function git(rootDir: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

async function fixture(committed = false) {
  const rootDir = await mkdtemp(join(tmpdir(), "spm-harness-context-"));
  await initializeProject(rootDir);
  if (committed) {
    git(rootDir, "init");
    git(rootDir, "config", "user.name", "SpM fixture");
    git(rootDir, "config", "user.email", "spm@example.test");
    git(rootDir, "add", ".");
    git(rootDir, "commit", "-m", "initial");
  }
  return rootDir;
}

describe("portable harness context", () => {
  test("uses the committed window in every backend, separate from local changes", async () => {
    const rootDir = await fixture(true);
    try {
      const base = git(rootDir, "rev-parse", "HEAD");
      await writeFile(join(rootDir, "committed.txt"), "committed\n");
      git(rootDir, "add", ".");
      git(rootDir, "commit", "-m", "second");
      await writeFile(join(rootDir, "local.txt"), "untracked\n");
      const project = await loadProjectContext(rootDir);
      const window = buildResumeWindowSummary(project, base);
      const context = { ...buildResumeContext(project), interruption_window: window };
      expect(window.resolvedSince).toBe(base);
      expect(window.changedFiles).toEqual(["committed.txt"]);
      expect(context.changedItems.some((item) => item.path === "local.txt")).toBe(true);
      for (const backend of ["codex", "claude"] as const) {
        const plan = buildSubprocessLaunchPlan(backend, { enabled: true, command: backend }, context,
          { rootDir, config: project.config });
        expect(plan.promptBundle.interruption_window).toBe(window);
        expect(JSON.parse(plan.promptBundleText).interruption_window).toEqual(window);
        expect(plan.promptText).toContain(base);
        expect(plan.promptVariableTailText).toContain(base);
        expect(plan.promptStablePrefixText).not.toContain(base);
      }
      for (const backend of ["deterministic", "prompt", "codex", "claude"]) {
        const payload = JSON.parse(await runResumeCommand(rootDir, parseArgs([
          "resume", "--since", base, "--backend", backend, "--json",
        ])));
        expect(payload.schema_version).toBe("1.0");
        expect(payload.interruption_window).toEqual(window);
        if (backend === "deterministic") expect(payload.resume.interruption_window).toEqual(window);
        else expect((payload.resume.prompt_bundle ?? payload.resume).interruption_window).toEqual(window);
      }
      const empty = buildResumeWindowSummary(project, "HEAD");
      expect(empty.available).toBe(true);
      expect(empty.changedFiles).toEqual([]);
      expect(empty.commits).toEqual([]);
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("rejects option/range/invalid revisions and never writes spawn artifacts", async () => {
    const rootDir = await fixture(true);
    try {
      for (const since of ["--help", "HEAD..HEAD", "HEAD...HEAD", "missing", "HEAD^@", "2026-11-15", "HANDOFF-001"]) {
        const payload = JSON.parse(await runResumeCommand(rootDir, parseArgs([
          "resume", "--backend", "prompt", `--since=${since}`, "--json",
        ])));
        expect(payload.interruption_window.available).toBe(false);
        expect(payload.interruption_window.resolvedSince).toBeNull();
        expect(payload.warnings.length).toBeGreaterThan(0);
        await expect(runResumeCommand(rootDir, parseArgs([
          "resume", "--backend", "codex", `--since=${since}`, "--spawn",
        ]))).rejects.toBeInstanceOf(ResumeCommandError);
      }
      await expect(access(join(rootDir, ".specpm/tmp"))).rejects.toThrow();
      const payload = JSON.parse(await runResumeCommand(rootDir, parseArgs(["resume", "--backend", "prompt", "--json"])));
      expect("interruption_window" in payload).toBe(false);
      expect("interruption_window" in payload.resume).toBe(false);
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("returns useful context outside Git and distinguishes an unborn HEAD", async () => {
    const rootDir = await fixture();
    try {
      for (const initGit of [false, true]) {
        if (initGit) git(rootDir, "init");
        const payload = JSON.parse(await runResumeCommand(rootDir,
          parseArgs(["resume", "--backend", "prompt", "--since", "HEAD", "--json"])));
        expect(payload.context_snapshot.head).toBeNull();
        expect(payload.interruption_window.available).toBe(false);
        expect(payload.resume.cache_assembly.variable_tail_text).toContain("Interruption window");
        expect(payload.warnings.join(" ")).toContain(initGit ? "HEAD" : "Git is unavailable");
      }
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("hashes the loaded bytes once, retaining provenance by object identity", async () => {
    const rootDir = await fixture(true);
    try {
      const file = join(rootDir, "docs/spm/current.md");
      const initial = await readFile(file);
      const bytes = Buffer.concat([initial, Buffer.from([10, 0xff, 10])]);
      await writeFile(file, bytes);
      const first = await loadProjectContext(rootDir);
      const firstResume = buildResumeContext(first);
      const hash = createHash("sha256").update(bytes).digest("hex");
      expect(documentSourceHash(first.currentState)).toBe(hash);
      expect(documentSourceHash({ ...first.currentState })).toBeNull();
      expect(JSON.stringify(first.currentState)).not.toContain("sourceHash");
      const firstSnapshot = buildResumeSnapshot(first, firstResume).snapshot;
      await writeFile(file, Buffer.concat([bytes, Buffer.from("later bytes\n")]));
      expect(buildResumeSnapshot(first, firstResume).snapshot).toEqual(firstSnapshot);
      const second = await loadProjectContext(rootDir);
      const secondSnapshot = buildResumeSnapshot(second, buildResumeContext(second)).snapshot;
      expect(secondSnapshot.head).toBe(firstSnapshot.head);
      expect(secondSnapshot.fingerprint).not.toBe(firstSnapshot.fingerprint);
      expect(documentSourceHash(second.currentState)).not.toBe(hash);
      const clonedProject = { ...first, currentState: { ...first.currentState } };
      const missing = buildResumeSnapshot(clonedProject, firstResume);
      expect(missing.snapshot.sources.find((source) => source.id === "CURRENT")?.content_hash).toBeNull();
      expect(missing.warnings.join(" ")).toContain("Source bytes unavailable");
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("fingerprints are canonical, independent of rendering metadata, and include dirty state", async () => {
    expect(canonicalJson({ b: { d: 2, c: 1 }, a: [2, 1] })).toBe('{"a":[2,1],"b":{"c":1,"d":2}}');
    const rootDir = await fixture(true);
    try {
      const project = await loadProjectContext(rootDir);
      const context = buildResumeContext(project);
      const initial = buildResumeSnapshot(project, context).snapshot;
      const later = { ...context, generatedAt: "2099-01-01", runId: "other", temporaryPath: "/tmp/other" };
      expect(buildResumeSnapshot(project, later).snapshot.fingerprint).toBe(initial.fingerprint);
      const reloaded = await loadProjectContext(rootDir);
      expect(buildResumeSnapshot(reloaded, buildResumeContext(reloaded)).snapshot.fingerprint).toBe(initial.fingerprint);
      expect(buildResumeSnapshot({ ...project, git: { ...project.git, dirty: true } }, context).snapshot.fingerprint)
        .not.toBe(initial.fingerprint);
      expect(initial.head).toBe(git(rootDir, "rev-parse", "HEAD"));
      expect(initial.sources.every((source) => source.content_hash?.length === 64)).toBe(true);
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("keeps all dynamic data out of the stable prefix and serializes each block once", async () => {
    const rootDir = await fixture();
    try {
      const context = buildResumeContext(await loadProjectContext(rootDir));
      const first = buildPromptBundle(context);
      const second = buildPromptBundle({ ...context, projectName: "different", focus: "new focus", summary: "new summary",
        activeSpecs: [], activeTasks: [], nextActions: ["new next action"],
        git: { available: true, dirty: true, head: "a".repeat(40), shortStatus: ["M changed"] },
        interruption_window: { since: "some-revision", resolvedSince: "a".repeat(40), available: true, changedFiles: [], commits: [] },
      });
      expect(first.cache_assembly.stable_prefix_text).toBe(second.cache_assembly.stable_prefix_text);
      expect(first.cache_assembly.variable_tail_text).not.toBe(second.cache_assembly.variable_tail_text);
      const text = renderPromptBundleText(second);
      expect(text.split("Structured context:")).toHaveLength(2);
      expect(text.split("Context pack:")).toHaveLength(2);
      expect(text.split("Expected output format:")).toHaveLength(2);
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("bounds UTF-8 prompt bytes while retaining complete JSON data and expansion paths", async () => {
    const rootDir = await fixture();
    try {
      const context = buildResumeContext(await loadProjectContext(rootDir));
      const oversized = { ...context, focus: "focus 🐣".repeat(10000), summary: "summary 🌍".repeat(10000),
        changedItems: Array.from({ length: 500 }, (_, i) => ({ kind: "other" as const, path: `path-${i}-🌍.txt`, changeHint: "M", statusCode: " M" })) };
      for (const max of [4096, 32768, 1048576]) {
        const bundle = buildPromptBundle(oversized, max);
        const text = renderPromptBundleText(bundle);
        expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(max);
        expect(text).not.toContain("\uFFFD");
        expect(bundle.context.focus).toBe(oversized.focus);
        expect(bundle.context.changed_items).toHaveLength(500);
        if (max < 1048576) {
          expect(bundle.warnings.join(" ")).toContain("truncated/offloaded");
          expect(text).toContain("spm resume --backend prompt --json");
          const compact = JSON.parse(text.split("Compact structured context:\n")[1]!);
          expect(compact.references_omitted).toBeGreaterThan(0);
          expect(compact.references.length).toBeGreaterThan(0);
          expect(compact.references[0].ref).toBeDefined();
        }
      }
      expect(utf8Prefix("a🌍b", 4)).toBe("a");
      expect(utf8Prefix("a🌍b", 5)).toBe("a🌍");
      const controls = buildPromptBundle({ ...oversized, focus: "\u0000".repeat(10000), projectName: "\u0000".repeat(10000) }, 4096);
      expect(Buffer.byteLength(renderPromptBundleText(controls))).toBeLessThanOrEqual(4096);
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("rejects invalid byte budgets with usage exit code 2", async () => {
    const rootDir = await fixture();
    try {
      for (const value of ["", "4095", "1048577", "-1", "4.5", "NaN", "Infinity", "999999999999999999999"]) {
        await expect(runResumeCommand(rootDir, parseArgs(["resume", `--max-context-bytes=${value}`])))
          .rejects.toBeInstanceOf(ResumeCommandError);
      }
      const result = spawnSync(process.execPath, [resolve("src/index.ts"), "resume", "--max-context-bytes", "20"],
        { cwd: rootDir, encoding: "utf8" });
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("--max-context-bytes");
      const payload = JSON.parse(await runResumeCommand(rootDir,
        parseArgs(["resume", "--backend", "prompt", "--max-context-bytes", "4096", "--json"])));
      expect(payload.resume.schema_version).toBe("1.0");
      expect(payload.context_pack.profile).toBe("resume");
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });
});
