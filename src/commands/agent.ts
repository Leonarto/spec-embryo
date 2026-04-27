import type { ParsedArgs } from "../cli.ts";
import { buildAgentWorkflowBrief, renderAgentWorkflowBrief } from "../services/agent-workflow.ts";
import { buildDoctorReport } from "../services/doctor.ts";

export async function runAgentCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  if (parsed.subcommand && parsed.subcommand !== "brief") {
    throw new Error("Supported agent commands are `agent` and `agent brief`.");
  }

  const report = await buildDoctorReport(rootDir);
  const brief = buildAgentWorkflowBrief(report);

  if (parsed.flags.has("json")) {
    return JSON.stringify(brief, null, 2);
  }

  return renderAgentWorkflowBrief(brief);
}
