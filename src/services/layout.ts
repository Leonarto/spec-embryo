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
