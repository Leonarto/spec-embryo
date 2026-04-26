import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parse as parseToml } from "smol-toml";
import type {
  CurrentStateDocument,
  GitSnapshot,
  HandoffDocument,
  MemoryNoteDocument,
  MemoryScopeName,
  MemoryScopeWritePolicy,
  ProjectConfig,
  ProjectContext,
  SpecDocument,
  SpecStatus,
  TaskDocument,
  TaskStatus,
} from "./domain.ts";
import {
  parseCurrentStateDocument,
  parseHandoffDocument,
  parseMemoryNoteDocument,
  parseProjectConfig,
  parseSpecDocument,
  parseTaskDocument,
} from "./domain.ts";
import { parseTomlFrontmatter, serializeTomlFrontmatter } from "./frontmatter.ts";
import { resolveProjectPaths } from "./paths.ts";
import { ensureDir, listMarkdownFiles, pathExists, readUtf8, withLock, writeUtf8 } from "./storage.ts";
import { applyReshapePlan, buildReshapePlan, initSequenceDescription, resolveLayoutChoice } from "./services/layout.ts";
import { applySpecAnswers, type SpecAnswerInput } from "./services/spec-questions.ts";
import { buildAdoptionArtifactPaths } from "./services/adoption.ts";
import {
  createConfigToml,
  createCurrentStateTemplate,
  createSeedCurrentStateTemplate,
  createSeedSpecTemplate,
  createSeedTaskTemplates,
  createSkillsReadme,
  createTemplateFiles,
  inferProjectName,
} from "./templates.ts";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-{2,}/g, "-");
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function nextNumericId(existingIds: string[], prefix: "SPEC" | "TASK"): string {
  const max = existingIds.reduce((highest, id) => {
    const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) {
      return highest;
    }

    return Math.max(highest, Number.parseInt(match[1]!, 10));
  }, 0);

  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function nextScopedMemoryNoteId(existingIds: string[], scope: "session" | "org"): string {
  const prefix = scope === "session" ? "NOTE-SESSION" : "NOTE-ORG";
  const max = existingIds.reduce((highest, id) => {
    const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) {
      return highest;
    }

    return Math.max(highest, Number.parseInt(match[1]!, 10));
  }, 0);

  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

async function withDocumentCreateLock<T>(rootDir: string, work: () => Promise<T>): Promise<T> {
  const paths = resolveProjectPaths(rootDir);
  return withLock(join(paths.specpmDir, "locks", "document-create.lock"), work);
}

function assertKnownIds(kind: "Spec" | "Task", provided: string[], existing: string[]): void {
  const known = new Set(existing);
  for (const id of provided) {
    if (!known.has(id)) {
      throw new Error(`${kind} not found: ${id}`);
    }
  }
}

function serializeCurrentStateDocument(currentState: CurrentStateDocument, updatedAt: string): string {
  return serializeTomlFrontmatter(
    {
      doc_kind: currentState.docKind,
      id: currentState.id,
      title: currentState.title,
      summary: currentState.summary,
      focus: currentState.focus,
      active_spec_ids: currentState.activeSpecIds,
      active_task_ids: currentState.activeTaskIds,
      blocked_task_ids: currentState.blockedTaskIds,
      next_action_hints: currentState.nextActionHints,
      last_handoff_id: currentState.lastHandoffId,
      updated_at: updatedAt,
      tags: currentState.tags,
    },
    currentState.body,
  );
}

function git(rootDir: string, args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return "";
  }

  return result.stdout.trimEnd();
}

async function loadMarkdownDocument<T>(
  filePath: string,
  parser: (filePath: string, attributes: unknown, body: string) => T,
): Promise<T> {
  const raw = await readUtf8(filePath);
  const { attributes, body } = parseTomlFrontmatter(raw);
  return parser(filePath, attributes, body);
}

async function loadMarkdownCollection<T>(
  dirPath: string,
  parser: (filePath: string, attributes: unknown, body: string) => T,
): Promise<T[]> {
  const files = await listMarkdownFiles(dirPath);
  return Promise.all(files.map((filePath) => loadMarkdownDocument(filePath, parser)));
}

async function loadScopedMemoryNotes(
  dirPath: string,
  scope: "session" | "org",
  writePolicy: MemoryScopeWritePolicy,
): Promise<MemoryNoteDocument[]> {
  const notes = await loadMarkdownCollection<MemoryNoteDocument>(
    dirPath,
    (filePath, attributes, body) => parseMemoryNoteDocument(filePath, attributes, body, scope, writePolicy),
  );
  return notes.sort((left, right) => left.id.localeCompare(right.id));
}

