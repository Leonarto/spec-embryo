import type { ParsedArgs } from "../cli.ts";
import { flagValue, hasFlag } from "../cli.ts";
import { loadProjectContext } from "../repository.ts";
import { buildHookPlan, HOOK_EVENTS, installHookConfig, isHookEvent, renderHookPlan } from "../services/hooks.ts";

function parseEvents(value: string | undefined): Array<(typeof HOOK_EVENTS)[number]> {
  const raw = value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [...HOOK_EVENTS];
  for (const event of raw) {
    if (!isHookEvent(event)) {
      throw new Error(`Invalid hook event: ${event}. Expected one of ${HOOK_EVENTS.join(", ")}.`);
    }
  }
  return raw as Array<(typeof HOOK_EVENTS)[number]>;
}

export async function runHooksCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
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
