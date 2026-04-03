import type { ParsedArgs } from "../cli.ts";
import { flagValue } from "../cli.ts";
import { TASK_STATUSES, isTaskStatus } from "../domain.ts";
import { buildTaskIndex, summarizeTaskNode } from "../engine.ts";
import { createTask, loadProjectContext, setTaskStatus } from "../repository.ts";

function parseCommaList(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export async function runTaskCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  if (parsed.subcommand === "create") {
    const title = flagValue(parsed, "title");
    const summary = flagValue(parsed, "summary");
    const specIds = parseCommaList(flagValue(parsed, "spec-ids"));
    const status = flagValue(parsed, "status");
    const priorityRaw = flagValue(parsed, "priority");
    const priority = priorityRaw ? Number.parseInt(priorityRaw, 10) : undefined;

    if (!title || !summary) {
      throw new Error("`task create` requires --title and --summary.");
    }

    if (specIds.length === 0) {
      throw new Error("`task create` requires --spec-ids <SPEC-001[,SPEC-002]>.");
    }

    if (status && !isTaskStatus(status)) {
      throw new Error(`Invalid task status: ${status}. Expected one of ${TASK_STATUSES.join(", ")}.`);
    }

    if (priority !== undefined && (!Number.isFinite(priority) || priority <= 0)) {
      throw new Error("`task create --priority` must be a positive integer.");
    }

    const task = await createTask(rootDir, {
      title,
      summary,
      specIds,
      status,
      priority,
      dependsOn: parseCommaList(flagValue(parsed, "depends-on")),
      blockedBy: parseCommaList(flagValue(parsed, "blocked-by")),
      ownerRole: flagValue(parsed, "owner-role"),
      tags: parseCommaList(flagValue(parsed, "tags")),
    });

    if (parsed.flags.has("json")) {
      return JSON.stringify(task, null, 2);
    }

    return `Created ${task.id} [${task.status}] in ${task.filePath}`;
  }

  if (parsed.subcommand === "set-status") {
    const taskId = parsed.positionals[2];
    const status = parsed.positionals[3];

    if (!taskId || !status) {
      throw new Error("`task set-status` requires <TASK-ID> <status>.");
    }

    if (!isTaskStatus(status)) {
      throw new Error(`Invalid task status: ${status}. Expected one of ${TASK_STATUSES.join(", ")}.`);
    }

    const task = await setTaskStatus(rootDir, taskId, status);

    if (parsed.flags.has("json")) {
      return JSON.stringify(task, null, 2);
    }

    return `Updated ${task.id} to [${task.status}] in ${task.filePath}`;
  }

  if (parsed.subcommand !== "list") {
    throw new Error("Supported task commands in v1 are `task list`, `task create`, and `task set-status`.");
  }

  const context = await loadProjectContext(rootDir);
  const statusFilter = flagValue(parsed, "status");
  const specFilter = flagValue(parsed, "spec");
  const taskIndex = buildTaskIndex(context.tasks);
  const tasks = context.tasks.filter((task) => {
    if (statusFilter && task.status !== statusFilter) {
      return false;
    }

    if (specFilter && !task.specIds.includes(specFilter)) {
      return false;
    }

    return true;
  });

  if (parsed.flags.has("json")) {
    return JSON.stringify(tasks, null, 2);
  }

  if (tasks.length === 0) {
    return "No tasks found.";
  }

  return tasks
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id))
    .map((task) => {
      const summary = summarizeTaskNode(task, taskIndex);
      const deps = task.dependsOn.join(", ") || "none";
      const unmet = summary.unmetDependencies.join(", ") || "none";
      return `${task.id} [${task.status}] p${task.priority} ${task.title}\n  specs: ${task.specIds.join(", ") || "none"}\n  depends_on: ${deps}\n  unmet_dependencies: ${unmet}\n  ${task.summary}`;
    })
    .join("\n\n");
}
