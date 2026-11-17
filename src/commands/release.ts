import type { ParsedArgs } from "../cli.ts";
import { hasFlag } from "../cli.ts";
import { loadProjectContext } from "../repository.ts";
import { buildReleasePlan, renderReleasePlan } from "../services/release.ts";

export async function runReleaseCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const subcommand = parsed.subcommand ?? "plan";
  if (subcommand !== "plan" && subcommand !== "notes" && subcommand !== "recommend") {
    throw new Error("Supported release commands are `release plan`, `release notes`, and `release recommend`.");
  }

  const plan = buildReleasePlan(await loadProjectContext(rootDir));

  if (hasFlag(parsed, "json")) {
    return JSON.stringify(plan, null, 2);
  }

  if (subcommand === "recommend") {
    return `Recommended bump: ${plan.recommendation}\nReasons:\n${plan.reasons.map((reason) => `- ${reason}`).join("\n")}`;
  }

  if (subcommand === "notes") {
    return ["Release notes candidates:", ...(plan.notes.length > 0 ? plan.notes.map((note) => `- ${note}`) : ["- No completed managed work found."])].join("\n");
  }

  return renderReleasePlan(plan);
}
