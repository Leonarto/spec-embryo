import { join } from "node:path";
import type { BackendName, ExecutionBackendConfig, HarnessInvocation, ResumeContext } from "../domain.ts";
import type { BackendRunOptions, BackendRunResult, ResumeBackend } from "./base.ts";
import { buildPromptBundle, renderPromptBundleText } from "./prompt.ts";
import { cancelledInvocation, failedInvocation, invocationExitCode, runHarnessProcess } from "../services/harness-process.ts";
import { cleanupHarnessArtifacts, markHarnessArtifacts, reserveHarnessArtifacts, writeHarnessArtifactFiles, type HarnessArtifactReservation } from "../services/harness-artifacts.ts";

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
  promptStablePrefixText: string;
  promptVariableTailText: string;
  artifactPaths: {
    promptTextFile: string;
    promptBundleFile: string;
    promptStablePrefixFile: string;
    promptVariableTailFile: string;
  };
  env: Record<string, string>;
  artifactPathsAreTemplates: boolean;
}

function buildArtifactPaths(rootDir: string, backend: BackendName, artifactDirectory?: string): SubprocessLaunchPlan["artifactPaths"] {
  const directory = artifactDirectory ?? join(rootDir, ".specpm", "tmp", "{run-id}");
  return {
    promptTextFile: join(directory, `${backend}-resume-prompt.txt`),
    promptBundleFile: join(directory, `${backend}-resume-prompt.json`),
    promptStablePrefixFile: join(directory, `${backend}-resume-prompt-prefix.txt`),
    promptVariableTailFile: join(directory, `${backend}-resume-prompt-tail.txt`),
  };
}

