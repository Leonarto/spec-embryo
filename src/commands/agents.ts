import type { ParsedArgs } from "../cli.ts";
import { buildAgentsHealthReport, renderAgentsHealthReport } from "../services/agents.ts";

export async function runAgentsCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  if (parsed.subcommand !== "check") {
    throw new Error("Only `agents check` is supported in v1.");
  }

  const report = await buildAgentsHealthReport(rootDir);

  if (parsed.flags.has("json")) {
    return JSON.stringify(report, null, 2);
  }

  return renderAgentsHealthReport(report);
}
