import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ExecutionBackendConfig } from "../src/domain.ts";
import { buildResumeContext } from "../src/engine.ts";
import { resolveResumeBackend } from "../src/backends/index.ts";
import { buildPromptBundle, renderPromptBundleText } from "../src/backends/prompt.ts";
import { buildSubprocessLaunchPlan } from "../src/backends/subprocess.ts";
import { initializeProject, loadProjectContext } from "../src/repository.ts";

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

async function createResumeFixture() {
  const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-backends-"));
  await initializeProject(rootDir);
  const projectContext = await loadProjectContext(rootDir);

  return {
    rootDir,
    config: projectContext.config,
    resumeContext: buildResumeContext(projectContext),
  };
}

describe("prompt backend helpers", () => {
  test("builds a prompt bundle and renderable text from resume context", async () => {
    const fixture = await createResumeFixture();

    try {
      const bundle = buildPromptBundle(fixture.resumeContext);
      const text = renderPromptBundleText(bundle);

      expect(bundle.context.project_name).toMatch(/^spec-embryo-backends-/);
      expect(bundle.expected_output_format.summary_sections).toContain("where-we-are");
      expect(bundle.cache_assembly.strategy).toBe("stable-prefix-and-tail");
      expect(bundle.cache_assembly.stable_prefix_sections).toContain("context_pack");
      expect(bundle.cache_assembly.variable_tail_sections).toContain("volatile_execution_context");
      expect(bundle.cache_assembly.stable_prefix_text).toContain("Stable repo context:");
      expect(bundle.cache_assembly.variable_tail_text).toContain("Volatile execution context:");
      expect(text).toContain("You are resuming work on this repository.");
      expect(text).toContain("Stable repo context:");
      expect(text).toContain("Volatile execution context:");
      expect(text).toContain("Structured context:");
    } finally {
      await rm(fixture.rootDir, { recursive: true, force: true });
    }
  });
});

describe("deterministic backend", () => {
  test("renders changed managed items with a compact hint, identity, and path", async () => {
    const fixture = await createResumeFixture();

    try {
      runGit(fixture.rootDir, ["init"]);
      runGit(fixture.rootDir, ["config", "user.name", "Spec Embryo Test"]);
      runGit(fixture.rootDir, ["config", "user.email", "spm@example.test"]);
      runGit(fixture.rootDir, ["add", "."]);
      runGit(fixture.rootDir, ["commit", "-m", "initial"]);
      const currentFile = join(fixture.rootDir, "docs/spm/current.md");
      const raw = await readFile(currentFile, "utf8");
      await Bun.write(currentFile, `${raw}\ntracked change\n`);

      const projectContext = await loadProjectContext(fixture.rootDir);
      const backend = resolveResumeBackend("deterministic", projectContext.config);
      const result = await backend.run(buildResumeContext(projectContext), {
        rootDir: fixture.rootDir,
        config: projectContext.config,
      });

      expect(result.text).toContain("[current-state] M CURRENT: Current Project State (docs/spm/current.md)");
    } finally {
      await rm(fixture.rootDir, { recursive: true, force: true });
    }
  });
});

