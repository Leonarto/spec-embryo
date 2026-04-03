import { rename, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { ProjectConfig } from "../domain.ts";
import { ensureDir, pathExists } from "../storage.ts";

export interface DocumentationHomeCandidate {
  relativePath: string;
  reason: "docs" | "specs";
}

export interface LayoutChoice {
  memoryDir: string;
  source: "explicit" | "standalone" | "adopted" | "configured" | "default";
  adoptedHome?: string;
  candidates: DocumentationHomeCandidate[];
  requiresChoice: boolean;
}

export type AdoptionState = "fresh" | "legacy-docs" | "partially-adopted" | "adopted";

export interface ManagedHomeInspection {
  memoryDir: string;
  hasCurrentState: boolean;
  hasHandoffsDir: boolean;
  hasSpecsDir: boolean;
  hasTasksDir: boolean;
  hasSkillsDir: boolean;
}

export interface AdoptionInspection {
  state: AdoptionState;
  layoutChoice: LayoutChoice;
  hasConfig: boolean;
  hasHiddenSpecpmDir: boolean;
  managedHomes: ManagedHomeInspection[];
  findings: string[];
}

export interface ReshapeAction {
  type: "move" | "mkdir" | "write-config" | "warn";
  source?: string;
  target?: string;
  message: string;
}

export interface ReshapePlan {
  targetMemoryDir: string;
  actions: ReshapeAction[];
  warnings: string[];
}

const DOCS_HOME_NAMES = new Map<string, "docs" | "specs">([
  ["docs", "docs"],
  ["documentation", "docs"],
  ["doc", "docs"],
  ["specs", "specs"],
  ["spec", "specs"],
  ["specifications", "specs"],
]);

export function normalizeManagedHomeInput(input: string): string {
  const normalized = input.replace(/\/+$/, "");
  return normalized === "spm" || normalized.endsWith("/spm") ? normalized : `${normalized}/spm`;
}

export function buildManagedPaths(memoryDir: string) {
  return {
    memoryDir,
    stateFile: `${memoryDir}/current.md`,
    handoffsDir: `${memoryDir}/handoffs`,
    specsDir: `${memoryDir}/specs`,
    tasksDir: `${memoryDir}/tasks`,
    skillsDir: `${memoryDir}/skills`,
  };
}

export function initSequenceDescription(memoryDir: string): string[] {
  const managed = buildManagedPaths(memoryDir);
  return [
    "Resolve the memory home by adopting a docs/specs surface when appropriate, otherwise fall back to `spm/`.",
    "Write `.specpm/config.toml` so the project has an explicit memory layout source of truth.",
    `Create the managed memory home at \`${managed.memoryDir}\`.`,
    `Create \`${managed.stateFile}\` and \`${managed.handoffsDir}\` for current-state and interrupted-work checkpoints.`,
    `Create \`${managed.specsDir}\`, \`${managed.tasksDir}\`, and \`${managed.skillsDir}\` for spec-first execution memory.`,
    "Seed templates and starter docs so the CLI is immediately useful.",
  ];
}

async function inspectManagedHome(rootDir: string, memoryDir: string): Promise<ManagedHomeInspection> {
  const managed = buildManagedPaths(memoryDir);
  return {
    memoryDir,
    hasCurrentState: await pathExists(join(rootDir, managed.stateFile)),
    hasHandoffsDir: await pathExists(join(rootDir, managed.handoffsDir)),
    hasSpecsDir: await pathExists(join(rootDir, managed.specsDir)),
    hasTasksDir: await pathExists(join(rootDir, managed.tasksDir)),
    hasSkillsDir: await pathExists(join(rootDir, managed.skillsDir)),
  };
}

function hasAnyManagedSignals(inspection: ManagedHomeInspection): boolean {
  return (
    inspection.hasCurrentState ||
    inspection.hasHandoffsDir ||
    inspection.hasSpecsDir ||
    inspection.hasTasksDir ||
    inspection.hasSkillsDir
  );
}

function isFullyManagedHome(inspection: ManagedHomeInspection): boolean {
  return inspection.hasCurrentState && inspection.hasHandoffsDir && inspection.hasSpecsDir && inspection.hasTasksDir && inspection.hasSkillsDir;
}

function describeManagedHome(inspection: ManagedHomeInspection): string {
  const present = [
    inspection.hasCurrentState ? "current" : undefined,
    inspection.hasHandoffsDir ? "handoffs" : undefined,
    inspection.hasSpecsDir ? "specs" : undefined,
    inspection.hasTasksDir ? "tasks" : undefined,
    inspection.hasSkillsDir ? "skills" : undefined,
  ].filter((value): value is string => Boolean(value));

  return `${inspection.memoryDir} (${present.length > 0 ? present.join(", ") : "no managed files yet"})`;
}

export async function findDocumentationHomeCandidates(rootDir: string): Promise<DocumentationHomeCandidate[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const reason = DOCS_HOME_NAMES.get(entry.name.toLowerCase());
      if (!reason) {
        return [];
      }

      return [
        {
          relativePath: entry.name,
          reason,
        },
      ];
    })
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export async function resolveLayoutChoice(
  rootDir: string,
  options?: {
    explicitHome?: string;
    standalone?: boolean;
    config?: ProjectConfig;
  },
): Promise<LayoutChoice> {
  const candidates = await findDocumentationHomeCandidates(rootDir);

  if (options?.config) {
    return {
      memoryDir: options.config.memoryDir,
      source: "configured",
      adoptedHome: dirname(options.config.memoryDir),
      candidates,
      requiresChoice: false,
    };
  }

  if (options?.explicitHome) {
    const memoryDir = normalizeManagedHomeInput(options.explicitHome);
    return {
      memoryDir,
      source: "explicit",
      adoptedHome: memoryDir === "spm" ? undefined : dirname(memoryDir),
      candidates,
      requiresChoice: false,
    };
  }

  if (options?.standalone) {
    return {
      memoryDir: "spm",
      source: "standalone",
      candidates,
      requiresChoice: false,
    };
  }

  if (candidates.length === 1) {
    return {
      memoryDir: `${candidates[0]!.relativePath}/spm`,
      source: "adopted",
      adoptedHome: candidates[0]!.relativePath,
      candidates,
      requiresChoice: false,
    };
  }

  if (candidates.length > 1) {
    return {
      memoryDir: "",
      source: "default",
      candidates,
      requiresChoice: true,
    };
  }

  return {
    memoryDir: "spm",
    source: "default",
    candidates,
    requiresChoice: false,
  };
}