function allMemoryNotes(context: ProjectContext): MemoryNoteDocument[] {
  return [...context.sessionNotes, ...context.orgNotes];
}

function memoryScopeDir(paths: ReturnType<typeof resolveProjectPaths>, scope: Exclude<MemoryScopeName, "repo">): string {
  return scope === "session" ? paths.sessionMemoryDir : paths.orgMemoryDir;
}

function serializeSpecDocument(spec: SpecDocument, updatedAt: string): string {
  return serializeTomlFrontmatter(
    {
      doc_kind: spec.docKind,
      id: spec.id,
      title: spec.title,
      summary: spec.summary,
      status: spec.status,
      task_ids: spec.taskIds,
      tags: spec.tags,
      owner: spec.owner,
      updated_at: updatedAt,
    },
    spec.body,
  );
}

function serializeTaskDocument(task: TaskDocument, updatedAt: string): string {
  return serializeTomlFrontmatter(
    {
      doc_kind: task.docKind,
      id: task.id,
      title: task.title,
      summary: task.summary,
      status: task.status,
      spec_ids: task.specIds,
      depends_on: task.dependsOn,
      blocked_by: task.blockedBy,
      priority: task.priority,
      owner_role: task.ownerRole,
      created_at: task.createdAt,
      completed_at: task.completedAt,
      cancelled_at: task.cancelledAt,
      archived_at: task.archivedAt,
      archive_reason: task.archiveReason,
      tags: task.tags,
      updated_at: updatedAt,
    },
    task.body,
  );
}

function serializeMemoryNoteDocument(note: MemoryNoteDocument, updatedAt: string): string {
  return serializeTomlFrontmatter(
    {
      doc_kind: note.docKind,
      id: note.id,
      title: note.title,
      summary: note.summary,
      created_at: note.createdAt,
      expires_at: note.expiresAt,
      consolidated_at: note.consolidatedAt,
      promoted_to: note.promotedTo,
      archived_at: note.archivedAt,
      archive_reason: note.archiveReason,
      tags: note.tags,
      updated_at: updatedAt,
    },
    note.body,
  );
}

function memoryScopeConfigForWrite(
  config: ProjectConfig,
  scope: Exclude<MemoryScopeName, "repo">,
): ProjectConfig["memoryScopes"]["session"] | ProjectConfig["memoryScopes"]["org"] {
  return scope === "session" ? config.memoryScopes.session : config.memoryScopes.org;
}

function assertMemoryScopeEnabledAndWritable(
  config: ProjectConfig,
  scope: Exclude<MemoryScopeName, "repo">,
): void {
  const scopeConfig = memoryScopeConfigForWrite(config, scope);
  if (!scopeConfig.enabled) {
    throw new Error(`Memory scope is disabled: ${scope}`);
  }

  if (scopeConfig.writePolicy !== "read-write") {
    throw new Error(`Memory scope is read-only under current config: ${scope}`);
  }
}

function buildCreatedSpecBody(input: { title: string }): string {
  return `# Problem

Describe the problem this spec addresses.

# Goals

- Define the intended outcomes for ${input.title.toLowerCase()}.

# Non-Goals

- Capture what is intentionally out of scope for this slice.
`;
}

function buildCreatedTaskBody(input: { title: string }): string {
  return `# Scope

Describe the concrete implementation scope for ${input.title.toLowerCase()}.

# Done Looks Like

- The expected behavior is implemented and verified.
- The linked project memory stays consistent.
`;
}

export interface CreateSpecInput {
  title: string;
  summary: string;
  status?: SpecStatus;
  taskIds?: string[];
  tags?: string[];
  owner?: string;
}

export interface CreateTaskInput {
  title: string;
  summary: string;
  specIds: string[];
  status?: TaskStatus;
  dependsOn?: string[];
  blockedBy?: string[];
  priority?: number;
  ownerRole?: string;
  tags?: string[];
}

export interface UpdateCurrentStateInput {
  focus?: string;
  summary?: string;
  activeSpecIds?: string[];
  activeTaskIds?: string[];
  blockedTaskIds?: string[];
  nextActionHints?: string[];
  clearActiveSpecIds?: boolean;
  clearActiveTaskIds?: boolean;
  clearBlockedTaskIds?: boolean;
  clearNextActionHints?: boolean;
}

export interface ArchiveTaskInput {
  reason?: string;
}

export interface CreateMemoryNoteInput {
  scope: "session" | "org";
  title: string;
  summary?: string;
  tags?: string[];
  expiresAt?: string;
  body?: string;
}

