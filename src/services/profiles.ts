import { join } from "node:path";
import { readUtf8, writeUtf8, pathExists } from "../storage.ts";

export const PROJECT_PROFILE_NAMES = ["library", "service", "frontend-app", "infra"] as const;
export type ProjectProfileName = (typeof PROJECT_PROFILE_NAMES)[number];

export interface ProjectProfile {
  name: ProjectProfileName;
  label: string;
  summary: string;
  defaultTags: string[];
  starterFocus: string;
  guidance: string[];
}

export interface ProjectProfileManifest {
  version: 1;
  profile: ProjectProfileName;
  label: string;
  defaultTags: string[];
  guidance: string[];
}

const PROFILES: Record<ProjectProfileName, ProjectProfile> = {
  library: {
    name: "library",
    label: "Library",
    summary: "Reusable package, SDK, CLI, or shared module with release and compatibility pressure.",
    defaultTags: ["library", "api", "release"],
    starterFocus: "Track public API changes, compatibility risk, and release readiness.",
    guidance: [
      "Prefer specs that distinguish public API changes from internal refactors.",
      "Capture compatibility and release-note impact on tasks that touch exported behavior.",
      "Use release planning before publishing package versions.",
    ],
  },
  service: {
    name: "service",
    label: "Service",
    summary: "Backend or worker service where runtime health, migrations, and integrations matter.",
    defaultTags: ["service", "runtime", "ops"],
    starterFocus: "Track service behavior, operational risk, and integration boundaries.",
    guidance: [
      "Capture data migrations, external integrations, and deployment checks explicitly.",
      "Keep operational risks visible in current state and handoffs.",
      "Prefer tasks that include verification against service behavior, not only code shape.",
    ],
  },
  "frontend-app": {
    name: "frontend-app",
    label: "Frontend App",
    summary: "User-facing web or desktop application where flows, UI state, and visual verification matter.",
    defaultTags: ["frontend", "ux", "visual"],
    starterFocus: "Track user flows, UI state, and visual verification requirements.",
    guidance: [
      "Capture user-facing workflows and visual states in specs before implementation.",
      "Keep browser or visual verification steps explicit on UI tasks.",
      "Separate design-system constraints from one-off screen implementation details.",
    ],
  },
  infra: {
    name: "infra",
    label: "Infrastructure",
    summary: "Infrastructure, deployment, or platform repo where safety and rollout sequencing dominate.",
    defaultTags: ["infra", "deployment", "safety"],
    starterFocus: "Track rollout order, rollback options, and environment-specific risk.",
    guidance: [
      "Capture rollout and rollback plans explicitly before applying infrastructure changes.",
      "Use tasks to separate planning, dry-run verification, apply, and post-apply checks.",
      "Keep environment assumptions visible in current state and handoffs.",
    ],
  },
};

export function isProjectProfileName(value: string): value is ProjectProfileName {
  return PROJECT_PROFILE_NAMES.includes(value as ProjectProfileName);
}

export function getProjectProfiles(): ProjectProfile[] {
  return PROJECT_PROFILE_NAMES.map((name) => PROFILES[name]);
}

export function getProjectProfile(name: ProjectProfileName): ProjectProfile {
  return PROFILES[name];
}

export function createProjectProfileManifest(profile: ProjectProfile): ProjectProfileManifest {
  return {
    version: 1,
    profile: profile.name,
    label: profile.label,
    defaultTags: profile.defaultTags,
    guidance: profile.guidance,
  };
}

export async function writeProjectProfileManifest(rootDir: string, profile: ProjectProfile): Promise<string> {
  const filePath = join(rootDir, ".specpm", "profile.json");
  await writeUtf8(filePath, `${JSON.stringify(createProjectProfileManifest(profile), null, 2)}\n`);
  return filePath;
}

export async function readProjectProfileManifest(rootDir: string): Promise<ProjectProfileManifest | undefined> {
  const filePath = join(rootDir, ".specpm", "profile.json");
  if (!(await pathExists(filePath))) {
    return undefined;
  }

  const parsed = JSON.parse(await readUtf8(filePath)) as ProjectProfileManifest;
  return parsed.version === 1 && isProjectProfileName(parsed.profile) ? parsed : undefined;
}