export async function inspectAdoptionState(
  rootDir: string,
  options?: {
    explicitHome?: string;
    standalone?: boolean;
    config?: ProjectConfig;
  },
): Promise<AdoptionInspection> {
  const layoutChoice = await resolveLayoutChoice(rootDir, options);
  const hasHiddenSpecpmDir = await pathExists(join(rootDir, ".specpm"));
  const candidateMemoryDirs = new Set<string>();

  if (layoutChoice.memoryDir.length > 0) {
    candidateMemoryDirs.add(layoutChoice.memoryDir);
  }

  if (options?.config) {
    candidateMemoryDirs.add(options.config.memoryDir);
  }

  for (const candidate of layoutChoice.candidates) {
    candidateMemoryDirs.add(`${candidate.relativePath}/spm`);
  }

  candidateMemoryDirs.add("spm");
  candidateMemoryDirs.add("docs/spm");

  const managedHomes = (
    await Promise.all(Array.from(candidateMemoryDirs).sort((left, right) => left.localeCompare(right)).map((memoryDir) => inspectManagedHome(rootDir, memoryDir)))
  ).filter((inspection) => hasAnyManagedSignals(inspection));

  const findings: string[] = [];

  if (options?.config) {
    findings.push(`Existing config points to \`${options.config.memoryDir}\`.`);
  } else {
    findings.push("No existing Spec Embryo config found.");
  }

  if (layoutChoice.candidates.length > 0) {
    findings.push(
      `Detected documentation/spec surfaces: ${layoutChoice.candidates
        .map((candidate) => `\`${candidate.relativePath}\` (${candidate.reason})`)
        .join(", ")}.`,
    );
  } else {
    findings.push("No documentation/spec surfaces were detected automatically.");
  }

  if (managedHomes.length > 0) {
    findings.push(`Detected managed-memory signals at: ${managedHomes.map((inspection) => `\`${describeManagedHome(inspection)}\``).join(", ")}.`);
  } else {
    findings.push("No managed-memory files were detected yet.");
  }

  if (hasHiddenSpecpmDir && !options?.config) {
    findings.push("A `.specpm/` directory exists without a readable managed-memory config.");
  }

  let state: AdoptionState;
  if (options?.config) {
    const configuredHome = managedHomes.find((inspection) => inspection.memoryDir === options.config!.memoryDir);
    state = configuredHome && isFullyManagedHome(configuredHome) ? "adopted" : "partially-adopted";
  } else if (hasHiddenSpecpmDir || managedHomes.length > 0) {
    state = "partially-adopted";
  } else if (layoutChoice.candidates.length > 0) {
    state = "legacy-docs";
  } else {
    state = "fresh";
  }

  if (state === "partially-adopted") {
    findings.push("This repo already shows partial Spec Embryo signals, so init should preserve and complete the managed layout instead of treating it as fresh.");
  }

  if (state === "legacy-docs") {
    findings.push("This repo looks importable: guided init should attach Spec Embryo to a suitable docs home and then suggest import or migration steps.");
  }

  if (state === "fresh") {
    findings.push("This repo looks new to Spec Embryo, so init can seed the canonical layout directly.");
  }

  if (state === "adopted") {
    findings.push("This repo already has the canonical managed layout configured; init should preserve it and only seed missing optional artifacts.");
  }

  return {
    state,
    layoutChoice,
    hasConfig: Boolean(options?.config),
    hasHiddenSpecpmDir,
    managedHomes,
    findings,
  };
}

async function isSafeManagedSkillsMove(sourceDir: string): Promise<boolean> {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  return entries.every((entry) => entry.name === "README.md" || entry.name === "AGENTS.md");
}

export async function buildReshapePlan(
  rootDir: string,
  currentConfig: ProjectConfig,
  targetMemoryDir: string,
): Promise<ReshapePlan> {
  const target = buildManagedPaths(targetMemoryDir);
  const actions: ReshapeAction[] = [];
  const warnings: string[] = [];

  const absoluteTargetState = join(rootDir, target.stateFile);
  const absoluteTargetHandoffs = join(rootDir, target.handoffsDir);
  const absoluteTargetSpecs = join(rootDir, target.specsDir);
  const absoluteTargetTasks = join(rootDir, target.tasksDir);
  const absoluteTargetSkills = join(rootDir, target.skillsDir);

  const movePairs: Array<{ source: string; target: string; label: string; kind: "file" | "dir" }> = [
    { source: currentConfig.stateFile, target: target.stateFile, label: "current state", kind: "file" },
    { source: currentConfig.handoffsDir, target: target.handoffsDir, label: "handoffs", kind: "dir" },
    { source: currentConfig.specsDir, target: target.specsDir, label: "specs", kind: "dir" },
    { source: currentConfig.tasksDir, target: target.tasksDir, label: "tasks", kind: "dir" },
  ];

  for (const pair of movePairs) {
    if (pair.source === pair.target) {
      continue;
    }

    const absoluteSource = join(rootDir, pair.source);
    const absoluteTarget = join(rootDir, pair.target);

    if (await pathExists(absoluteSource)) {
      actions.push({
        type: "move",
        source: absoluteSource,
        target: absoluteTarget,
        message: `Move ${pair.label} from \`${pair.source}\` to \`${pair.target}\`.`,
      });
    }
  }

  if (currentConfig.skillsDir !== target.skillsDir) {
    const absoluteSourceSkills = join(rootDir, currentConfig.skillsDir);
    if (await pathExists(absoluteSourceSkills)) {
      if (await isSafeManagedSkillsMove(absoluteSourceSkills)) {
        actions.push({
          type: "move",
          source: absoluteSourceSkills,
          target: absoluteTargetSkills,
          message: `Move managed skills from \`${currentConfig.skillsDir}\` to \`${target.skillsDir}\`.`,
        });
      } else {
        const warning = `Skipped moving \`${currentConfig.skillsDir}\` automatically because it contains non-managed skill content.`;
        warnings.push(warning);
        actions.push({
          type: "warn",
          source: absoluteSourceSkills,
          message: warning,
        });
      }
    }
  }

  for (const targetDir of [targetMemoryDir, target.handoffsDir, target.specsDir, target.tasksDir, target.skillsDir]) {
    const absolute = join(rootDir, targetDir);
    if (!(await pathExists(absolute))) {
      actions.push({
        type: "mkdir",
        target: absolute,
        message: `Create \`${targetDir}\`.`,
      });
    }
  }

  actions.push({
    type: "write-config",
    target: join(rootDir, ".specpm", "config.toml"),
    message: `Rewrite config to point at \`${targetMemoryDir}\`.`,
  });

  void absoluteTargetState;
  void absoluteTargetHandoffs;
  void absoluteTargetSpecs;
  void absoluteTargetTasks;

  return {
    targetMemoryDir,
    actions,
    warnings,
  };
}

export async function applyReshapePlan(plan: ReshapePlan): Promise<void> {
  for (const action of plan.actions) {
    if (action.type === "mkdir" && action.target) {
      await ensureDir(action.target);
    }

    if (action.type === "move" && action.source && action.target) {
      await ensureDir(dirname(action.target));
      if (!(await pathExists(action.target))) {
        await rename(action.source, action.target);
      }
    }
  }
}