export interface AnswerSpecQuestionsResult {
  spec: SpecDocument;
  answeredQuestions: string[];
  remainingQuestions: string[];
}

export function createDefaultConfig(rootDir: string): ProjectConfig {
  return parseProjectConfig(parseToml(createConfigToml(inferProjectName(rootDir))));
}

export async function readProjectConfig(rootDir: string): Promise<ProjectConfig> {
  const defaultPaths = resolveProjectPaths(rootDir);

  if (!(await pathExists(defaultPaths.configFile))) {
    return createDefaultConfig(rootDir);
  }

  const raw = await readUtf8(defaultPaths.configFile);
  return parseProjectConfig(parseToml(raw));
}

async function readCurrentState(paths: ReturnType<typeof resolveProjectPaths>): Promise<CurrentStateDocument> {
  if (!(await pathExists(paths.stateFile))) {
    return parseCurrentStateDocument(
      paths.stateFile,
      {
        doc_kind: "current-state",
        id: "CURRENT",
        title: "Current Project State",
        summary: "No current state file exists yet.",
        focus: "Run `spm init` or create the configured current state file.",
        active_spec_ids: [],
        active_task_ids: [],
        blocked_task_ids: [],
        next_action_hints: ["Initialize the project memory files."],
        tags: [],
      },
      "# Current State\n\nNo current state file exists yet.\n",
    );
  }

  return loadMarkdownDocument(paths.stateFile, parseCurrentStateDocument);
}

async function readGitSnapshot(rootDir: string): Promise<GitSnapshot> {
  const insideRepo = git(rootDir, ["rev-parse", "--is-inside-work-tree"]);
  if (insideRepo !== "true") {
    return {
      available: false,
      shortStatus: [],
      dirty: false,
    };
  }

  const statusOutput = git(rootDir, ["status", "--short"]);
  const shortStatus = statusOutput ? statusOutput.split("\n").filter(Boolean) : [];

  return {
    available: true,
    branch: git(rootDir, ["branch", "--show-current"]) || undefined,
    shortStatus,
    lastCommit: git(rootDir, ["log", "-1", "--pretty=format:%h %s"]) || undefined,
    dirty: shortStatus.length > 0,
  };
}

export async function loadProjectContext(rootDir: string): Promise<ProjectContext> {
  const config = await readProjectConfig(rootDir);
  const paths = resolveProjectPaths(rootDir, config);

  const [currentState, specs, tasks, handoffs, sessionNotes, orgNotes, gitSnapshot] = await Promise.all([
    readCurrentState(paths),
    loadMarkdownCollection<SpecDocument>(paths.specsDir, parseSpecDocument),
    loadMarkdownCollection<TaskDocument>(paths.tasksDir, parseTaskDocument),
    loadMarkdownCollection<HandoffDocument>(paths.handoffsDir, parseHandoffDocument),
    config.memoryScopes.session.enabled
      ? loadScopedMemoryNotes(paths.sessionMemoryDir, "session", config.memoryScopes.session.writePolicy)
      : Promise.resolve([]),
    config.memoryScopes.org.enabled
      ? loadScopedMemoryNotes(paths.orgMemoryDir, "org", config.memoryScopes.org.writePolicy)
      : Promise.resolve([]),
    readGitSnapshot(rootDir),
  ]);

  handoffs.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    rootDir,
    config,
    currentState,
    specs,
    tasks,
    handoffs,
    sessionNotes,
    orgNotes,
    git: gitSnapshot,
  };
}

export interface InitResult {
  memoryDir: string;
  sequence: string[];
  adoptedHome?: string;
  created: string[];
  refreshed: string[];
  skipped: string[];
}

export interface AdoptionArtifactsWriteResult {
  adoptionDir: string;
  migrationGuideFile: string;
  agentBriefFile: string;
  created: string[];
  refreshed: string[];
  skipped: string[];
}

