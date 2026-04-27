import type { ParsedArgs } from "../cli.ts";
import {
  buildAgentSnippet,
  buildAgentWorkflowBrief,
  renderAgentSnippet,
  renderAgentWorkflowBrief,
} from "../services/agent-workflow.ts";
import { buildDoctorReport } from "../services/doctor.ts";

export async function runAgentCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  if (parsed.subcommand && parsed.subcommand !== "brief" && parsed.subcommand !== "snippet") {
    throw new Error("Supported agent commands are `agent`, `agent brief`, and `agent snippet`.");
  }

  const report = await buildDoctorReport(rootDir);
  if (!parsed.subcommand || parsed.subcommand === "brief") {
    const brief = buildAgentWorkflowBrief(report);

    if (parsed.flags.has("json")) {
      return JSON.stringify(brief, null, 2);
    }

    return renderAgentWorkflowBrief(brief);
  }

  if (parsed.subcommand === "snippet") {
    const snippet = buildAgentSnippet(report);

    if (parsed.flags.has("json")) {
      return JSON.stringify(snippet, null, 2);
    }

    return renderAgentSnippet(snippet);
  }

  throw new Error("Supported agent commands are `agent`, `agent brief`, and `agent snippet`.");
}