export function buildSubprocessLaunchPlan(
  backend: BackendName,
  backendConfig: ExecutionBackendConfig,
  context: ResumeContext,
  options: BackendRunOptions,
  artifactDirectory?: string,
): SubprocessLaunchPlan {
  const promptBundle = buildPromptBundle(context, options.maxContextBytes);
  const promptBundleText = JSON.stringify(promptBundle, null, 2);
  const promptText = renderPromptBundleText(promptBundle);
  const promptStablePrefixText = promptBundle.cache_assembly.stable_prefix_text;
  const promptVariableTailText = promptBundle.cache_assembly.variable_tail_text;
  const artifactPaths = buildArtifactPaths(options.rootDir, backend, artifactDirectory);

  const replacements = {
    prompt: promptText,
    prompt_text: promptText,
    prompt_bundle: promptBundleText,
    prompt_stable_prefix: promptStablePrefixText,
    prompt_variable_tail: promptVariableTailText,
    prompt_file: artifactPaths.promptTextFile,
    prompt_text_file: artifactPaths.promptTextFile,
    prompt_bundle_file: artifactPaths.promptBundleFile,
    prompt_stable_prefix_file: artifactPaths.promptStablePrefixFile,
    prompt_variable_tail_file: artifactPaths.promptVariableTailFile,
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
    SPM_PROMPT_STABLE_PREFIX_FILE: artifactPaths.promptStablePrefixFile,
    SPM_PROMPT_VARIABLE_TAIL_FILE: artifactPaths.promptVariableTailFile,
  };

  return {
    backend,
    mode: !backendConfig.enabled || !command ? "disabled" : options.spawn ? "spawned" : "preview",
    command,
    args,
    promptBundle,
    promptText,
    promptBundleText,
    promptStablePrefixText,
    promptVariableTailText,
    artifactPaths,
    env,
    artifactPathsAreTemplates: !artifactDirectory,
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
    "- preview artifact paths are templates; no directory or files have been reserved",
    `- prompt text file: ${plan.artifactPaths.promptTextFile}`,
    `- prompt bundle file: ${plan.artifactPaths.promptBundleFile}`,
    `- stable prefix file: ${plan.artifactPaths.promptStablePrefixFile}`,
    `- variable tail file: ${plan.artifactPaths.promptVariableTailFile}`,
    "- token replacements: {prompt}, {prompt_text}, {prompt_bundle}, {prompt_stable_prefix}, {prompt_variable_tail}, {prompt_file}, {prompt_text_file}, {prompt_bundle_file}, {prompt_stable_prefix_file}, {prompt_variable_tail_file}, {bundle_file}",
    "- env vars: SPM_BACKEND_NAME, SPM_PROJECT_ROOT, SPM_PROMPT_FILE, SPM_PROMPT_TEXT_FILE, SPM_PROMPT_BUNDLE_FILE, SPM_PROMPT_STABLE_PREFIX_FILE, SPM_PROMPT_VARIABLE_TAIL_FILE",
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
    let plan = buildSubprocessLaunchPlan(this.name, this.config, context, options);

    if (plan.mode === "disabled" || !plan.command) {
      const invocation = options.spawn ? failedInvocation("precondition", "Backend is disabled or missing a command.") : undefined;
      const payload = {
        backend: this.name,
        mode: "disabled" as const,
        reason: "Backend is disabled or missing a command.",
        prompt_bundle: plan.promptBundle,
        ...(invocation ? { invocation } : {}),
      };
      return {
        text: options.json
          ? JSON.stringify(payload, null, 2)
          : `${this.name} backend is disabled. Enable it in .specpm/config.toml or use --backend prompt.`,
        json: payload,
        invocation,
        exitCode: invocation ? invocationExitCode(invocation) : 0,
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
        artifact_paths_are_templates: true,
        prompt_bundle: plan.promptBundle,
        prompt_text: plan.promptText,
        prompt_stable_prefix: plan.promptStablePrefixText,
        prompt_variable_tail: plan.promptVariableTailText,
      };

      return {
        text: options.json ? JSON.stringify(payload, null, 2) : renderPreviewText(plan),
        json: payload,
      };
    }

    let reservation: HarnessArtifactReservation | undefined;
    let invocation: HarnessInvocation | undefined;
    try {
      if (options.cancellationSignal?.aborted) {
        invocation = cancelledInvocation(options.cancellationSignal.reason === "SIGINT" ? "SIGINT" : "SIGTERM");
      } else {
        reservation = await reserveHarnessArtifacts(options.rootDir, this.name);
        await markHarnessArtifacts(reservation);
        plan = buildSubprocessLaunchPlan(this.name, this.config, context, options, reservation.directory);
        await writeHarnessArtifactFiles([
          [plan.artifactPaths.promptBundleFile, plan.promptBundleText],
          [plan.artifactPaths.promptTextFile, plan.promptText],
          [plan.artifactPaths.promptStablePrefixFile, plan.promptStablePrefixText],
          [plan.artifactPaths.promptVariableTailFile, plan.promptVariableTailText],
        ]);
      }
    } catch (error) {
      invocation = failedInvocation("artifact", error instanceof Error ? error.message : String(error));
    }
    if (!invocation) {
      invocation = await runHarnessProcess({ command: plan.command!, args: plan.args, cwd: options.rootDir,
        env: plan.env, captureStdout: !!options.json, timeoutMs: options.timeoutMs, cancellationSignal: options.cancellationSignal });
    }
    let retained = !!reservation;
    if (reservation && !options.retainArtifacts && invocation.state !== "unknown") {
      const warning = await cleanupHarnessArtifacts(reservation);
      if (warning) invocation.warnings.push(warning);
      else retained = false;
    }
    if (retained) invocation.warnings.push(invocation.state === "unknown"
      ? "Artifacts retained because process-tree closure is unverified."
      : `Artifacts retained at ${reservation!.directory}${options.retainArtifacts ? " by --retain-artifacts" : " for inspection"}.`);
    const payload = {
      backend: this.name, mode: "spawned" as const, command: plan.command, args: plan.args,
      env: plan.env, artifact_paths: plan.artifactPaths, artifact_paths_are_templates: plan.artifactPathsAreTemplates,
      artifacts_retained: retained, prompt_bundle: plan.promptBundle, invocation,
    };
    return { text: options.json ? JSON.stringify(payload, null, 2)
      : [`${this.name} backend ${invocation.state}.${invocation.error ? ` ${invocation.error.message}` : " Process success does not verify the work; review remains required."}`,
        ...invocation.warnings.map((warning) => `Warning: ${warning}`)].join("\n"),
      json: payload, invocation, exitCode: invocationExitCode(invocation) };
  }
}