export async function initializeProject(
  rootDir: string,
  options?: {
    force?: boolean;
    memoryDir?: string;
  },
): Promise<InitResult> {
  const projectName = inferProjectName(rootDir);
  const memoryDir = options?.memoryDir ?? "docs/spm";
  const config = parseProjectConfig(parseToml(createConfigToml(projectName, memoryDir)));
  const paths = resolveProjectPaths(rootDir, config);
  const timestamp = new Date().toISOString();
  const created: string[] = [];
  const refreshed: string[] = [];
  const skipped: string[] = [];

  await Promise.all([
    ensureDir(paths.specpmDir),
    ensureDir(paths.templatesDir),
    ensureDir(paths.memoryDir),
    ensureDir(paths.handoffsDir),
    ensureDir(paths.specsDir),
    ensureDir(paths.tasksDir),
    ensureDir(paths.skillsDir),
    ensureDir(paths.sessionMemoryDir),
    ensureDir(paths.orgMemoryDir),
  ]);

  const existingSpecFiles = await listMarkdownFiles(paths.specsDir);
  const existingTaskFiles = await listMarkdownFiles(paths.tasksDir);
  const shouldSeedAdoptionScaffold = existingSpecFiles.length === 0 && existingTaskFiles.length === 0;

  const files: Array<{ path: string; content: string; refreshOnInit?: boolean }> = [
    { path: paths.configFile, content: createConfigToml(projectName, memoryDir), refreshOnInit: true },
    {
      path: paths.stateFile,
      content: shouldSeedAdoptionScaffold
        ? createSeedCurrentStateTemplate(projectName, timestamp)
        : createCurrentStateTemplate(timestamp),
    },
    { path: join(paths.skillsDir, "README.md"), content: createSkillsReadme() },
    ...createTemplateFiles().map((item) => ({
      path: join(paths.templatesDir, item.name),
      content: item.content,
    })),
  ];

  if (shouldSeedAdoptionScaffold) {
    files.splice(
      2,
      0,
      { path: join(paths.specsDir, "SPEC-001-adopt-spec-embryo-memory-for-this-repository.md"), content: createSeedSpecTemplate(projectName, timestamp) },
      ...createSeedTaskTemplates(projectName, timestamp).map((item) => ({
        path: join(paths.tasksDir, item.name),
        content: item.content,
      })),
    );
  }

  for (const file of files) {
    if (options?.force || !(await pathExists(file.path))) {
      await writeUtf8(file.path, file.content);
      created.push(file.path);
    } else if (file.refreshOnInit) {
      const existing = await readUtf8(file.path);
      if (existing !== file.content) {
        await writeUtf8(file.path, file.content);
        refreshed.push(file.path);
      } else {
        skipped.push(file.path);
      }
    } else {
      skipped.push(file.path);
    }
  }

  return {
    memoryDir,
    sequence: initSequenceDescription(memoryDir),
    created,
    refreshed,
    skipped,
  };
}

export async function writeAdoptionArtifacts(
  rootDir: string,
  memoryDir: string,
  content: {
    migrationGuide: string;
    agentBrief: string;
  },
  options?: {
    force?: boolean;
  },
): Promise<AdoptionArtifactsWriteResult> {
  const artifactPaths = buildAdoptionArtifactPaths(memoryDir);
  const adoptionDir = join(rootDir, artifactPaths.adoptionDir);
  const migrationGuideFile = join(rootDir, artifactPaths.migrationGuideFile);
  const agentBriefFile = join(rootDir, artifactPaths.agentBriefFile);
  const created: string[] = [];
  const refreshed: string[] = [];
  const skipped: string[] = [];

  await ensureDir(adoptionDir);

  const files = [
    { path: migrationGuideFile, content: content.migrationGuide },
    { path: agentBriefFile, content: content.agentBrief },
  ];

  for (const file of files) {
    if (options?.force || !(await pathExists(file.path))) {
      await writeUtf8(file.path, file.content);
      created.push(file.path);
    } else {
      const existing = await readUtf8(file.path);
      if (existing !== file.content) {
        await writeUtf8(file.path, file.content);
        refreshed.push(file.path);
      } else {
        skipped.push(file.path);
      }
    }
  }

  return {
    adoptionDir,
    migrationGuideFile,
    agentBriefFile,
    created,
    refreshed,
    skipped,
  };
}

export interface ReshapeResult {
  targetMemoryDir: string;
  applied: boolean;
  actions: string[];
  warnings: string[];
}

