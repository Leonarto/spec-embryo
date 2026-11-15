import type { ParsedArgs } from "../cli.ts";
import {
  deriveStatusSnapshot,
  deriveNextActions,
  formatChangedItemSummary,
  formatOmittedCountNote,
  humanChangedItemSummarySlice,
} from "../engine.ts";
import { loadProjectContext } from "../repository.ts";
import { buildAgentsHealthReport } from "../services/agents.ts";
import { withSchemaVersion } from "../services/contracts.ts";

export async function runStatusCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const [context, agentsReport] = await Promise.all([loadProjectContext(rootDir), buildAgentsHealthReport(rootDir)]);
  const snapshot = deriveStatusSnapshot(context);
  const nextActions = deriveNextActions(context, snapshot);

  if (parsed.flags.has("json")) {
    return JSON.stringify(
      withSchemaVersion({
        project: context.config.projectName,
        focus: context.currentState.focus,
        summary: context.currentState.summary,
        counts: {
          specs: snapshot.specCount,
          tasks: snapshot.taskCount,
          in_progress: snapshot.inProgressTasks.length,
          review: snapshot.reviewTasks.length,
          blocked: snapshot.blockedTasks.length,
          ready: snapshot.readyTasks.length,
        },
        active_spec_ids: snapshot.activeSpecIds,
        active_task_ids: snapshot.activeTaskIds,
        next_actions: nextActions,
        missing_dependencies: snapshot.missingDependencies,
        changed_items: snapshot.changedItems,
        git: context.git,
        agents: agentsReport.summary,
      }),
      null,
      2,
    );
  }

  const lines = [
    `Project: ${context.config.projectName}`,
    `Focus: ${context.currentState.focus}`,
    `Summary: ${context.currentState.summary}`,
    "",
    `Specs: ${snapshot.specCount} total | active ${snapshot.activeSpecIds.length}`,
    `Tasks: ${snapshot.taskCount} total | in progress ${snapshot.inProgressTasks.length} | review ${snapshot.reviewTasks.length} | blocked ${snapshot.blockedTasks.length} | ready ${snapshot.readyTasks.length}`,
    `Git: ${context.git.available ? `${context.git.branch ?? "unknown"}${context.git.dirty ? " (dirty)" : " (clean)"}` : "not available"}`,
    `AGENTS: ${agentsReport.summary.ok ? "healthy" : "needs attention"} | files ${agentsReport.summary.fileCount} | max file ${agentsReport.summary.maxFileTokens} tokens | max chain ${agentsReport.summary.maxChainTokens} tokens`,
    "",
    "Active specs:",
    ...(snapshot.activeSpecIds.length > 0 ? snapshot.activeSpecIds.map((id) => `- ${id}`) : ["- none"]),
    "Active tasks:",
    ...(snapshot.activeTaskIds.length > 0 ? snapshot.activeTaskIds.map((id) => `- ${id}`) : ["- none"]),
    "Next actions:",
    ...nextActions.map((action) => `- ${action}`),
  ];

  if (snapshot.blockedTasks.length > 0) {
    lines.push("", "Blocked tasks:");
    for (const blocked of snapshot.blockedTasks) {
      const reason = blocked.unmetDependencies.length > 0 ? blocked.unmetDependencies.join(", ") : "manually blocked";
      lines.push(`- ${blocked.task.id}: ${blocked.task.title} (${reason})`);
    }
  }

  if (snapshot.reviewTasks.length > 0) {
    lines.push("", "Review tasks:");
    for (const review of snapshot.reviewTasks) {
      lines.push(`- ${review.task.id}: ${review.task.title}`);
    }
  }

  if (snapshot.missingDependencies.length > 0) {
    lines.push("", "Dependency issues:");
    for (const item of snapshot.missingDependencies) {
      lines.push(`- ${item.taskId} references missing dependency ${item.missingTaskId}`);
    }
  }

  if (snapshot.changedItems.length > 0) {
    lines.push("", "Changed items:");
    const changedItems = humanChangedItemSummarySlice(snapshot.changedItems, 10);
    for (const item of changedItems.visibleItems) {
      lines.push(`- [${item.kind}] ${formatChangedItemSummary(item)}`);
    }
    const omittedNote = formatOmittedCountNote(changedItems.omittedCount, "changed file");
    if (omittedNote) {
      lines.push(`- ${omittedNote}`);
    }
  }

  if (snapshot.recentHandoff) {
    lines.push("", `Recent handoff: ${snapshot.recentHandoff.id} | ${snapshot.recentHandoff.title}`);
  }

  if (!agentsReport.summary.ok) {
    lines.push("", "AGENTS issues:");
    for (const failure of agentsReport.failures) {
      lines.push(`- ${failure}`);
    }
  }

  return lines.join("\n");
}
