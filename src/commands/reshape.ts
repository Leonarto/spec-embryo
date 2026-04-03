import type { ParsedArgs } from "../cli.ts";
import { flagValue, hasFlag } from "../cli.ts";
import { reshapeProject } from "../repository.ts";
import { normalizeManagedHomeInput } from "../services/layout.ts";

export async function runReshapeCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const home = flagValue(parsed, "home");
  const result = await reshapeProject(rootDir, {
    memoryDir: home ? normalizeManagedHomeInput(home) : undefined,
    dryRun: hasFlag(parsed, "dry-run"),
  });

  return [
    `${result.applied ? "Reshaped" : "Planned reshape for"} project memory.`,
    `Target memory home: ${result.targetMemoryDir}`,
    "",
    ...result.actions.map((action) => `- ${action}`),
    ...(result.warnings.length > 0 ? ["", "Warnings:", ...result.warnings.map((warning) => `- ${warning}`)] : []),
  ].join("\n");
}
