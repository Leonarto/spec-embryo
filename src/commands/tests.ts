import type { ParsedArgs } from "../cli.ts";
import { hasFlag } from "../cli.ts";
import { buildTestDiagnosticsBundle, renderTestDiagnosticsBundle } from "../services/test-diagnostics.ts";

export async function runTestsCommand(_rootDir: string, parsed: ParsedArgs): Promise<string> {
  const subcommand = parsed.subcommand ?? "diagnose";
  if (subcommand !== "diagnose") {
    throw new Error("Supported tests commands are `tests diagnose`.");
  }

  const bundle = buildTestDiagnosticsBundle();
  return hasFlag(parsed, "json") ? JSON.stringify(bundle, null, 2) : renderTestDiagnosticsBundle(bundle);
}
