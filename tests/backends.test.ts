import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ExecutionBackendConfig } from "../src/domain.ts";
import { buildResumeContext } from "../src/engine.ts";
import { resolveResumeBackend } from "../src/backends/index.ts";
import { buildPromptBundle, renderPromptBundleText } from "../src/backends/prompt.ts";
import { buildSubprocessLaunchPlan } from "../src/backends/subprocess.ts";
import { initializeProject, loadProjectContext } from "../src/repository.ts";

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
      expect(text).toContain("You are resuming work on this repository.");
      expect(text).toContain("Structured context:");
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
        artifact_paths: { promptTextFile: string; promptBundleFile: string };
        prompt_text: string;
      };

      expect(payload.mode).toBe("preview");
      expect(payload.artifact_paths.promptTextFile.endsWith("codex-resume-prompt.txt")).toBe(true);
      expect(payload.prompt_text).toContain("You are resuming work on this repository.");
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
      const promptBundle = JSON.parse(await readFile(payload.artifact_paths.promptBundleFile, "utf8")) as {
        context: { project_name: string };
      };

      expect(payload.mode).toBe("spawned");
      expect(capture).toContain("codex");
      expect(capture).toContain(payload.artifact_paths.promptTextFile);
      expect(capture).toContain(payload.artifact_paths.promptBundleFile);
      expect(promptText).toContain("Expected output format:");
      expect(promptBundle.context.project_name).toMatch(/^spec-embryo-backends-/);
    } finally {
      await rm(fixture.rootDir, { recursive: true, force: true });
    }
  });
});
