import type { ResumeContext } from "../domain.ts";
import {
  formatChangedItemSummary,
  formatOmittedCountNote,
  humanChangedItemSummarySlice,
  sliceWithOmittedCount,
} from "../engine.ts";
import type { BackendRunOptions, BackendRunResult, ResumeBackend } from "./base.ts";
import { buildPromptBundle, renderPromptBundleText } from "./prompt.ts";
import { DEFAULT_MAX_CONTEXT_BYTES } from "../services/resume-render.ts";
import { renderResumeWindowSummary } from "../services/resume-window.ts";

function section(title: string, lines: string[]): string {
  return [title, ...lines.map((line) => `  ${line}`)].join("\n");
}

export class DeterministicBackend implements ResumeBackend {
  name = "deterministic" as const;

  async run(context: ResumeContext, options: BackendRunOptions): Promise<BackendRunResult> {
    const lines: string[] = [];

    lines.push(`Project: ${context.projectName}`);
    lines.push(`Focus: ${context.focus}`);
    lines.push(`Summary: ${context.summary}`);

    if (context.git.available) {
      lines.push(`Git: ${context.git.branch ?? "unknown branch"}${context.git.dirty ? " (dirty)" : " (clean)"}`);
      if (context.git.lastCommit) {
        lines.push(`Last commit: ${context.git.lastCommit}`);
      }
    }

    const sections = [
      section(
        "Active Specs",
        context.activeSpecs.length > 0
          ? context.activeSpecs.map((spec) => `${spec.id} [${spec.status}] ${spec.title}`)
          : ["No active specs recorded."],
      ),
      section(
        "Active Tasks",
        context.activeTasks.length > 0
          ? context.activeTasks.map((entry) => {
              const deps = entry.unmetDependencies.length > 0 ? ` | unmet deps: ${entry.unmetDependencies.join(", ")}` : "";
              return `${entry.task.id} [${entry.task.status}] p${entry.task.priority} ${entry.task.title}${deps}`;
            })
          : ["No active tasks recorded."],
      ),
      section(
        "Blocked",
        context.blockedTasks.length > 0
          ? context.blockedTasks.map((entry) => {
              const reason = entry.unmetDependencies.length > 0 ? entry.unmetDependencies.join(", ") : "manually blocked";
              return `${entry.task.id} ${entry.task.title} | waiting on ${reason}`;
            })
          : ["No blocked tasks."],
      ),
      section(
        "Review",
        context.reviewTasks.length > 0
          ? context.reviewTasks.map((entry) => `${entry.task.id} [${entry.task.status}] p${entry.task.priority} ${entry.task.title}`)
          : ["No tasks currently in review."],
      ),
      section(
        "Ready Next",
        context.readyTasks.length > 0
          ? context.readyTasks.slice(0, 5).map((entry) => `${entry.task.id} p${entry.task.priority} ${entry.task.title}`)
          : ["No ready tasks."],
      ),
      section(
        "Critical Path",
        context.criticalPath.length > 0
          ? context.criticalPath.map((task) => `${task.id} [${task.status}] ${task.title}`)
          : ["No unfinished dependency chain found."],
      ),
      section(
        "Next Actions",
        context.nextActions.map((action) => action),
      ),
    ];

    if (context.recentHandoff) {
      sections.push(
        section("Recent Handoff", [
          `${context.recentHandoff.id} at ${context.recentHandoff.createdAt}`,
          context.recentHandoff.title,
          context.recentHandoff.summary,
        ]),
      );
    }

    if (context.git.shortStatus.length > 0) {
      const gitChanges = sliceWithOmittedCount(context.git.shortStatus, 10);
      const omittedGitNote = formatOmittedCountNote(gitChanges.omittedCount, "git change");
      sections.push(
        section("Git Changes", [
          ...gitChanges.visibleItems,
          ...(omittedGitNote ? [omittedGitNote] : []),
        ]),
      );
    }

    if (context.changedItems.length > 0) {
      const changedItems = humanChangedItemSummarySlice(context.changedItems, 10);
      const omittedNote = formatOmittedCountNote(changedItems.omittedCount, "changed file");
      sections.push(
        section(
          "Changed Items",
          [
            ...changedItems.visibleItems.map((item) => `[${item.kind}] ${formatChangedItemSummary(item)}`),
            ...(omittedNote ? [omittedNote] : []),
          ],
        ),
      );
    }

    if (context.interruption_window) sections.push(renderResumeWindowSummary(context.interruption_window));
    if (context.warnings?.length) sections.push(section("Warnings", context.warnings));
    const fullText = `${lines.join("\n")}\n\n${sections.join("\n\n")}`;
    const text = Buffer.byteLength(fullText, "utf8") <= (options.maxContextBytes ?? DEFAULT_MAX_CONTEXT_BYTES)
      ? fullText : renderPromptBundleText(buildPromptBundle(context, options.maxContextBytes));
    return {
      text,
      json: options.json ? context : undefined,
    };
  }
}
