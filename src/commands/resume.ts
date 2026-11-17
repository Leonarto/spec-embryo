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
import type { HarnessInvocation, HarnessProtocol, HarnessProvider } from "../domain.ts";
import { createNativeParser, validNativeSessionId } from "../services/harness-native.ts";
import { HarnessReceiptError, readHarnessReceipt } from "../services/harness-receipts.ts";
import { HarnessPathError } from "../services/harness-paths.ts";
import { beginRunEvidence, finishRunEvidence } from "../services/harness-run-evidence.ts";

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

function protocolFlag(parsed: ParsedArgs, backend: string): HarnessProtocol | undefined {
  if (!hasFlag(parsed, "protocol")) return undefined;
  const protocol = flagValue(parsed, "protocol");
  if ((backend === "codex" && protocol === "codex-jsonl") ||
    (backend === "claude" && (protocol === "claude-json" || protocol === "claude-stream-json"))) return protocol;
  throw new ResumeCommandError("--protocol must match --backend: codex-jsonl for codex, or claude-json/claude-stream-json for claude.");
}

async function buildResumeCommandResult(rootDir: string, parsed: ParsedArgs, cancellationSignal?: AbortSignal): Promise<ResumeCommandResult> {
  const maxBytes = maxContextBytes(parsed);
  const timeout = timeoutMs(parsed);
  const context = await loadProjectContext(rootDir);
  const backendName = backendFlag(parsed, context.config.defaults.resumeBackend);
  const protocol = protocolFlag(parsed, backendName);
  const recordRequested = hasFlag(parsed, "record");
  const sessionRef = flagValue(parsed, "session-ref");
  if ((recordRequested || hasFlag(parsed, "session-ref")) && backendName !== "codex" && backendName !== "claude") {
    throw new ResumeCommandError("--record and --session-ref require a codex or claude execution backend.");
  }
  let sessionId: string | undefined;
  if (hasFlag(parsed, "session-ref")) {
    if (!sessionRef || !protocol) throw new ResumeCommandError("--session-ref requires an exact receipt UUID and an explicit matching --protocol.");
    const receipt = await readHarnessReceipt(rootDir, sessionRef);
    if (receipt.provider !== backendName || receipt.protocol !== protocol || !validNativeSessionId(receipt.session_id)) {
      throw new ResumeCommandError("Receipt provider/protocol/session identity does not match this request; start with new portable context.", "precondition");
    }
    if (!context.config.backends[backendName as HarnessProvider].args?.some((arg) => arg.includes("{session_id}"))) {
      throw new ResumeCommandError("Configured args must include {session_id} to resume an exact native session.", "precondition");
    }
    sessionId = receipt.session_id;
  }
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
  const evidence = recordRequested && hasFlag(parsed, "spawn")
    ? await beginRunEvidence(rootDir, backendName as HarnessProvider, protocol ?? null, snapshot,
      resumeContext.activeSpecs.map((spec) => spec.id),
      [...resumeContext.activeTasks, ...resumeContext.blockedTasks, ...resumeContext.reviewTasks, ...resumeContext.readyTasks].map((entry) => entry.task.id))
    : undefined;
  if (evidence) warnings.push(...evidence.guard.warnings);
  const nativeParser = protocol && hasFlag(parsed, "spawn") ? createNativeParser(protocol) : undefined;
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
    protocol,
    sessionId,
    onStdoutChunk: nativeParser ? (chunk) => nativeParser.write(chunk) : undefined,
  });
  const nativeResult = result.invocation && nativeParser ? nativeParser.finish() : null;
  const recorded = evidence && result.invocation && result.invocation.error?.type !== "precondition" && result.invocation.error?.type !== "usage"
    ? await finishRunEvidence(evidence, result.invocation, nativeResult) : undefined;
  const outputWarnings = [...bundle.warnings, ...(result.invocation?.warnings ?? []), ...(nativeResult?.warnings ?? []), ...(recorded?.warnings ?? [])];
  let exitCode = result.exitCode ?? 0;
  if (exitCode === 0 && result.invocation?.state === "completed" &&
    ((nativeResult && nativeResult.terminal !== "completed") || recorded?.evidence_error || (recorded && !recorded.record.saved))) exitCode = 1;

  if (hasFlag(parsed, "json")) {
    return { text: JSON.stringify(
      withSchemaVersion({
        resume: result.json,
        context_snapshot: snapshot,
        context_pack: bundle.context_pack,
        warnings: outputWarnings,
        interruption_window: windowSummary,
        ...(result.invocation ? { invocation: result.invocation } : {}),
        ...(protocol ? { protocol, native_result: nativeResult } : {}),
        ...(recordRequested ? { record: recorded?.record ?? { requested: true, saved: false, path_template: ".specpm/runs/{run-id}.json" } } : {}),
        ...(recorded?.evidence_error ? { evidence_error: recorded.evidence_error } : {}),
      }),
      null,
      2,
    ), exitCode };
  }

  const nativeText = nativeResult ? [
    `${nativeResult.provider} process: ${result.invocation!.state}; native terminal: ${nativeResult.terminal}. Review remains required.`,
    `Session ID: ${nativeResult.session_id ?? "unavailable; use new portable context"}`,
    ...(nativeResult.final_text !== null ? ["", "Final response:", nativeResult.final_text] : []),
    ...(nativeResult.final_text_truncated ? ["Final response was truncated to 65536 UTF-8 bytes."] : []),
    ...outputWarnings.map((warning) => `Warning: ${warning}`),
  ].join("\n") : result.text;
  return { text: [nativeText, ...(recordRequested ? [recorded?.record.saved ? `Saved local receipt ${recorded.record.run_id}: ${recorded.record.path}`
    : hasFlag(parsed, "spawn") ? "Requested receipt was not saved." : "Receipt preview: .specpm/runs/{run-id}.json (no write)."] : []),
    ...(recorded?.evidence_error ? [`Evidence error: ${recorded.evidence_error.message}`] : [])].join("\n"), exitCode };
}

export async function runResumeCommandResult(rootDir: string, parsed: ParsedArgs): Promise<ResumeCommandResult> {
  const controller = hasFlag(parsed, "spawn") ? new AbortController() : undefined;
  const onInt = () => controller?.abort("SIGINT");
  const onTerm = () => controller?.abort("SIGTERM");
  if (controller) { process.on("SIGINT", onInt); process.on("SIGTERM", onTerm); }
  try { return await buildResumeCommandResult(rootDir, parsed, controller?.signal); }
  catch (error) {
    if (!hasFlag(parsed, "json")) throw error;
    const invocation: HarnessInvocation = failedInvocation(error instanceof ResumeCommandError ? error.type
      : error instanceof HarnessReceiptError || error instanceof HarnessPathError ? "precondition" : "context",
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