describe("subprocess backends", () => {
  test("builds a preview launch plan with stable tokens and env vars", async () => {
    const fixture = await createResumeFixture();

    try {
      const backendConfig: ExecutionBackendConfig = {
        enabled: true,
        command: "codex",
        args: ["exec", "{prompt_text_file}", "--bundle", "{prompt_bundle_file}", "--inline", "{prompt}"],
      };

      const plan = buildSubprocessLaunchPlan("codex", backendConfig, fixture.resumeContext, {
        rootDir: fixture.rootDir,
        config: fixture.config,
      });

      expect(plan.mode).toBe("preview");
      expect(plan.command).toBe("codex");
      expect(plan.args[1]).toBe(plan.artifactPaths.promptTextFile);
      expect(plan.args[3]).toBe(plan.artifactPaths.promptBundleFile);
      expect(plan.args[5]).toContain("You are resuming work on this repository.");
      expect(plan.env.SPM_PROMPT_FILE).toBe(plan.artifactPaths.promptTextFile);
      expect(plan.env.SPM_PROMPT_BUNDLE_FILE).toBe(plan.artifactPaths.promptBundleFile);
      expect(plan.env.SPM_PROMPT_STABLE_PREFIX_FILE).toBe(plan.artifactPaths.promptStablePrefixFile);
      expect(plan.env.SPM_PROMPT_VARIABLE_TAIL_FILE).toBe(plan.artifactPaths.promptVariableTailFile);
      expect(plan.promptStablePrefixText).toContain("Stable repo context:");
      expect(plan.promptVariableTailText).toContain("Volatile execution context:");
    } finally {
      await rm(fixture.rootDir, { recursive: true, force: true });
    }
  });

  test("returns a structured preview when a subprocess backend is configured but not spawned", async () => {
    const fixture = await createResumeFixture();

    try {
      fixture.config.backends.codex.enabled = true;
      fixture.config.backends.codex.command = "codex";
      fixture.config.backends.codex.args = ["exec", "{prompt_text_file}"];

      const backend = resolveResumeBackend("codex", fixture.config);
      const result = await backend.run(fixture.resumeContext, {
        rootDir: fixture.rootDir,
        config: fixture.config,
        json: true,
      });

      const payload = JSON.parse(result.text) as {
        mode: string;
        artifact_paths: {
          promptTextFile: string;
          promptBundleFile: string;
          promptStablePrefixFile: string;
          promptVariableTailFile: string;
        };
        prompt_text: string;
        prompt_stable_prefix: string;
        prompt_variable_tail: string;
      };

      expect(payload.mode).toBe("preview");
      expect(payload.artifact_paths.promptTextFile.endsWith("codex-resume-prompt.txt")).toBe(true);
      expect(payload.artifact_paths.promptStablePrefixFile.endsWith("codex-resume-prompt-prefix.txt")).toBe(true);
      expect(payload.artifact_paths.promptVariableTailFile.endsWith("codex-resume-prompt-tail.txt")).toBe(true);
      expect(payload.prompt_text).toContain("You are resuming work on this repository.");
      expect(payload.prompt_stable_prefix).toContain("Stable repo context:");
      expect(payload.prompt_variable_tail).toContain("Volatile execution context:");
    } finally {
      await rm(fixture.rootDir, { recursive: true, force: true });
    }
  });

  test("writes prompt artifacts and spawns the configured subprocess", async () => {
    const fixture = await createResumeFixture();

    try {
      fixture.config.backends.codex.enabled = true;
      fixture.config.backends.codex.command = "/bin/sh";
      fixture.config.backends.codex.args = [
        "-c",
        "printf '%s\\n%s\\n%s\\n' \"$SPM_BACKEND_NAME\" \"$SPM_PROMPT_FILE\" \"$SPM_PROMPT_BUNDLE_FILE\" > subprocess-capture.txt",
      ];

      const backend = resolveResumeBackend("codex", fixture.config);
      const result = await backend.run(fixture.resumeContext, {
        rootDir: fixture.rootDir,
        config: fixture.config,
        json: true,
        spawn: true,
      });

      const payload = JSON.parse(result.text) as {
        mode: string;
        artifact_paths: { prompt_text_file?: string; prompt_bundle_file?: string; promptTextFile: string; promptBundleFile: string };
      };
      const capture = await readFile(join(fixture.rootDir, "subprocess-capture.txt"), "utf8");
      const promptText = await readFile(payload.artifact_paths.promptTextFile, "utf8");
      const promptStablePrefix = await readFile(payload.artifact_paths.promptStablePrefixFile, "utf8");
      const promptVariableTail = await readFile(payload.artifact_paths.promptVariableTailFile, "utf8");
      const promptBundle = JSON.parse(await readFile(payload.artifact_paths.promptBundleFile, "utf8")) as {
        context: { project_name: string };
        cache_assembly: { strategy: string };
      };

      expect(payload.mode).toBe("spawned");
      expect(capture).toContain("codex");
      expect(capture).toContain(payload.artifact_paths.promptTextFile);
      expect(capture).toContain(payload.artifact_paths.promptBundleFile);
      expect(promptText).toContain("Expected output format:");
      expect(promptStablePrefix).toContain("Stable repo context:");
      expect(promptVariableTail).toContain("Volatile execution context:");
      expect(promptBundle.context.project_name).toMatch(/^spec-embryo-backends-/);
      expect(promptBundle.cache_assembly.strategy).toBe("stable-prefix-and-tail");
    } finally {
      await rm(fixture.rootDir, { recursive: true, force: true });
    }
  });
});
