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

export class ResumeCommandError extends Error {
  readonly exitCode = 2;
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

export async function runResumeCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const maxBytes = maxContextBytes(parsed);
  const context = await loadProjectContext(rootDir);
  const backendName = backendFlag(parsed, context.config.defaults.resumeBackend);
  const backend = resolveResumeBackend(backendName, context.config);
  const since = flagValue(parsed, "since");
  if (hasFlag(parsed, "since") && !since) throw new ResumeCommandError("--since requires a single Git commit revision.");
  const windowSummary = since ? buildResumeWindowSummary(context, since) : undefined;
  if (hasFlag(parsed, "spawn") && windowSummary && !windowSummary.available) {
    throw new ResumeCommandError(`Cannot spawn with an unavailable interruption window: ${windowSummary.error}`);
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
  });

  if (hasFlag(parsed, "json")) {
    return JSON.stringify(
      withSchemaVersion({
        resume: result.json,
        context_snapshot: snapshot,
        context_pack: bundle.context_pack,
        warnings: bundle.warnings,
        interruption_window: windowSummary,
      }),
      null,
      2,
    );
  }

  return result.text;
}
