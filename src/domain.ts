export const SPEC_STATUSES = ["proposed", "active", "paused", "done", "archived"] as const;
export const TASK_STATUSES = ["todo", "in_progress", "blocked", "review", "done", "cancelled"] as const;
export const HANDOFF_KINDS = ["checkpoint", "resume", "decision", "release"] as const;
export const BACKEND_NAMES = ["deterministic", "prompt", "codex", "claude"] as const;

export type SpecStatus = (typeof SPEC_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type HandoffKind = (typeof HANDOFF_KINDS)[number];
export type BackendName = (typeof BACKEND_NAMES)[number];

export function isSpecStatus(value: string): value is SpecStatus {
  return SPEC_STATUSES.includes(value as SpecStatus);
}

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

export interface BaseDocument {
  docKind: string;
  id: string;
  title: string;
  summary: string;
  tags: string[];
  body: string;
  filePath: string;
  updatedAt?: string;
}

export interface SpecDocument extends BaseDocument {
  docKind: "spec";
  status: SpecStatus;
  taskIds: string[];
  owner?: string;
}

export interface TaskDocument extends BaseDocument {
  docKind: "task";
  status: TaskStatus;
  specIds: string[];
  dependsOn: string[];
  blockedBy: string[];
  priority: number;
  ownerRole?: string;
  createdAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  archivedAt?: string;
  archiveReason?: string;
}

export interface HandoffDocument extends BaseDocument {
  docKind: "handoff";
  handoffKind: HandoffKind;
  createdAt: string;
  activeTaskIds: string[];
  relatedSpecIds: string[];
  author: string;
}

export interface CurrentStateDocument extends BaseDocument {
  docKind: "current-state";
  focus: string;
  activeSpecIds: string[];
  activeTaskIds: string[];
  blockedTaskIds: string[];
  nextActionHints: string[];
  lastHandoffId?: string;
}

export interface ExecutionBackendConfig {
  enabled: boolean;
  command?: string;
  args?: string[];
}

export interface ProjectConfig {
  toolVersion: string;
  projectName: string;
  memoryDir: string;
  stateFile: string;
  handoffsDir: string;
  specsDir: string;
  tasksDir: string;
  skillsDir: string;
  defaults: {
    resumeBackend: BackendName;
  };
  backends: {
    deterministic: { enabled: boolean };
    prompt: { enabled: boolean };
    codex: ExecutionBackendConfig;
    claude: ExecutionBackendConfig;
  };
}

export interface GitSnapshot {
  available: boolean;
  branch?: string;
  shortStatus: string[];
  lastCommit?: string;
  dirty: boolean;
}

export interface ChangedItemSummary {
  kind: "spec" | "task" | "current-state" | "handoff" | "other";
  path: string;
  id?: string;
  title?: string;
}

export interface TaskNodeSummary {
  task: TaskDocument;
  unmetDependencies: string[];
  downstreamCount: number;
}

export interface ProjectContext {
  rootDir: string;
  config: ProjectConfig;
  currentState: CurrentStateDocument;
  specs: SpecDocument[];
  tasks: TaskDocument[];
  handoffs: HandoffDocument[];
  git: GitSnapshot;
}

export interface StatusSnapshot {
  specCount: number;
  taskCount: number;
  activeSpecIds: string[];
  activeTaskIds: string[];
  blockedTasks: TaskNodeSummary[];
  reviewTasks: TaskNodeSummary[];
  readyTasks: TaskNodeSummary[];
  inProgressTasks: TaskDocument[];
  recentHandoff?: HandoffDocument;
  criticalPath: TaskDocument[];
  missingDependencies: Array<{ taskId: string; missingTaskId: string }>;
  changedItems: ChangedItemSummary[];
}

export interface ResumeContext {
  projectName: string;
  focus: string;
  summary: string;
  activeSpecs: SpecDocument[];
  activeTasks: TaskNodeSummary[];
  blockedTasks: TaskNodeSummary[];
  reviewTasks: TaskNodeSummary[];
  readyTasks: TaskNodeSummary[];
  criticalPath: TaskDocument[];
  recentHandoff?: HandoffDocument;
  nextActions: string[];
  git: GitSnapshot;
  changedItems: ChangedItemSummary[];
}

function fail(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, field: string, filePath: string, fallback?: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (fallback !== undefined) {
    return fallback;
  }

  fail(`Expected "${field}" to be a non-empty string in ${filePath}`);
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asStringArray(value: unknown, field: string, filePath: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  fail(`Expected "${field}" to be an array of strings in ${filePath}`);
}

function asNumber(value: unknown, field: string, filePath: string, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return fallback;
}

function asEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
  filePath: string,
  fallback?: T[number],
): T[number] {
  if (typeof value === "string" && allowed.includes(value as T[number])) {
    return value as T[number];
  }

  if (fallback !== undefined) {
    return fallback;
  }

  fail(`Expected "${field}" in ${filePath} to be one of: ${allowed.join(", ")}`);
}

export function parseProjectConfig(data: unknown): ProjectConfig {
  if (!isRecord(data)) {
    fail("Project config must be a TOML object.");
  }

  const defaults = isRecord(data.defaults) ? data.defaults : {};
  const backends = isRecord(data.backends) ? data.backends : {};
  const deterministicBackend = isRecord(backends.deterministic) ? backends.deterministic : {};
  const promptBackend = isRecord(backends.prompt) ? backends.prompt : {};
  const codexBackend = isRecord(backends.codex) ? backends.codex : {};
  const claudeBackend = isRecord(backends.claude) ? backends.claude : {};

  return {
    toolVersion: asString(data.tool_version, "tool_version", ".specpm/config.toml"),
    projectName: asString(data.project_name, "project_name", ".specpm/config.toml"),
    memoryDir: asString(data.memory_dir, "memory_dir", ".specpm/config.toml", "docs/spm"),
    stateFile: asString(data.state_file, "state_file", ".specpm/config.toml", "docs/spm/current.md"),
    handoffsDir: asString(data.handoffs_dir, "handoffs_dir", ".specpm/config.toml", "docs/spm/handoffs"),
    specsDir: asString(data.specs_dir, "specs_dir", ".specpm/config.toml", "docs/spm/specs"),
    tasksDir: asString(data.tasks_dir, "tasks_dir", ".specpm/config.toml", "docs/spm/tasks"),
    skillsDir: asString(data.skills_dir, "skills_dir", ".specpm/config.toml", "docs/spm/skills"),
    defaults: {
      resumeBackend: asEnum(defaults.resume_backend, BACKEND_NAMES, "defaults.resume_backend", ".specpm/config.toml", "deterministic"),
    },
    backends: {
      deterministic: {
        enabled: deterministicBackend.enabled !== false,
      },
      prompt: {
        enabled: promptBackend.enabled !== false,
      },
      codex: {
        enabled: codexBackend.enabled === true,
        command: asOptionalString(codexBackend.command),
        args: asStringArray(codexBackend.args, "backends.codex.args", ".specpm/config.toml"),
      },
      claude: {
        enabled: claudeBackend.enabled === true,
        command: asOptionalString(claudeBackend.command),
        args: asStringArray(claudeBackend.args, "backends.claude.args", ".specpm/config.toml"),
      },
    },
  };
}

export function parseSpecDocument(filePath: string, attributes: unknown, body: string): SpecDocument {
  if (!isRecord(attributes)) {
    fail(`Invalid frontmatter in ${filePath}`);
  }

  return {
    docKind: asEnum(attributes.doc_kind, ["spec"] as const, "doc_kind", filePath),
    id: asString(attributes.id, "id", filePath),
    title: asString(attributes.title, "title", filePath),
    summary: asString(attributes.summary, "summary", filePath, "No summary provided."),
    status: asEnum(attributes.status, SPEC_STATUSES, "status", filePath, "proposed"),
    taskIds: asStringArray(attributes.task_ids, "task_ids", filePath),
    tags: asStringArray(attributes.tags, "tags", filePath),
    owner: asOptionalString(attributes.owner),
    updatedAt: asOptionalString(attributes.updated_at),
    body: body.trim(),
    filePath,
  };
}

export function parseTaskDocument(filePath: string, attributes: unknown, body: string): TaskDocument {
  if (!isRecord(attributes)) {
    fail(`Invalid frontmatter in ${filePath}`);
  }

  return {
    docKind: asEnum(attributes.doc_kind, ["task"] as const, "doc_kind", filePath),
    id: asString(attributes.id, "id", filePath),
    title: asString(attributes.title, "title", filePath),
    summary: asString(attributes.summary, "summary", filePath, "No summary provided."),
    status: asEnum(attributes.status, TASK_STATUSES, "status", filePath, "todo"),
    specIds: asStringArray(attributes.spec_ids, "spec_ids", filePath),
    dependsOn: asStringArray(attributes.depends_on, "depends_on", filePath),
    blockedBy: asStringArray(attributes.blocked_by, "blocked_by", filePath),
    priority: asNumber(attributes.priority, "priority", filePath, 3),
    ownerRole: asOptionalString(attributes.owner_role),
    createdAt: asOptionalString(attributes.created_at),
    completedAt: asOptionalString(attributes.completed_at),
    cancelledAt: asOptionalString(attributes.cancelled_at),
    archivedAt: asOptionalString(attributes.archived_at),
    archiveReason: asOptionalString(attributes.archive_reason),
    tags: asStringArray(attributes.tags, "tags", filePath),
    updatedAt: asOptionalString(attributes.updated_at),
    body: body.trim(),
    filePath,
  };
}

export function parseHandoffDocument(filePath: string, attributes: unknown, body: string): HandoffDocument {
  if (!isRecord(attributes)) {
    fail(`Invalid frontmatter in ${filePath}`);
  }

  return {
    docKind: asEnum(attributes.doc_kind, ["handoff"] as const, "doc_kind", filePath),
    id: asString(attributes.id, "id", filePath),
    title: asString(attributes.title, "title", filePath),
    summary: asString(attributes.summary, "summary", filePath, "No summary provided."),
    handoffKind: asEnum(attributes.handoff_kind, HANDOFF_KINDS, "handoff_kind", filePath, "checkpoint"),
    createdAt: asString(attributes.created_at, "created_at", filePath),
    activeTaskIds: asStringArray(attributes.active_task_ids, "active_task_ids", filePath),
    relatedSpecIds: asStringArray(attributes.related_spec_ids, "related_spec_ids", filePath),
    author: asString(attributes.author, "author", filePath, "spec-embryo"),
    tags: asStringArray(attributes.tags, "tags", filePath),
    updatedAt: asOptionalString(attributes.updated_at),
    body: body.trim(),
    filePath,
  };
}

export function parseCurrentStateDocument(filePath: string, attributes: unknown, body: string): CurrentStateDocument {
  if (!isRecord(attributes)) {
    fail(`Invalid frontmatter in ${filePath}`);
  }

  return {
    docKind: asEnum(attributes.doc_kind, ["current-state"] as const, "doc_kind", filePath),
    id: asString(attributes.id, "id", filePath, "CURRENT"),
    title: asString(attributes.title, "title", filePath, "Current Project State"),
    summary: asString(attributes.summary, "summary", filePath, "Current project state."),
    focus: asString(attributes.focus, "focus", filePath, "Define the current focus."),
    activeSpecIds: asStringArray(attributes.active_spec_ids, "active_spec_ids", filePath),
    activeTaskIds: asStringArray(attributes.active_task_ids, "active_task_ids", filePath),
    blockedTaskIds: asStringArray(attributes.blocked_task_ids, "blocked_task_ids", filePath),
    nextActionHints: asStringArray(attributes.next_action_hints, "next_action_hints", filePath),
    lastHandoffId: asOptionalString(attributes.last_handoff_id),
    tags: asStringArray(attributes.tags, "tags", filePath),
    updatedAt: asOptionalString(attributes.updated_at),
    body: body.trim(),
    filePath,
  };
}
