import type { ParsedArgs } from "../cli.ts";
import { flagValue } from "../cli.ts";
import { buildResumeContext } from "../engine.ts";
import { loadProjectContext, writeHandoff } from "../repository.ts";

function compactTitle(title: string): string {
  return title.trim().length > 0 ? title.trim() : "Checkpoint";
}

export async function runHandoffCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const context = await loadProjectContext(rootDir);
  const resumeContext = buildResumeContext(context);
  const createdAt = new Date().toISOString();
  const title = compactTitle(flagValue(parsed, "title") ?? `Checkpoint ${createdAt.slice(0, 10)}`);
  const note = flagValue(parsed, "note");
  const handoffId = `HANDOFF-${createdAt.replace(/[-:]/g, "").replace(/\..+/, "")}`;
  const summary = resumeContext.nextActions[0] ?? "Checkpoint created.";
  const bodySections = [
    "# Summary",
    "",
    resumeContext.summary,
    "",
    "## Focus",
    "",
    resumeContext.focus,
    "",
    "## Active Specs",
    "",
    ...(resumeContext.activeSpecs.length > 0 ? resumeContext.activeSpecs.map((spec) => `- ${spec.id}: ${spec.title}`) : ["- none"]),
    "",
    "## Active Tasks",
    "",
    ...(resumeContext.activeTasks.length > 0
      ? resumeContext.activeTasks.map((entry) => `- ${entry.task.id}: ${entry.task.title}`)
      : ["- none"]),
    "",
    "## Next Actions",
    "",
    ...resumeContext.nextActions.map((action) => `- ${action}`),
    "",
    "## Blockers",
    "",
    ...(resumeContext.blockedTasks.length > 0
      ? resumeContext.blockedTasks.map((entry) => `- ${entry.task.id}: ${entry.unmetDependencies.join(", ") || "manually blocked"}`)
      : ["- none"]),
  ];

  if (note) {
    bodySections.push("", "## Additional Note", "", note);
  }

  const filePath = await writeHandoff(rootDir, context.currentState, {
    id: handoffId,
    title,
    summary,
    createdAt,
    activeTaskIds: resumeContext.activeTasks.map((entry) => entry.task.id),
    relatedSpecIds: resumeContext.activeSpecs.map((spec) => spec.id),
    author: "spec-embryo",
    body: bodySections.join("\n"),
  });

  return `Created handoff ${handoffId}\n${filePath}`;
}
