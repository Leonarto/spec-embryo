import type { NexusRootAgentsMode } from "../domain.ts";
import type { ParsedArgs } from "../cli.ts";
import { flagValue, hasFlag } from "../cli.ts";
import { buildNexusSetupReport, renderNexusSetupReport } from "../services/nexus.ts";

function rootAgentsModeFlag(parsed: ParsedArgs): NexusRootAgentsMode | undefined {
  const value = flagValue(parsed, "root-agents-mode");
  if (value === undefined) {
    return undefined;
  }

  if (value === "reference-only" || value === "scoped") {
    return value;
  }

  throw new Error("`nexus setup --root-agents-mode` must be `reference-only` or `scoped`.");
}

export async function runNexusCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  if (parsed.subcommand !== "setup") {
    throw new Error("Supported nexus commands are `nexus setup`.");
  }

  const report = await buildNexusSetupReport(rootDir, {
    apply: hasFlag(parsed, "apply"),
    command: flagValue(parsed, "command"),
    rootAgentsMode: rootAgentsModeFlag(parsed),
  });

  if (hasFlag(parsed, "json")) {
    return JSON.stringify(report, null, 2);
  }

  return renderNexusSetupReport(report);
}
