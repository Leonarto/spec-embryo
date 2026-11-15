import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathExists } from "../storage.ts";
import { loadProjectContext } from "../repository.ts";
import { deriveStatusSnapshot } from "../engine.ts";

export interface PortfolioProjectRecord {
  id: string;
  path: string;
  name?: string;
  tags: string[];
  dependsOn: string[];
  relatedProjects: string[];
  milestones: string[];
}

export interface PortfolioRegistry {
  version: 1;
  projects: PortfolioProjectRecord[];
}

export interface PortfolioProjectStatus {
  id: string;
  name: string;
  path: string;
  available: boolean;
  health: "ok" | "unavailable" | "invalid";
  focus?: string;
  summary?: string;
  activeSpecIds: string[];
  activeTaskIds: string[];
  reviewTaskIds: string[];
  blockedTaskIds: string[];
  readyTaskIds: string[];
  git?: {
    available: boolean;
    branch?: string;
    dirty: boolean;
    lastCommit?: string;
  };
  error?: string;
  tags: string[];
  dependsOn: string[];
  relatedProjects: string[];
  milestones: string[];
}

export interface PortfolioRelationshipIssue {
  projectId: string;
  targetId: string;
  kind: "depends-on" | "related-project";
  message: string;
}

export interface PortfolioStatusBundle {
  registryFile: string;
  projects: PortfolioProjectStatus[];
  relationshipIssues: PortfolioRelationshipIssue[];
}

export interface PortfolioSearchResult extends PortfolioProjectStatus {
  reasons: string[];
}

function defaultRegistryFile(): string {
  return resolve(homedir(), ".spec-embryo", "portfolio.json");
}

export function resolvePortfolioRegistryFile(filePath?: string): string {
  return filePath ? resolve(filePath) : defaultRegistryFile();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-{2,}/g, "-");
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}

function normalizeRecord(record: Partial<PortfolioProjectRecord>): PortfolioProjectRecord {
  const absolutePath = resolve(String(record.path ?? "."));
  const fallbackId = slugify(record.name ?? absolutePath.split("/").filter(Boolean).at(-1) ?? "project") || "project";
  return {
    id: String(record.id ?? fallbackId).trim(),
    path: absolutePath,
    name: typeof record.name === "string" && record.name.trim().length > 0 ? record.name.trim() : undefined,
    tags: uniqueStrings(Array.isArray(record.tags) ? record.tags.filter((item): item is string => typeof item === "string") : []),
    dependsOn: uniqueStrings(Array.isArray(record.dependsOn) ? record.dependsOn.filter((item): item is string => typeof item === "string") : []),
    relatedProjects: uniqueStrings(
      Array.isArray(record.relatedProjects) ? record.relatedProjects.filter((item): item is string => typeof item === "string") : [],
    ),
    milestones: uniqueStrings(Array.isArray(record.milestones) ? record.milestones.filter((item): item is string => typeof item === "string") : []),
  };
}

export async function loadPortfolioRegistry(registryFile?: string): Promise<PortfolioRegistry> {
  const filePath = resolvePortfolioRegistryFile(registryFile);
  if (!(await pathExists(filePath))) {
    return { version: 1, projects: [] };
  }

  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<PortfolioRegistry>;
  const projects = Array.isArray(parsed.projects) ? parsed.projects.map((record) => normalizeRecord(record)) : [];
  return { version: 1, projects: projects.sort((left, right) => left.id.localeCompare(right.id)) };
}

