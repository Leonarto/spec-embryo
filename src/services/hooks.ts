import { join } from "node:path";
import { readUtf8, writeUtf8, pathExists } from "../storage.ts";
import type { ProjectContext } from "../domain.ts";

export const HOOK_EVENTS = ["commit", "merge", "ci", "release"] as const;
export type HookEvent = (typeof HOOK_EVENTS)[number];

export interface HookConfig {
  version: 1;
  enabledEvents: HookEvent[];
}

export interface HookPlan {
  event: HookEvent;
  installed: boolean;
  actions: Array<{ command: string; reason: string; requiresHumanApproval?: boolean }>;
}

function configFile(rootDir: string): string {
  return join(rootDir, ".specpm", "hooks.json");
}

export function isHookEvent(value: string): value is HookEvent {
  return HOOK_EVENTS.includes(value as HookEvent);
}

export async function readHookConfig(rootDir: string): Promise<HookConfig> {
  const filePath = configFile(rootDir);
  if (!(await pathExists(filePath))) {
    return { version: 1, enabledEvents: [] };
  }

  const parsed = JSON.parse(await readUtf8(filePath)) as HookConfig;
  return {
    version: 1,
    enabledEvents: Array.isArray(parsed.enabledEvents) ? parsed.enabledEvents.filter(isHookEvent) : [],
  };
}

export async function installHookConfig(rootDir: string, events: HookEvent[]): Promise<{ filePath: string; config: HookConfig }> {
  const config = {
    version: 1 as const,
    enabledEvents: Array.from(new Set(events)).sort((left, right) => left.localeCompare(right)) as HookEvent[],
  };
  const filePath = configFile(rootDir);
  await writeUtf8(filePath, `${JSON.stringify(config, null, 2)}\n`);
  return { filePath, config };
}

export async function buildHookPlan(context: ProjectContext, event: HookEvent): Promise<HookPlan> {
  const config = await readHookConfig(context.rootDir);
  const installed = config.enabledEvents.includes(event);
  const actions: HookPlan["actions"] = [
    {
      command: "spm status",
      reason: "Inspect managed state before deciding whether current state, tasks, or handoffs need updates.",
    },
  ];

  if (event === "commit" || event === "merge") {
    actions.push({
      command: "spm handoff --title \"Post-change checkpoint\"",
      reason: "Capture a durable checkpoint when the change materially affects future resume context.",
      requiresHumanApproval: true,
    });
  }

  if (event === "ci") {
    actions.push({
      command: "spm doctor",
      reason: "Confirm managed memory is still parseable after automated verification.",
    });
  }

  if (event === "release") {
    actions.push({
      command: "spm release plan",
      reason: "Assemble release readiness and notes from repo-local managed state.",
    });
  }

  return { event, installed, actions };
}

export function renderHookPlan(plan: HookPlan): string {
  return [
    `Hook plan: ${plan.event}`,
    `Installed: ${plan.installed ? "yes" : "no"}`,
    "Actions:",
    ...plan.actions.map((action) => `- ${action.command}: ${action.reason}${action.requiresHumanApproval ? " Ask the human before running." : ""}`),
  ].join("\n");
}