export async function reshapeProject(
  rootDir: string,
  options?: {
    memoryDir?: string;
    dryRun?: boolean;
  },
): Promise<ReshapeResult> {
  const currentConfig = await readProjectConfig(rootDir);
  const layoutChoice = await resolveLayoutChoice(rootDir);
  const inferredMemoryDir = layoutChoice.requiresChoice || layoutChoice.memoryDir.length === 0 ? currentConfig.memoryDir : layoutChoice.memoryDir;
  const targetMemoryDir = options?.memoryDir ?? inferredMemoryDir;
  const plan = await buildReshapePlan(rootDir, currentConfig, targetMemoryDir);

  if (!options?.dryRun) {
    await applyReshapePlan(plan);
    const nextConfig = parseProjectConfig(parseToml(createConfigToml(currentConfig.projectName, targetMemoryDir)));
    const paths = resolveProjectPaths(rootDir, nextConfig);
    await writeUtf8(paths.configFile, createConfigToml(currentConfig.projectName, targetMemoryDir));
    await ensureDir(paths.skillsDir);
    if (!(await pathExists(join(paths.skillsDir, "README.md")))) {
      await writeUtf8(join(paths.skillsDir, "README.md"), createSkillsReadme());
    }
  }

  return {
    targetMemoryDir,
    applied: options?.dryRun !== true,
    actions: plan.actions.map((action) => action.message),
    warnings: plan.warnings,
  };
}

export async function setSpecStatus(rootDir: string, specId: string, status: SpecStatus): Promise<SpecDocument> {
  const config = await readProjectConfig(rootDir);
  const paths = resolveProjectPaths(rootDir, config);
  const specs = await loadMarkdownCollection<SpecDocument>(paths.specsDir, parseSpecDocument);
  const spec = specs.find((entry) => entry.id === specId);

  if (!spec) {
    throw new Error(`Spec not found: ${specId}`);
  }

  const updatedAt = new Date().toISOString();
  const nextSpec: SpecDocument = {
    ...spec,
    status,
    updatedAt,
  };

  await writeUtf8(spec.filePath, serializeSpecDocument(nextSpec, updatedAt));
  return nextSpec;
}

export async function answerSpecOpenQuestions(
  rootDir: string,
  specId: string,
  answers: SpecAnswerInput[],
): Promise<AnswerSpecQuestionsResult> {
  const config = await readProjectConfig(rootDir);
  const paths = resolveProjectPaths(rootDir, config);
  const specs = await loadMarkdownCollection<SpecDocument>(paths.specsDir, parseSpecDocument);
  const spec = specs.find((entry) => entry.id === specId);

  if (!spec) {
    throw new Error(`Spec not found: ${specId}`);
  }

  const applied = applySpecAnswers(spec.body, answers);
  const updatedAt = new Date().toISOString();
  const nextSpec: SpecDocument = {
    ...spec,
    body: applied.body,
    updatedAt,
  };

  await writeUtf8(spec.filePath, serializeSpecDocument(nextSpec, updatedAt));

  return {
    spec: nextSpec,
    answeredQuestions: applied.answeredQuestions,
    remainingQuestions: applied.remainingQuestions.map((entry) => entry.question),
  };
}

export async function setTaskStatus(rootDir: string, taskId: string, status: TaskStatus): Promise<TaskDocument> {
  const config = await readProjectConfig(rootDir);
  const paths = resolveProjectPaths(rootDir, config);
  const tasks = await loadMarkdownCollection<TaskDocument>(paths.tasksDir, parseTaskDocument);
  const task = tasks.find((entry) => entry.id === taskId);

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const updatedAt = new Date().toISOString();
  const nextTask: TaskDocument = {
    ...task,
    status,
    completedAt: status === "done" && task.status !== "done" ? updatedAt : task.completedAt,
    cancelledAt: status === "cancelled" && task.status !== "cancelled" ? updatedAt : task.cancelledAt,
    updatedAt,
  };

  await writeUtf8(task.filePath, serializeTaskDocument(nextTask, updatedAt));
  return nextTask;
}

async function updateTaskDocument(
  rootDir: string,
  taskId: string,
  updater: (task: TaskDocument, now: string) => TaskDocument,
): Promise<TaskDocument> {
  const config = await readProjectConfig(rootDir);
  const paths = resolveProjectPaths(rootDir, config);
  const tasks = await loadMarkdownCollection<TaskDocument>(paths.tasksDir, parseTaskDocument);
  const task = tasks.find((entry) => entry.id === taskId);

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const now = new Date().toISOString();
  const nextTask = updater(task, now);
  await writeUtf8(task.filePath, serializeTaskDocument(nextTask, nextTask.updatedAt ?? now));
  return nextTask;
}

function assertArchivableTask(task: TaskDocument): void {
  if (task.status !== "done" && task.status !== "cancelled") {
    throw new Error(`Only done or cancelled tasks can be archived: ${task.id}`);
  }
}

export async function archiveTask(rootDir: string, taskId: string, input: ArchiveTaskInput = {}): Promise<TaskDocument> {
  return updateTaskDocument(rootDir, taskId, (task, now) => {
    assertArchivableTask(task);

    return {
      ...task,
      archivedAt: now,
      archiveReason: input.reason?.trim() || task.archiveReason,
      updatedAt: now,
    };
  });
}

