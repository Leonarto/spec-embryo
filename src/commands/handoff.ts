import type { ParsedArgs } from "../cli.ts";
import { flagValue, hasFlag } from "../cli.ts";
import { buildResumeContext } from "../engine.ts";
import { loadProjectContext, writeHandoff } from "../repository.ts";
import { prepareRunHandoff } from "../services/harness-run-handoff.ts";
import { HarnessReceiptError } from "../services/harness-receipts.ts";
import { HarnessPathError } from "../services/harness-paths.ts";
import { withSchemaVersion } from "../services/contracts.ts";

export async function runHandoffCommandResult(rootDir: string, parsed: ParsedArgs): Promise<{ text: string; exitCode: number }> {
  if (!hasFlag(parsed, "from-run")) return { text: await runLegacyHandoffCommand(rootDir, parsed), exitCode: 0 };
  try {
    const id = flagValue(parsed, "from-run");
    if (!id) throw new HarnessReceiptError("--from-run requires an exact SpM run receipt UUID.");
    const result = await prepareRunHandoff(rootDir, id, { apply: hasFlag(parsed, "apply"), note: flagValue(parsed, "note") });
    return { text: hasFlag(parsed, "json") ? JSON.stringify(withSchemaVersion({ handoff: result }), null, 2)
      : [result.draft.body, ...result.draft.conflicts.map((entry) => `Conflict: ${entry}`), result.applied
        ? `Created observed run handoff: ${result.file_path}` : `Preview only. Apply with spm handoff --from-run ${id} --apply.`].join("\n\n"),
      exitCode: hasFlag(parsed, "apply") && !result.applied ? 2 : 0 };
  } catch (error) {
    const exitCode = error instanceof HarnessReceiptError || error instanceof HarnessPathError ? 2 : 1;
    const payload = withSchemaVersion({ error: { type: exitCode === 2 ? "precondition" : "io",
      message: error instanceof Error ? error.message : String(error) } });
    return { text: hasFlag(parsed, "json") ? JSON.stringify(payload, null, 2) : payload.error.message, exitCode };
  }
}

export async function runHandoffCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  return (await runHandoffCommandResult(rootDir, parsed)).text;
}

function compactTitle(title: string): string {
  return title.trim().length > 0 ? title.trim() : "Checkpoint";
}

async function runLegacyHandoffCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
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
