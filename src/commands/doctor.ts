import type { ParsedArgs } from "../cli.ts";
import { buildDoctorReport, renderDoctorReport } from "../services/doctor.ts";
import { withSchemaVersion } from "../services/contracts.ts";
import { buildHarnessDiagnostics, selectHarness } from "../services/harness-diagnostics.ts";

export async function runDoctorCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const provider = selectHarness(parsed.flags.get("harness"));
  const report = await buildDoctorReport(rootDir);
  if (provider) report.harness = await buildHarnessDiagnostics(rootDir, provider);

  if (parsed.flags.has("json")) {
    return JSON.stringify(withSchemaVersion(report as unknown as Record<string, unknown>), null, 2);
  }

  return renderDoctorReport(report, { verbose: parsed.flags.has("verbose") });
}
