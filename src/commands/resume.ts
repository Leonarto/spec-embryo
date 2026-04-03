import type { ParsedArgs } from "../cli.ts";
import { backendFlag, hasFlag } from "../cli.ts";
import { resolveResumeBackend } from "../backends/index.ts";
import { buildResumeContext } from "../engine.ts";
import { loadProjectContext } from "../repository.ts";

export async function runResumeCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const context = await loadProjectContext(rootDir);
  const backendName = backendFlag(parsed, context.config.defaults.resumeBackend);
  const backend = resolveResumeBackend(backendName, context.config);
  const result = await backend.run(buildResumeContext(context), {
    rootDir,
    config: context.config,
    json: hasFlag(parsed, "json"),
    spawn: hasFlag(parsed, "spawn"),
  });

  return result.text;
}
