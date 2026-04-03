import { spawn } from "node:child_process";
import { join } from "node:path";
import { writeUtf8 } from "../storage.ts";
import type { BackendName, ExecutionBackendConfig, ResumeContext } from "../domain.ts";
import type { BackendRunOptions, BackendRunResult, ResumeBackend } from "./base.ts";
import { buildPromptBundle, renderPromptBundleText } from "./prompt.ts";

function replaceToken(token: string, replacements: Record<string, string>): string {
  let output = token;
  for (const [key, value] of Object.entries(replacements)) {
    output = output.replaceAll(`{${key}}`, value);
  }
  return output;
}

export interface SubprocessLaunchPlan {
  backend: BackendName;
  mode: "disabled" | "preview" | "spawned";
  command: string | null;
  args: string[];
  promptBundle: ReturnType<typeof buildPromptBundle>;
  promptText: string;
  promptBundleText: string;
  artifactPaths: {
    promptTextFile: string;
    promptBundleFile: string;
  };
  env: Record<string, string>;
}

function buildArtifactPaths(rootDir: string, backend: BackendName): SubprocessLaunchPlan["artifactPaths"] {
  return {
    promptTextFile: join(rootDir, ".specpm", "tmp", `${backend}-resume-prompt.txt`),
    promptBundleFile: join(rootDir, ".specpm", "tmp", `${backend}-resume-prompt.json`),
  };
}

export function buildSubprocessLaunchPlan(
  backend: BackendName,
  backendConfig: ExecutionBackendConfig,
  context: ResumeContext,
  options: BackendRunOptions,
): SubprocessLaunchPlan {
  const promptBundle = buildPromptBundle(context);
  const promptBundleText = JSON.stringify(promptBundle, null, 2);
  const promptText = renderPromptBundleText(promptBundle);
  const artifactPaths = buildArtifactPaths(options.rootDir, backend);

  const replacements = {
    prompt: promptText,
    prompt_text: promptText,
    prompt_bundle: promptBundleText,
    prompt_file: artifactPaths.promptTextFile,
    prompt_text_file: artifactPaths.promptTextFile,
    prompt_bundle_file: artifactPaths.promptBundleFile,
    bundle_file: artifactPaths.promptBundleFile,
  };

  const command = backendConfig.command ?? null;
  const args = (backendConfig.args ?? []).map((arg) => replaceToken(arg, replacements));
  const env = {
    SPM_BACKEND_NAME: backend,
    SPM_PROJECT_ROOT: options.rootDir,
    SPM_PROMPT_FILE: artifactPaths.promptTextFile,
    SPM_PROMPT_TEXT_FILE: artifactPaths.promptTextFile,
    SPM_PROMPT_BUNDLE_FILE: artifactPaths.promptBundleFile,
  };

  return {
    backend,
    mode: !backendConfig.enabled || !command ? "disabled" : options.spawn ? "spawned" : "preview",
    command,
    args,
    promptBundle,
    promptText,
    promptBundleText,
    artifactPaths,
    env,
  };
}

function renderPreviewText(plan: SubprocessLaunchPlan): string {
  const commandLine = plan.command ? [plan.command, ...plan.args].join(" ") : "(not configured)";

  return [
    `${plan.backend} backend is configured but not spawned.`,
    "Re-run with --spawn to invoke the subprocess adapter.",
    "",
    "Command preview:",
    commandLine,
    "",
    "Prompt contract:",
    `- prompt text file: ${plan.artifactPaths.promptTextFile}`,
    `- prompt bundle file: ${plan.artifactPaths.promptBundleFile}`,
    "- token replacements: {prompt}, {prompt_text}, {prompt_bundle}, {prompt_file}, {prompt_text_file}, {prompt_bundle_file}, {bundle_file}",
    "- env vars: SPM_BACKEND_NAME, SPM_PROJECT_ROOT, SPM_PROMPT_FILE, SPM_PROMPT_TEXT_FILE, SPM_PROMPT_BUNDLE_FILE",
    "",
    "Prompt preview:",
    plan.promptText,
  ].join("\n");
}

export abstract class SubprocessBackend implements ResumeBackend {
  abstract name: BackendName;

  constructor(private readonly backendConfig: ExecutionBackendConfig) {}

  protected get config(): ExecutionBackendConfig {
    return this.backendConfig;
  }

  async run(context: ResumeContext, options: BackendRunOptions): Promise<BackendRunResult> {
    const plan = buildSubprocessLaunchPlan(this.name, this.config, context, options);

    if (plan.mode === "disabled" || !plan.command) {
      const payload = {
        backend: this.name,
        mode: "disabled" as const,
        reason: "Backend is disabled or missing a command.",
        prompt_bundle: plan.promptBundle,
      };
      return {
        text: options.json
          ? JSON.stringify(payload, null, 2)
          : `${this.name} backend is disabled. Enable it in .specpm/config.toml or use --backend prompt.`,
        json: payload,
      };
    }

    if (plan.mode === "preview") {
      const payload = {
        backend: this.name,
        mode: "preview" as const,
        command: plan.command,
        args: plan.args,
        env: plan.env,
        artifact_paths: plan.artifactPaths,
        prompt_bundle: plan.promptBundle,
        prompt_text: plan.promptText,
      };

      return {
        text: options.json ? JSON.stringify(payload, null, 2) : renderPreviewText(plan),
        json: payload,
      };
    }

    await writeUtf8(plan.artifactPaths.promptBundleFile, plan.promptBundleText);
    await writeUtf8(plan.artifactPaths.promptTextFile, plan.promptText);

    const child = spawn(plan.command, plan.args, {
      cwd: options.rootDir,
      env: {
        ...process.env,
        ...plan.env,
      },
      stdio: "inherit",
    });

    await new Promise<void>((resolve, reject) => {
      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`${this.name} backend exited with code ${code ?? -1}`));
      });
      child.on("error", reject);
    });

    return {
      text: options.json
        ? JSON.stringify(
            {
              backend: this.name,
              mode: "spawned",
              command: plan.command,
              args: plan.args,
              env: plan.env,
              artifact_paths: plan.artifactPaths,
              prompt_bundle: plan.promptBundle,
            },
            null,
            2,
          )
        : `${this.name} backend finished successfully.`,
      json: {
        backend: this.name,
        mode: "spawned" as const,
        command: plan.command,
        args: plan.args,
        env: plan.env,
        artifact_paths: plan.artifactPaths,
        prompt_bundle: plan.promptBundle,
      },
    };
  }
}