export async function savePortfolioRegistry(registry: PortfolioRegistry, registryFile?: string): Promise<string> {
  const filePath = resolvePortfolioRegistryFile(registryFile);
  await mkdir(dirname(filePath), { recursive: true });
  const normalized: PortfolioRegistry = {
    version: 1,
    projects: registry.projects.map((record) => normalizeRecord(record)).sort((left, right) => left.id.localeCompare(right.id)),
  };
  await writeFile(filePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return filePath;
}

export async function registerPortfolioProject(
  projectPath: string,
  options: {
    registryFile?: string;
    id?: string;
    name?: string;
    tags?: string[];
  } = {},
): Promise<{ registryFile: string; project: PortfolioProjectRecord; created: boolean }> {
  const registry = await loadPortfolioRegistry(options.registryFile);
  const project = normalizeRecord({
    id: options.id,
    path: projectPath,
    name: options.name,
    tags: options.tags ?? [],
  });
  const existingIndex = registry.projects.findIndex((record) => record.id === project.id || record.path === project.path);
  const created = existingIndex === -1;

  if (created) {
    registry.projects.push(project);
  } else {
    const existing = registry.projects[existingIndex]!;
    registry.projects[existingIndex] = normalizeRecord({
      ...existing,
      ...project,
      dependsOn: existing.dependsOn,
      relatedProjects: existing.relatedProjects,
      milestones: existing.milestones,
      tags: uniqueStrings([...existing.tags, ...project.tags]),
    });
  }

  const registryFile = await savePortfolioRegistry(registry, options.registryFile);
  return { registryFile, project: registry.projects.find((record) => record.id === project.id || record.path === project.path) ?? project, created };
}

export async function linkPortfolioProject(
  projectId: string,
  options: {
    registryFile?: string;
    dependsOn?: string[];
    relatedProjects?: string[];
    milestones?: string[];
  },
): Promise<{ registryFile: string; project: PortfolioProjectRecord }> {
  const registry = await loadPortfolioRegistry(options.registryFile);
  const index = registry.projects.findIndex((record) => record.id === projectId);
  if (index === -1) {
    throw new Error(`Portfolio project not found: ${projectId}`);
  }

  const project = registry.projects[index]!;
  registry.projects[index] = normalizeRecord({
    ...project,
    dependsOn: uniqueStrings([...project.dependsOn, ...(options.dependsOn ?? [])]),
    relatedProjects: uniqueStrings([...project.relatedProjects, ...(options.relatedProjects ?? [])]),
    milestones: uniqueStrings([...project.milestones, ...(options.milestones ?? [])]),
  });

  const registryFile = await savePortfolioRegistry(registry, options.registryFile);
  return { registryFile, project: registry.projects[index]! };
}

function relationshipIssues(projects: PortfolioProjectRecord[]): PortfolioRelationshipIssue[] {
  const knownIds = new Set(projects.map((project) => project.id));
  const byId = new Map(projects.map((project) => [project.id, project]));
  const issues: PortfolioRelationshipIssue[] = [];
  const cycleKeys = new Set<string>();

  for (const project of projects) {
    for (const targetId of project.dependsOn) {
      if (!knownIds.has(targetId)) {
        issues.push({
          projectId: project.id,
          targetId,
          kind: "depends-on",
          message: `${project.id} depends on unknown project ${targetId}`,
        });
      }
    }
    for (const targetId of project.relatedProjects) {
      if (!knownIds.has(targetId)) {
        issues.push({
          projectId: project.id,
          targetId,
          kind: "related-project",
          message: `${project.id} references unknown related project ${targetId}`,
        });
      }
    }
  }

  const canonicalCycleKey = (cycle: string[]): string => {
    const nodes = cycle.slice(0, -1);
    const rotations = nodes.map((_, index) => [...nodes.slice(index), ...nodes.slice(0, index)].join(" -> "));
    return rotations.sort((left, right) => left.localeCompare(right))[0] ?? cycle.join(" -> ");
  };

  const addCycle = (cycle: string[]): void => {
    const key = canonicalCycleKey(cycle);
    if (cycleKeys.has(key)) {
      return;
    }

    cycleKeys.add(key);
    issues.push({
      projectId: cycle[0] ?? "",
      targetId: cycle[1] ?? cycle[0] ?? "",
      kind: "depends-on",
      message: `Dependency cycle detected: ${cycle.join(" -> ")}`,
    });
  };

  const visit = (projectId: string, path: string[]): void => {
    const project = byId.get(projectId);
    if (!project) {
      return;
    }

    for (const targetId of project.dependsOn) {
      if (!knownIds.has(targetId)) {
        continue;
      }

      const existingIndex = path.indexOf(targetId);
      if (existingIndex !== -1) {
        addCycle([...path.slice(existingIndex), targetId]);
        continue;
      }

      visit(targetId, [...path, targetId]);
    }
  };

  for (const project of projects) {
    visit(project.id, [project.id]);
  }

  return issues;
}

async function buildProjectStatus(project: PortfolioProjectRecord): Promise<PortfolioProjectStatus> {
  if (!(await pathExists(project.path))) {
    return {
      id: project.id,
      name: project.name ?? project.id,
      path: project.path,
      available: false,
      health: "unavailable",
      activeSpecIds: [],
      activeTaskIds: [],
      reviewTaskIds: [],
      blockedTaskIds: [],
      readyTaskIds: [],
      error: "Project path does not exist.",
      tags: project.tags,
      dependsOn: project.dependsOn,
      relatedProjects: project.relatedProjects,
      milestones: project.milestones,
    };
  }

  try {
    const context = await loadProjectContext(project.path);
    const snapshot = deriveStatusSnapshot(context);
    return {
      id: project.id,
      name: project.name ?? context.config.projectName,
      path: project.path,
      available: true,
      health: "ok",
      focus: context.currentState.focus,
      summary: context.currentState.summary,
      activeSpecIds: snapshot.activeSpecIds,
      activeTaskIds: snapshot.activeTaskIds,
      reviewTaskIds: snapshot.reviewTasks.map((entry) => entry.task.id),
      blockedTaskIds: snapshot.blockedTasks.map((entry) => entry.task.id),
      readyTaskIds: snapshot.readyTasks.map((entry) => entry.task.id),
      git: {
        available: context.git.available,
        branch: context.git.branch,
        dirty: context.git.dirty,
        lastCommit: context.git.lastCommit,
      },
      tags: project.tags,
      dependsOn: project.dependsOn,
      relatedProjects: project.relatedProjects,
      milestones: project.milestones,
    };
  } catch (error) {
    return {
      id: project.id,
      name: project.name ?? project.id,
      path: project.path,
      available: true,
      health: "invalid",
      activeSpecIds: [],
      activeTaskIds: [],
      reviewTaskIds: [],
      blockedTaskIds: [],
      readyTaskIds: [],
      error: error instanceof Error ? error.message : String(error),
      tags: project.tags,
      dependsOn: project.dependsOn,
      relatedProjects: project.relatedProjects,
      milestones: project.milestones,
    };
  }
}

export async function buildPortfolioStatus(registryFile?: string): Promise<PortfolioStatusBundle> {
  const registry = await loadPortfolioRegistry(registryFile);
  return {
    registryFile: resolvePortfolioRegistryFile(registryFile),
    projects: await Promise.all(registry.projects.map((project) => buildProjectStatus(project))),
    relationshipIssues: relationshipIssues(registry.projects),
  };
}

function matchReasons(project: PortfolioProjectStatus, query: string): string[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return [];
  }

  const fields: Array<[string, string | undefined]> = [
    ["id", project.id],
    ["name", project.name],
    ["path", project.path],
    ["focus", project.focus],
    ["summary", project.summary],
    ["tags", project.tags.join(" ")],
    ["milestones", project.milestones.join(" ")],
    ["active-specs", project.activeSpecIds.join(" ")],
    ["active-tasks", project.activeTaskIds.join(" ")],
  ];

  return fields
    .filter(([, value]) => value?.toLowerCase().includes(normalized))
    .map(([field]) => field);
}

export async function searchPortfolio(query: string, registryFile?: string): Promise<{ registryFile: string; results: PortfolioSearchResult[] }> {
  const bundle = await buildPortfolioStatus(registryFile);
  const results = bundle.projects
    .map((project) => ({ ...project, reasons: matchReasons(project, query) }))
    .filter((project) => project.reasons.length > 0);
  return { registryFile: bundle.registryFile, results };
}
