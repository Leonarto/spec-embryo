import type { ParsedArgs } from "../cli.ts";
import { buildDoctorReport, renderDoctorReport } from "../services/doctor.ts";

export async function runDoctorCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const report = await buildDoctorReport(rootDir);

  if (parsed.flags.has("json")) {
    return JSON.stringify(report, null, 2);
  }

  return renderDoctorReport(report);
}
