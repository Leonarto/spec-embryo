import type { ParsedArgs } from "../cli.ts";
import { flagValue } from "../cli.ts";
import { getProjectProfile, getProjectProfiles, isProjectProfileName } from "../services/profiles.ts";

export async function runProfileCommand(_rootDir: string, parsed: ParsedArgs): Promise<string> {
  const subcommand = parsed.subcommand ?? "list";

  if (subcommand === "show") {
    const name = flagValue(parsed, "name") ?? parsed.positionals[2];
    if (!name || !isProjectProfileName(name)) {
      throw new Error("`profile show` requires one of: library, service, frontend-app, infra.");
    }

    const profile = getProjectProfile(name);
    if (parsed.flags.has("json")) {
      return JSON.stringify(profile, null, 2);
    }

    return [
      `${profile.name}: ${profile.label}`,
      profile.summary,
      `Default tags: ${profile.defaultTags.join(", ")}`,
      `Starter focus: ${profile.starterFocus}`,
      "Guidance:",
      ...profile.guidance.map((line) => `- ${line}`),
    ].join("\n");
  }

  if (subcommand !== "list") {
    throw new Error("Supported profile commands are `profile list` and `profile show`.");
  }

  const profiles = getProjectProfiles();
  if (parsed.flags.has("json")) {
    return JSON.stringify(profiles, null, 2);
  }

  return profiles.map((profile) => `${profile.name}: ${profile.summary}`).join("\n");
}
