import type { ParsedArgs } from "../cli.ts";
import { flagValue } from "../cli.ts";
import { loadProjectContext, updateCurrentState } from "../repository.ts";

function parseCommaList(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseHints(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split("||")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function runCurrentCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  if (!parsed.subcommand || parsed.subcommand === "show") {
    const context = await loadProjectContext(rootDir);

    if (parsed.flags.has("json")) {
      return JSON.stringify(context.currentState, null, 2);
    }

    const lines = [
      `Current state: ${context.currentState.title}`,
      `Summary: ${context.currentState.summary}`,
      `Focus: ${context.currentState.focus}`,
      "",
      `Active specs: ${context.currentState.activeSpecIds.join(", ") || "none"}`,
      `Active tasks: ${context.currentState.activeTaskIds.join(", ") || "none"}`,
      `Blocked tasks: ${context.currentState.blockedTaskIds.join(", ") || "none"}`,
      "",
      "Next action hints:",
      ...(context.currentState.nextActionHints.length > 0
        ? context.currentState.nextActionHints.map((hint) => `- ${hint}`)
        : ["- none"]),
    ];

    if (context.currentState.lastHandoffId) {
      lines.push("", `Last handoff: ${context.currentState.lastHandoffId}`);
    }

    return lines.join("\n");
  }

  if (parsed.subcommand !== "set") {
    throw new Error("Supported current commands in v1 are `current show` and `current set`.");
  }

  const hasMutation =
    flagValue(parsed, "focus") !== undefined ||
    flagValue(parsed, "summary") !== undefined ||
    flagValue(parsed, "active-spec-ids") !== undefined ||
    flagValue(parsed, "active-task-ids") !== undefined ||
    flagValue(parsed, "blocked-task-ids") !== undefined ||
    flagValue(parsed, "next-action-hints") !== undefined ||
    parsed.flags.has("clear-active-spec-ids") ||
    parsed.flags.has("clear-active-task-ids") ||
    parsed.flags.has("clear-blocked-task-ids") ||
    parsed.flags.has("clear-next-action-hints");

  if (!hasMutation) {
    throw new Error("`current set` requires at least one field flag or clear flag.");
  }

  const updated = await updateCurrentState(rootDir, {
    focus: flagValue(parsed, "focus"),
    summary: flagValue(parsed, "summary"),
    activeSpecIds: parseCommaList(flagValue(parsed, "active-spec-ids")),
    activeTaskIds: parseCommaList(flagValue(parsed, "active-task-ids")),
    blockedTaskIds: parseCommaList(flagValue(parsed, "blocked-task-ids")),
    nextActionHints: parseHints(flagValue(parsed, "next-action-hints")),
    clearActiveSpecIds: parsed.flags.has("clear-active-spec-ids"),
    clearActiveTaskIds: parsed.flags.has("clear-active-task-ids"),
    clearBlockedTaskIds: parsed.flags.has("clear-blocked-task-ids"),
    clearNextActionHints: parsed.flags.has("clear-next-action-hints"),
  });

  if (parsed.flags.has("json")) {
    return JSON.stringify(updated, null, 2);
  }

  return `Updated current state in ${updated.filePath}`;
}
