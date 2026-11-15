import type { ParsedArgs } from "../cli.ts";
import { flagValue, hasFlag } from "../cli.ts";
import { buildLegacyImportPlan, renderLegacyImportPlan } from "../services/legacy-import.ts";

export async function runImportCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  if (parsed.subcommand !== "legacy") {
    throw new Error("Supported import commands are `import legacy`.");
  }

  const source = flagValue(parsed, "source") ?? parsed.positionals[2];
  if (!source) {
    throw new Error("`import legacy` requires --source <folder>.");
  }

  const plan = await buildLegacyImportPlan(rootDir, source, {
    apply: hasFlag(parsed, "apply"),
  });

  if (hasFlag(parsed, "json")) {
    return JSON.stringify(plan, null, 2);
  }

  return renderLegacyImportPlan(plan);
}