export async function restoreTask(rootDir: string, taskId: string): Promise<TaskDocument> {
  return updateTaskDocument(rootDir, taskId, (task, now) => ({
    ...task,
    archivedAt: undefined,
    archiveReason: undefined,
    updatedAt: now,
  }));
}

export async function findMemoryNote(rootDir: string, noteId: string): Promise<MemoryNoteDocument> {
  const context = await loadProjectContext(rootDir);
  const note = allMemoryNotes(context).find((entry) => entry.id === noteId);

  if (!note) {
    throw new Error(`Memory note not found: ${noteId}`);
  }

  return note;
}

export async function updateMemoryNote(
  rootDir: string,
  noteId: string,
  updater: (note: MemoryNoteDocument, now: string) => MemoryNoteDocument,
): Promise<MemoryNoteDocument> {
  const config = await readProjectConfig(rootDir);
  const paths = resolveProjectPaths(rootDir, config);
  const sessionNotes = config.memoryScopes.session.enabled
    ? await loadScopedMemoryNotes(paths.sessionMemoryDir, "session", config.memoryScopes.session.writePolicy)
    : [];
  const orgNotes = config.memoryScopes.org.enabled
    ? await loadScopedMemoryNotes(paths.orgMemoryDir, "org", config.memoryScopes.org.writePolicy)
    : [];
  const note = [...sessionNotes, ...orgNotes].find((entry) => entry.id === noteId);

  if (!note) {
    throw new Error(`Memory note not found: ${noteId}`);
  }

  if (note.writePolicy !== "read-write") {
    throw new Error(`Memory note ${note.id} is not writable under the configured scope policy.`);
  }

  const now = new Date().toISOString();
  const nextNote = updater(note, now);
  const scopeDir = memoryScopeDir(paths, nextNote.scope);
  await ensureDir(scopeDir);
  await writeUtf8(nextNote.filePath, serializeMemoryNoteDocument(nextNote, nextNote.updatedAt ?? now));
  return nextNote;
}

export async function createMemoryNote(rootDir: string, input: CreateMemoryNoteInput): Promise<MemoryNoteDocument> {
  return withDocumentCreateLock(rootDir, async () => {
    const config = await readProjectConfig(rootDir);
    assertMemoryScopeEnabledAndWritable(config, input.scope);
    const paths = resolveProjectPaths(rootDir, config);
    const sessionNotes = config.memoryScopes.session.enabled
      ? await loadScopedMemoryNotes(paths.sessionMemoryDir, "session", config.memoryScopes.session.writePolicy)
      : [];
    const orgNotes = config.memoryScopes.org.enabled
      ? await loadScopedMemoryNotes(paths.orgMemoryDir, "org", config.memoryScopes.org.writePolicy)
      : [];
    const existingNotes = [...sessionNotes, ...orgNotes];
    const now = new Date().toISOString();
    const id = nextScopedMemoryNoteId(existingNotes.map((note) => note.id), input.scope);
    const fileName = `${id}-${slugify(input.title) || "note"}.md`;
    const scopeDir = memoryScopeDir(paths, input.scope);
    const filePath = join(scopeDir, fileName);
    const note: MemoryNoteDocument = {
      docKind: "memory-note",
      id,
      title: input.title.trim(),
      summary: input.summary?.trim() || "No summary provided.",
      tags: uniqueStrings(input.tags ?? []),
      createdAt: now,
      expiresAt: input.expiresAt?.trim() || undefined,
      consolidatedAt: undefined,
      promotedTo: undefined,
      archivedAt: undefined,
      archiveReason: undefined,
      updatedAt: now,
      body: input.body?.trim() || "# Notes",
      filePath,
      scope: input.scope,
      writePolicy: "read-write",
    };

    await ensureDir(scopeDir);
    await writeUtf8(filePath, serializeMemoryNoteDocument(note, now));

    return note;
  });
}

function parseAgeToMilliseconds(value: string): number {
  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)([dhw])$/);
  if (!match) {
    throw new Error("`--older-than` must look like 7d, 12h, or 2w.");
  }

  const amount = Number.parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multiplier = unit === "h" ? 60 * 60 * 1000 : unit === "d" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return amount * multiplier;
}

