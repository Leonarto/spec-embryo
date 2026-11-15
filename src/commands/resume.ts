import type { ParsedArgs } from "../cli.ts";
import { backendFlag, flagValue, hasFlag } from "../cli.ts";
import { resolveResumeBackend } from "../backends/index.ts";
import { buildPromptBundle } from "../backends/prompt.ts";
import { buildResumeContext } from "../engine.ts";
import { loadProjectContext } from "../repository.ts";
import { buildResumeWindowSummary } from "../services/resume-window.ts";
import { buildResumeSnapshot } from "../services/resume-snapshot.ts";
import { DEFAULT_MAX_CONTEXT_BYTES, MAX_CONTEXT_BYTES, MIN_CONTEXT_BYTES } from "../services/resume-render.ts";
import { withSchemaVersion } from "../services/contracts.ts";
import { failedInvocation, invocationExitCode } from "../services/harness-process.ts";
import type { HarnessInvocation } from "../domain.ts";

export class ResumeCommandError extends Error {
  readonly exitCode = 2;
  constructor(message: string, readonly type: "usage" | "precondition" = "usage", readonly details: Record<string, unknown> = {}) {
    super(message);
  }
}

function maxContextBytes(parsed: ParsedArgs): number {
  if (!hasFlag(parsed, "max-context-bytes")) return DEFAULT_MAX_CONTEXT_BYTES;
  const value = flagValue(parsed, "max-context-bytes");
  if (!value || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) ||
    Number(value) < MIN_CONTEXT_BYTES || Number(value) > MAX_CONTEXT_BYTES) {
    throw new ResumeCommandError(`--max-context-bytes must be an integer between ${MIN_CONTEXT_BYTES} and ${MAX_CONTEXT_BYTES}.`);
  }
  return Number(value);
}

function timeoutMs(parsed: ParsedArgs): number | undefined {
  if (!hasFlag(parsed, "timeout-ms")) return undefined;
  const value = flagValue(parsed, "timeout-ms");
  if (!value || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw new ResumeCommandError("--timeout-ms must be a positive safe integer in milliseconds.");
  }
  return Number(value);
}

interface ResumeCommandResult { text: string; exitCode: number }

async function buildResumeCommandResult(rootDir: string, parsed: ParsedArgs, cancellationSignal?: AbortSignal): Promise<ResumeCommandResult> {
  const maxBytes = maxContextBytes(parsed);
  const timeout = timeoutMs(parsed);
  const context = await loadProjectContext(rootDir);
  const backendName = backendFlag(parsed, context.config.defaults.resumeBackend);
  const backend = resolveResumeBackend(backendName, context.config);
  const since = flagValue(parsed, "since");
  if (hasFlag(parsed, "since") && !since) throw new ResumeCommandError("--since requires a single Git commit revision.");
  const windowSummary = since ? buildResumeWindowSummary(context, since) : undefined;
  if (hasFlag(parsed, "spawn") && windowSummary && !windowSummary.available) {
    throw new ResumeCommandError(`Cannot spawn with an unavailable interruption window: ${windowSummary.error}`,
      "precondition", { interruption_window: windowSummary });
  }
  const resumeContext = buildResumeContext(context);
  if (windowSummary) resumeContext.interruption_window = windowSummary;
  const { snapshot, warnings } = buildResumeSnapshot(context, resumeContext);
  resumeContext.context_snapshot = snapshot;
  resumeContext.warnings = warnings;
  if (backendName === "codex" || backendName === "claude") {
    warnings.push(`${backendName} harness version and native capabilities have not been verified; configured arguments are used unchanged.`);
  }
  const bundle = buildPromptBundle(resumeContext, maxBytes);
  const result = await backend.run(resumeContext, {
    rootDir,
    config: context.config,
    json: hasFlag(parsed, "json"),
    spawn: hasFlag(parsed, "spawn"),
    maxContextBytes: maxBytes,
    timeoutMs: timeout,
    retainArtifacts: hasFlag(parsed, "retain-artifacts"),
    cancellationSignal,
  });

  if (hasFlag(parsed, "json")) {
    return { text: JSON.stringify(
      withSchemaVersion({
        resume: result.json,
        context_snapshot: snapshot,
        context_pack: bundle.context_pack,
        warnings: [...bundle.warnings, ...(result.invocation?.warnings ?? [])],
        interruption_window: windowSummary,
        ...(result.invocation ? { invocation: result.invocation } : {}),
      }),
      null,
      2,
    ), exitCode: result.exitCode ?? 0 };
  }

  return { text: result.text, exitCode: result.exitCode ?? 0 };
}

export async function runResumeCommandResult(rootDir: string, parsed: ParsedArgs): Promise<ResumeCommandResult> {
  const controller = hasFlag(parsed, "spawn") ? new AbortController() : undefined;
  const onInt = () => controller?.abort("SIGINT");
  const onTerm = () => controller?.abort("SIGTERM");
  if (controller) { process.on("SIGINT", onInt); process.on("SIGTERM", onTerm); }
  try { return await buildResumeCommandResult(rootDir, parsed, controller?.signal); }
  catch (error) {
    if (!hasFlag(parsed, "json")) throw error;
    const invocation: HarnessInvocation = failedInvocation(error instanceof ResumeCommandError ? error.type : "context",
      error instanceof Error ? error.message : String(error));
    return { text: JSON.stringify(withSchemaVersion({ resume: null, context_snapshot: null, context_pack: null,
      warnings: [], ...(error instanceof ResumeCommandError ? error.details : {}), invocation }), null, 2),
      exitCode: invocationExitCode(invocation) };
  }
  finally { process.off("SIGINT", onInt); process.off("SIGTERM", onTerm); }
}

export async function runResumeCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  return (await runResumeCommandResult(rootDir, parsed)).text;
}
