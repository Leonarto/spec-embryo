import { homedir } from "node:os";
import { dirname, resolve, isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, realpath, stat, lstat, open, rename, unlink } from "node:fs/promises";
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

const MAX_BYTES = 1024 * 1024, MAX_PROJECTS = 1000, MAX_TEXT = 4096, MAX_ITEMS = 256;
function boundedText(value: unknown, field: string, optional = false): void {
  if (optional && value === undefined) return;
  if (typeof value !== "string" || !value.trim() || value.length > MAX_TEXT || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`Invalid portfolio ${field}.`);
}
async function canonicalPath(path: string): Promise<string> { try { return await realpath(path); } catch { return resolve(path); } }
export async function validatePortfolioProjectPath(path: string): Promise<string> {
  const root = await realpath(path);
  if (!(await stat(root)).isDirectory() || !(await lstat(resolve(root, ".specpm/config.toml"))).isFile()) throw new Error("Project must be an existing directory containing .specpm/config.toml.");
  return root;
}
export async function loadPortfolioRegistry(registryFile?: string): Promise<PortfolioRegistry> {
  const filePath = resolvePortfolioRegistryFile(registryFile);
  let handle;
  try { handle = await open(filePath, "r"); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return {version:1,projects:[]}; throw error; }
  let raw: string;
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > MAX_BYTES) throw new Error("Portfolio registry is not a bounded regular file.");
    const bytes = Buffer.alloc(MAX_BYTES + 1); const {bytesRead} = await handle.read(bytes,0,bytes.length,0);
    if (bytesRead > MAX_BYTES) throw new Error("Portfolio registry exceeds size limit.");
    raw = bytes.subarray(0,bytesRead).toString("utf8");
  } finally { await handle.close(); }
  let parsed: unknown; try { parsed = JSON.parse(raw); } catch { throw new Error("Portfolio registry is invalid JSON."); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error("Invalid portfolio registry.");
  const value = parsed as Record<string,unknown>;
  if (value.version !== 1 || !Array.isArray(value.projects) || value.projects.length > MAX_PROJECTS) throw new Error("Invalid portfolio registry version or projects.");
  const ids = new Set<string>(), paths = new Set<string>(); const projects:PortfolioProjectRecord[]=[];
  for (const entry of value.projects) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error("Invalid portfolio project.");
    const row=entry as Record<string,unknown>; boundedText(row.id,"id"); boundedText(row.path,"path"); boundedText(row.name,"name",true);
    if (!isAbsolute(row.path as string) || (row.id as string).trim() !== row.id) throw new Error("Invalid portfolio identity or path.");
    for (const field of ["tags","dependsOn","relatedProjects","milestones"]) {
      if (!Array.isArray(row[field]) || (row[field] as unknown[]).length > MAX_ITEMS) throw new Error(`Invalid portfolio ${field}.`);
      for (const item of row[field] as unknown[]) boundedText(item,field);
    }
    const project=normalizeRecord(row as unknown as PortfolioProjectRecord), canonical=await canonicalPath(project.path);
    if(ids.has(project.id)||paths.has(canonical)) throw new Error("Duplicate portfolio project identity or path.");
    ids.add(project.id); paths.add(canonical); projects.push(project);
  }
  return {version:1,projects:projects.sort((a,b)=>a.id.localeCompare(b.id))};
}
async function writeRegistry(registry: PortfolioRegistry, filePath: string): Promise<void> {
  const content = `${JSON.stringify(registry, null, 2)}\n`;
  if (Buffer.byteLength(content) > MAX_BYTES || registry.projects.length > MAX_PROJECTS) throw new Error("Portfolio registry exceeds size limit.");
  const temporary = `${filePath}.${randomUUID()}.tmp`;
  try { await writeFile(temporary,content,{flag:"wx",mode:0o600}); await loadPortfolioRegistry(temporary); await rename(temporary,filePath); }
  finally { await unlink(temporary).catch(()=>{}); }
}
async function mutateRegistry<T>(registryFile:string|undefined, work:(registry:PortfolioRegistry)=>Promise<T>):Promise<{result:T;filePath:string}> {
  const filePath=resolvePortfolioRegistryFile(registryFile), lock=`${filePath}.lock`; await mkdir(dirname(filePath),{recursive:true});
  let handle; const deadline=Date.now()+5000;
  while (!handle) { try { handle=await open(lock,"wx",0o600); } catch(error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; if(Date.now()>=deadline) throw new Error("Timed out waiting for portfolio registry lock."); await new Promise(r=>setTimeout(r,25)); } }
  try {
    const owned=await handle.stat(), registry=await loadPortfolioRegistry(filePath), result=await work(registry);
    const current=await stat(lock); if(current.dev!==owned.dev||current.ino!==owned.ino) throw new Error("Portfolio lock ownership was lost.");
    await writeRegistry(registry,filePath); return {result,filePath};
  } finally { const owned=await handle.stat(); await handle.close(); try { const current=await stat(lock); if(current.dev===owned.dev&&current.ino===owned.ino) await unlink(lock); } catch {} }
}
export async function savePortfolioRegistry(registry: PortfolioRegistry, registryFile?: string): Promise<string> {
  const {filePath}=await mutateRegistry(registryFile,async target=>{target.version=registry.version;target.projects=registry.projects;}); return filePath;
}
export async function registerPortfolioProject(projectPath:string, options:{registryFile?:string;id?:string;name?:string;tags?:string[]}={}):Promise<{registryFile:string;project:PortfolioProjectRecord;created:boolean}> {
  const path=await validatePortfolioProjectPath(projectPath);
  boundedText(path,"path"); boundedText(options.id,"id",true); boundedText(options.name,"name",true);
  if(options.id!==undefined && options.id.trim()!==options.id) throw new Error("Invalid portfolio id.");
  if ((options.tags?.length??0)>MAX_ITEMS) throw new Error("Too many tags."); for(const tag of options.tags??[]) boundedText(tag,"tag");
  const {result,filePath}=await mutateRegistry(options.registryFile,async registry=>{
    const byPath=await Promise.all(registry.projects.map(async row=>(await canonicalPath(row.path))===path));
    const index=byPath.findIndex(Boolean), id=options.id??(index>=0?registry.projects[index]!.id:slugify(options.name??path.split("/").filter(Boolean).at(-1)??"project")||"project");
    const idIndex=registry.projects.findIndex(row=>row.id===id);
    if((index>=0&&idIndex>=0&&index!==idIndex)||(index>=0&&registry.projects[index]!.id!==id)||(idIndex>=0&&index!==idIndex)) throw new Error("Portfolio project ID or path conflicts with an existing project.");
    const created=index<0; const existing=created?undefined:registry.projects[index]!;
    const project=normalizeRecord({...existing,id,path,name:options.name??existing?.name,tags:uniqueStrings([...(existing?.tags??[]),...(options.tags??[])]),dependsOn:existing?.dependsOn??[],relatedProjects:existing?.relatedProjects??[],milestones:existing?.milestones??[]});
    if(project.tags.length>MAX_ITEMS) throw new Error("Too many tags.");
    if(created) registry.projects.push(project); else registry.projects[index]=project;
    registry.projects.sort((a,b)=>a.id.localeCompare(b.id)); return {project,created};
  }); return {registryFile:filePath,...result};
}
export async function linkPortfolioProject(projectId:string, options:{registryFile?:string;dependsOn?:string[];relatedProjects?:string[];milestones?:string[]}):Promise<{registryFile:string;project:PortfolioProjectRecord}> {
  for(const values of [options.dependsOn,options.relatedProjects,options.milestones]) { if((values?.length??0)>MAX_ITEMS) throw new Error("Too many portfolio links."); for(const value of values??[]) boundedText(value,"link"); }
  const {result:project,filePath}=await mutateRegistry(options.registryFile,async registry=>{
    const index=registry.projects.findIndex(row=>row.id===projectId); if(index<0) throw new Error(`Portfolio project not found: ${projectId}`);
    const old=registry.projects[index]!; const next=normalizeRecord({...old,dependsOn:uniqueStrings([...old.dependsOn,...options.dependsOn??[]]),relatedProjects:uniqueStrings([...old.relatedProjects,...options.relatedProjects??[]]),milestones:uniqueStrings([...old.milestones,...options.milestones??[]])});
    if([next.dependsOn,next.relatedProjects,next.milestones].some(a=>a.length>MAX_ITEMS)) throw new Error("Too many portfolio links."); registry.projects[index]=next; return next;
  }); return {registryFile:filePath,project};
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
