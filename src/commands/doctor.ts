import type { ParsedArgs } from "../cli.ts";
import { buildDoctorReport, renderDoctorReport } from "../services/doctor.ts";
import { withSchemaVersion } from "../services/contracts.ts";

export async function runDoctorCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const report = await buildDoctorReport(rootDir);

  if (parsed.flags.has("json")) {
    return JSON.stringify(withSchemaVersion(report as unknown as Record<string, unknown>), null, 2);
  }

  return renderDoctorReport(report, { verbose: parsed.flags.has("verbose") });
}
