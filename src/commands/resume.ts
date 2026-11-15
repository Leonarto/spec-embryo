import type { ParsedArgs } from "../cli.ts";
import { backendFlag, flagValue, hasFlag } from "../cli.ts";
import { resolveResumeBackend } from "../backends/index.ts";
import { buildResumeContext } from "../engine.ts";
import { loadProjectContext } from "../repository.ts";
import { buildResumeWindowSummary, renderResumeWindowSummary } from "../services/resume-window.ts";

export async function runResumeCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const context = await loadProjectContext(rootDir);
  const backendName = backendFlag(parsed, context.config.defaults.resumeBackend);
  const backend = resolveResumeBackend(backendName, context.config);
  const since = flagValue(parsed, "since");
  const windowSummary = since ? buildResumeWindowSummary(context, since) : undefined;
  const result = await backend.run(buildResumeContext(context), {
    rootDir,
    config: context.config,
    json: hasFlag(parsed, "json"),
    spawn: hasFlag(parsed, "spawn"),
  });

  if (hasFlag(parsed, "json")) {
    return JSON.stringify(
      {
        resume: result.json,
        interruption_window: windowSummary,
      },
      null,
      2,
    );
  }

  return windowSummary ? `${renderResumeWindowSummary(windowSummary)}\n\n${result.text}` : result.text;
}