async function archiveClosedTasksByAge(
  rootDir: string,
  kind: "done" | "cancelled",
  olderThan: string,
  reason?: string,
): Promise<TaskDocument[]> {
  const config = await readProjectConfig(rootDir);
  const paths = resolveProjectPaths(rootDir, config);
  const tasks = await loadMarkdownCollection<TaskDocument>(paths.tasksDir, parseTaskDocument);
  const now = Date.now();
  const cutoff = now - parseAgeToMilliseconds(olderThan);
  const timestampField = kind === "done" ? "completedAt" : "cancelledAt";
  const eligible = tasks.filter((task) => {
    if (task.status !== kind || task.archivedAt) {
      return false;
    }

    const timestamp = task[timestampField];
    if (!timestamp) {
      return false;
    }

    const value = Date.parse(timestamp);
    return Number.isFinite(value) && value <= cutoff;
  });

  const archived: TaskDocument[] = [];
  for (const task of eligible) {
    archived.push(await archiveTask(rootDir, task.id, { reason }));
  }

  return archived;
}

export async function archiveDoneTasks(rootDir: string, olderThan: string, input: ArchiveTaskInput = {}): Promise<TaskDocument[]> {
  return archiveClosedTasksByAge(rootDir, "done", olderThan, input.reason);
}

export async function archiveCancelledTasks(rootDir: string, olderThan: string, input: ArchiveTaskInput = {}): Promise<TaskDocument[]> {
  return archiveClosedTasksByAge(rootDir, "cancelled", olderThan, input.reason);
}

export async function createSpec(rootDir: string, input: CreateSpecInput): Promise<SpecDocument> {
  return withDocumentCreateLock(rootDir, async () => {
    const config = await readProjectConfig(rootDir);
    const paths = resolveProjectPaths(rootDir, config);
    const specs = await loadMarkdownCollection<SpecDocument>(paths.specsDir, parseSpecDocument);
    const tasks = await loadMarkdownCollection<TaskDocument>(paths.tasksDir, parseTaskDocument);
    const taskIds = uniqueStrings(input.taskIds ?? []);
    assertKnownIds("Task", taskIds, tasks.map((task) => task.id));

    const now = new Date().toISOString();
    const id = nextNumericId(specs.map((spec) => spec.id), "SPEC");
    const fileName = `${id}-${slugify(input.title) || "spec"}.md`;
    const filePath = join(paths.specsDir, fileName);

    const spec: SpecDocument = {
      docKind: "spec",
      id,
      title: input.title.trim(),
      summary: input.summary.trim(),
      status: input.status ?? "proposed",
      taskIds,
      tags: uniqueStrings(input.tags ?? []),
      owner: input.owner?.trim() || undefined,
      updatedAt: now,
      body: buildCreatedSpecBody({ title: input.title.trim() }),
      filePath,
    };

    await writeUtf8(filePath, serializeSpecDocument(spec, now));

    const linkedTasks = tasks.filter((task) => taskIds.includes(task.id));
    for (const task of linkedTasks) {
      const nextTask: TaskDocument = {
        ...task,
        specIds: uniqueStrings([...task.specIds, spec.id]),
        updatedAt: now,
      };
      await writeUtf8(task.filePath, serializeTaskDocument(nextTask, now));
    }

    return spec;
  });
}

export async function createTask(rootDir: string, input: CreateTaskInput): Promise<TaskDocument> {
  return withDocumentCreateLock(rootDir, async () => {
    const config = await readProjectConfig(rootDir);
    const paths = resolveProjectPaths(rootDir, config);
    const specs = await loadMarkdownCollection<SpecDocument>(paths.specsDir, parseSpecDocument);
    const tasks = await loadMarkdownCollection<TaskDocument>(paths.tasksDir, parseTaskDocument);
    const specIds = uniqueStrings(input.specIds);
    const dependsOn = uniqueStrings(input.dependsOn ?? []);
    const blockedBy = uniqueStrings(input.blockedBy ?? []);

    if (specIds.length === 0) {
      throw new Error("Task creation requires at least one linked spec.");
    }

    assertKnownIds("Spec", specIds, specs.map((spec) => spec.id));
    assertKnownIds("Task", dependsOn, tasks.map((task) => task.id));
    assertKnownIds("Task", blockedBy, tasks.map((task) => task.id));

    const now = new Date().toISOString();
    const id = nextNumericId(tasks.map((task) => task.id), "TASK");
    const fileName = `${id}-${slugify(input.title) || "task"}.md`;
    const filePath = join(paths.tasksDir, fileName);

    const task: TaskDocument = {
      status: input.status ?? "todo",
      docKind: "task",
      id,
      title: input.title.trim(),
      summary: input.summary.trim(),
      specIds,
      dependsOn,
      blockedBy,
      priority: input.priority ?? 3,
      ownerRole: input.ownerRole?.trim() || undefined,
      createdAt: now,
      completedAt: (input.status ?? "todo") === "done" ? now : undefined,
      cancelledAt: (input.status ?? "todo") === "cancelled" ? now : undefined,
      tags: uniqueStrings(input.tags ?? []),
      updatedAt: now,
      body: buildCreatedTaskBody({ title: input.title.trim() }),
      filePath,
    };

    await writeUtf8(filePath, serializeTaskDocument(task, now));

    const linkedSpecs = specs.filter((spec) => specIds.includes(spec.id));
    for (const spec of linkedSpecs) {
      const nextSpec: SpecDocument = {
        ...spec,
        taskIds: uniqueStrings([...spec.taskIds, task.id]),
        updatedAt: now,
      };
      await writeUtf8(spec.filePath, serializeSpecDocument(nextSpec, now));
    }

    return task;
  });
}

