import type { ParsedArgs } from "../cli.ts";
import { flagValue, hasFlag } from "../cli.ts";
import { loadProjectContext } from "../repository.ts";
import { buildHookPlan, HOOK_EVENTS, installHookConfig, isHookEvent, renderHookPlan } from "../services/hooks.ts";
import { applyHarnessHookPlan, buildHarnessHookPlan, harnessHookFailureCode, HarnessHookError, renderHarnessHookPlan } from "../services/harness-hooks.ts";
import { HarnessSelectionError, selectHarness } from "../services/harness-diagnostics.ts";
import { withSchemaVersion } from "../services/contracts.ts";

export async function runHooksCommandResult(rootDir: string, parsed: ParsedArgs): Promise<{ text: string; exitCode: number }> {
  if (!hasFlag(parsed, "harness")) return { text: await runGitHooksCommand(rootDir, parsed), exitCode: 0 };
  try {
    const provider = selectHarness(parsed.flags.get("harness"));
    const subcommand = parsed.subcommand ?? "plan";
    if (!provider || !["plan", "install", "remove"].includes(subcommand) || hasFlag(parsed, "event") || hasFlag(parsed, "events")) {
      throw new HarnessHookError("Use hooks plan/install/remove --harness codex|claude without Git --event/--events flags.");
    }
    if (subcommand === "plan" && hasFlag(parsed, "apply")) throw new HarnessHookError("Use hooks install/remove --apply to write a previewed preset.");
    const operation = subcommand === "remove" ? "remove" : "install";
    const plan = hasFlag(parsed, "apply") ? await applyHarnessHookPlan(rootDir, provider, operation)
      : await buildHarnessHookPlan(rootDir, provider, operation);
    return { text: hasFlag(parsed, "json") ? JSON.stringify(withSchemaVersion(plan as unknown as Record<string, unknown>), null, 2)
      : renderHarnessHookPlan(plan), exitCode: plan.conflicts.length ? 2 : plan.mode === "partial" ? 1 : 0 };
  } catch (error) {
    const exitCode = error instanceof HarnessSelectionError ? 2 : harnessHookFailureCode(error);
    const payload = withSchemaVersion({ error: { type: exitCode === 2 ? "precondition" : "io",
      message: error instanceof Error ? error.message : String(error) } });
    return { text: hasFlag(parsed, "json") ? JSON.stringify(payload, null, 2) : payload.error.message, exitCode };
  }
}

export async function runHooksCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  return (await runHooksCommandResult(rootDir, parsed)).text;
}

function parseEvents(value: string | undefined): Array<(typeof HOOK_EVENTS)[number]> {
  const raw = value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [...HOOK_EVENTS];
  for (const event of raw) {
    if (!isHookEvent(event)) {
      throw new Error(`Invalid hook event: ${event}. Expected one of ${HOOK_EVENTS.join(", ")}.`);
    }
  }
  return raw as Array<(typeof HOOK_EVENTS)[number]>;
}

async function runGitHooksCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const subcommand = parsed.subcommand ?? "plan";

  if (subcommand === "install") {
    const result = await installHookConfig(rootDir, parseEvents(flagValue(parsed, "events")));
    return hasFlag(parsed, "json") ? JSON.stringify(result, null, 2) : `Installed SpM hook config in ${result.filePath}`;
  }

  if (subcommand !== "plan") {
    throw new Error("Supported hooks commands are `hooks plan` and `hooks install`.");
  }

  const event = flagValue(parsed, "event") ?? parsed.positionals[2] ?? "commit";
  if (!isHookEvent(event)) {
    throw new Error(`Invalid hook event: ${event}. Expected one of ${HOOK_EVENTS.join(", ")}.`);
  }

  const context = await loadProjectContext(rootDir);
  const plan = await buildHookPlan(context, event);
  return hasFlag(parsed, "json") ? JSON.stringify(plan, null, 2) : renderHookPlan(plan);
}