export async function updateCurrentState(rootDir: string, input: UpdateCurrentStateInput): Promise<CurrentStateDocument> {
  const config = await readProjectConfig(rootDir);
  const paths = resolveProjectPaths(rootDir, config);
  const [currentState, specs, tasks] = await Promise.all([
    readCurrentState(paths),
    loadMarkdownCollection<SpecDocument>(paths.specsDir, parseSpecDocument),
    loadMarkdownCollection<TaskDocument>(paths.tasksDir, parseTaskDocument),
  ]);

  const activeSpecIds = input.clearActiveSpecIds
    ? []
    : input.activeSpecIds
      ? uniqueStrings(input.activeSpecIds)
      : currentState.activeSpecIds;

  const activeTaskIds = input.clearActiveTaskIds
    ? []
    : input.activeTaskIds
      ? uniqueStrings(input.activeTaskIds)
      : currentState.activeTaskIds;

  const blockedTaskIds = input.clearBlockedTaskIds
    ? []
    : input.blockedTaskIds
      ? uniqueStrings(input.blockedTaskIds)
      : currentState.blockedTaskIds;

  const nextActionHints = input.clearNextActionHints
    ? []
    : input.nextActionHints
      ? uniqueStrings(input.nextActionHints)
      : currentState.nextActionHints;

  assertKnownIds("Spec", activeSpecIds, specs.map((spec) => spec.id));
  assertKnownIds("Task", activeTaskIds, tasks.map((task) => task.id));
  assertKnownIds("Task", blockedTaskIds, tasks.map((task) => task.id));

  const updatedAt = new Date().toISOString();
  const nextCurrentState: CurrentStateDocument = {
    ...currentState,
    summary: input.summary?.trim() || currentState.summary,
    focus: input.focus?.trim() || currentState.focus,
    activeSpecIds,
    activeTaskIds,
    blockedTaskIds,
    nextActionHints,
    updatedAt,
  };

  await writeUtf8(paths.stateFile, serializeCurrentStateDocument(nextCurrentState, updatedAt));
  return nextCurrentState;
}

export async function writeHandoff(
  rootDir: string,
  currentState: CurrentStateDocument,
  handoff: {
    id: string;
    title: string;
    summary: string;
    createdAt: string;
    activeTaskIds: string[];
    relatedSpecIds: string[];
    author: string;
    body: string;
  },
): Promise<string> {
  const config = await readProjectConfig(rootDir);
  const paths = resolveProjectPaths(rootDir, config);
  const slug = handoff.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const fileName = `${handoff.createdAt.replace(/[:]/g, "-")}--${slug || "handoff"}.md`;
  const filePath = join(paths.handoffsDir, fileName);

  await ensureDir(paths.handoffsDir);
  await writeUtf8(
    filePath,
    serializeTomlFrontmatter(
      {
        doc_kind: "handoff",
        id: handoff.id,
        title: handoff.title,
        summary: handoff.summary,
        handoff_kind: "checkpoint",
        created_at: handoff.createdAt,
        active_task_ids: handoff.activeTaskIds,
        related_spec_ids: handoff.relatedSpecIds,
        author: handoff.author,
        updated_at: handoff.createdAt,
        tags: ["handoff", "checkpoint"],
      },
      handoff.body,
    ),
  );

  await writeUtf8(
    paths.stateFile,
    serializeCurrentStateDocument(
      {
        ...currentState,
        lastHandoffId: handoff.id,
        updatedAt: handoff.createdAt,
      },
      handoff.createdAt,
    ),
  );

  return filePath;
}
