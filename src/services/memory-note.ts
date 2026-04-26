import {
  createMemoryNote,
  findMemoryNote,
  loadProjectContext,
  updateMemoryNote,
  type CreateMemoryNoteInput,
} from "../repository.ts";
import type { MemoryNoteDocument } from "../domain.ts";

export const MEMORY_NOTE_SCOPES = ["session", "org"] as const;
export type MemoryNoteScope = (typeof MEMORY_NOTE_SCOPES)[number];

export interface CreateMemoryNoteRequest {
  scope: MemoryNoteScope;
  title: string;
  summary?: string;
  tags?: string[];
  expiresAt?: string;
  body?: string;
}

export interface UpdateMemoryNoteRequest {
  noteId: string;
  title?: string;
  summary?: string;
  tags?: string[];
  expiresAt?: string;
  clearExpiresAt?: boolean;
  body?: string;
}

export interface MemoryNoteMutationBundle {
  action: "create" | "update" | "archive" | "restore";
  note: {
    id: string;
    scope: MemoryNoteScope;
    title: string;
    summary: string;
    tags: string[];
    expiresAt?: string;
    createdAt?: string;
    updatedAt?: string;
    archivedAt?: string;
    writePolicy: "read-only" | "read-write";
    filePath: string;
  };
  changedFields: string[];
}

export interface MemoryNoteListBundle {
  filters: {
    scope?: MemoryNoteScope;
    includeArchived: boolean;
    limit: number;
  };
  totalMatches: number;
  notes: Array<{
    id: string;
    scope: MemoryNoteScope;
    title: string;
    summary: string;
    tags: string[];
    expiresAt?: string;
    createdAt?: string;
    updatedAt?: string;
    archivedAt?: string;
    archiveReason?: string;
    writePolicy: "read-only" | "read-write";
    filePath: string;
  }>;
}

function parseTags(tags: string[] | undefined): string[] | undefined {
  if (!tags) {
    return undefined;
  }

  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

function validateIsoTimestamp(value: string | undefined, flagName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`\`${flagName}\` must not be empty.`);
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`\`${flagName}\` must be a valid ISO-8601 timestamp.`);
  }

  return trimmed;
}

function toBundle(action: "create" | "update", note: MemoryNoteDocument, changedFields: string[]): MemoryNoteMutationBundle {
  return {
    action,
    note: {
      id: note.id,
      scope: note.scope,
      title: note.title,
      summary: note.summary,
      tags: note.tags,
      expiresAt: note.expiresAt,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      archivedAt: note.archivedAt,
      writePolicy: note.writePolicy,
      filePath: note.filePath,
    },
    changedFields,
  };
}

function toListNote(note: MemoryNoteDocument): MemoryNoteListBundle["notes"][number] {
  return {
    id: note.id,
    scope: note.scope,
    title: note.title,
    summary: note.summary,
    tags: note.tags,
    expiresAt: note.expiresAt,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    archivedAt: note.archivedAt,
    archiveReason: note.archiveReason,
    writePolicy: note.writePolicy,
    filePath: note.filePath,
  };
}

export async function buildCreateMemoryNoteBundle(
  rootDir: string,
  request: CreateMemoryNoteRequest,
): Promise<MemoryNoteMutationBundle> {
  const title = request.title.trim();
  if (title.length === 0) {
    throw new Error("`memory note create` requires `--title`.");
  }

  const note = await createMemoryNote(rootDir, {
    scope: request.scope,
    title,
    summary: request.summary?.trim() || undefined,
    tags: parseTags(request.tags),
    expiresAt: validateIsoTimestamp(request.expiresAt, "--expires-at"),
    body: request.body?.trim() || undefined,
  } satisfies CreateMemoryNoteInput);

  return toBundle("create", note, ["title", "summary", "tags", "body", ...(note.expiresAt ? ["expiresAt"] : [])]);
}

export async function buildUpdateMemoryNoteBundle(
  rootDir: string,
  request: UpdateMemoryNoteRequest,
): Promise<MemoryNoteMutationBundle> {
  const noteId = request.noteId.trim();
  if (noteId.length === 0) {
    throw new Error("`memory note update` requires <NOTE-ID>.");
  }

  if (request.expiresAt !== undefined && request.clearExpiresAt) {
    throw new Error("Use either `--expires-at` or `--clear-expires-at`, not both.");
  }

  const nextTags = parseTags(request.tags);
  const nextExpiresAt = validateIsoTimestamp(request.expiresAt, "--expires-at");
  const fields = [
    request.title !== undefined ? "title" : undefined,
    request.summary !== undefined ? "summary" : undefined,
    nextTags !== undefined ? "tags" : undefined,
    request.body !== undefined ? "body" : undefined,
    nextExpiresAt !== undefined || request.clearExpiresAt ? "expiresAt" : undefined,
  ].filter((field): field is string => Boolean(field));

  if (fields.length === 0) {
    throw new Error("`memory note update` requires at least one field to change.");
  }

  if (request.title !== undefined && request.title.trim().length === 0) {
    throw new Error("`--title` must not be empty.");
  }

  await findMemoryNote(rootDir, noteId);
  const note = await updateMemoryNote(rootDir, noteId, (current, now) => ({
    ...current,
    title: request.title !== undefined ? request.title.trim() : current.title,
    summary: request.summary !== undefined ? request.summary.trim() || "No summary provided." : current.summary,
    tags: nextTags ?? current.tags,
    expiresAt: request.clearExpiresAt ? undefined : nextExpiresAt ?? current.expiresAt,
    body: request.body !== undefined ? request.body.trim() : current.body,
    updatedAt: now,
  }));

  return toBundle("update", note, fields);
}

export async function buildArchiveMemoryNoteBundle(
  rootDir: string,
  noteId: string,
  reason?: string,
): Promise<MemoryNoteMutationBundle> {
  const trimmed = noteId.trim();
  if (trimmed.length === 0) {
    throw new Error("`memory note archive` requires <NOTE-ID>.");
  }

  await findMemoryNote(rootDir, trimmed);
  const note = await updateMemoryNote(rootDir, trimmed, (current, now) => ({
    ...current,
    archivedAt: current.archivedAt ?? now,
    archiveReason: reason?.trim() || current.archiveReason,
    updatedAt: now,
  }));

  return toBundle("archive", note, ["archivedAt", ...(reason?.trim() ? ["archiveReason"] : [])]);
}

export async function buildRestoreMemoryNoteBundle(
  rootDir: string,
  noteId: string,
): Promise<MemoryNoteMutationBundle> {
  const trimmed = noteId.trim();
  if (trimmed.length === 0) {
    throw new Error("`memory note restore` requires <NOTE-ID>.");
  }

  await findMemoryNote(rootDir, trimmed);
  const note = await updateMemoryNote(rootDir, trimmed, (current, now) => ({
    ...current,
    archivedAt: undefined,
    archiveReason: undefined,
    updatedAt: now,
  }));

  return toBundle("restore", note, ["archivedAt", "archiveReason"]);
}

export async function buildMemoryNoteListBundle(
  rootDir: string,
  options: {
    scope?: MemoryNoteScope;
    includeArchived?: boolean;
    limit?: number;
  } = {},
): Promise<MemoryNoteListBundle> {
  const context = await loadProjectContext(rootDir);
  const limit = options.limit && options.limit > 0 ? options.limit : 20;
  const notes = [...context.sessionNotes, ...context.orgNotes]
    .filter((note) => (options.scope ? note.scope === options.scope : true))
    .filter((note) => (options.includeArchived ? true : !note.archivedAt))
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    filters: {
      scope: options.scope,
      includeArchived: options.includeArchived === true,
      limit,
    },
    totalMatches: notes.length,
    notes: notes.slice(0, limit).map(toListNote),
  };
}

export function renderMemoryNoteMutationBundle(bundle: MemoryNoteMutationBundle): string {
  return [
    `${
      bundle.action === "create"
        ? "Created"
        : bundle.action === "update"
          ? "Updated"
          : bundle.action === "archive"
            ? "Archived"
            : "Restored"
    } memory note ${bundle.note.id}`,
    `Scope: ${bundle.note.scope}`,
    `Title: ${bundle.note.title}`,
    `Summary: ${bundle.note.summary}`,
    `Tags: ${bundle.note.tags.join(", ") || "none"}`,
    `Expires at: ${bundle.note.expiresAt ?? "none"}`,
    `Write policy: ${bundle.note.writePolicy}`,
    `Changed fields: ${bundle.changedFields.join(", ") || "none"}`,
    `Path: ${bundle.note.filePath}`,
  ].join("\n");
}

export function renderMemoryNoteListBundle(bundle: MemoryNoteListBundle): string {
  const lines = [
    `Memory notes${bundle.filters.scope ? ` [scope:${bundle.filters.scope}]` : ""}${bundle.filters.includeArchived ? " including archived" : ""}`,
    `Total matches: ${bundle.totalMatches}`,
  ];

  if (bundle.notes.length === 0) {
    lines.push("", "- none");
    return lines.join("\n");
  }

  lines.push(
    "",
    ...bundle.notes.map((note) =>
      `- ${note.id} [scope:${note.scope}${note.archivedAt ? " archived" : ""}] ${note.title}: ${note.summary}${
        note.expiresAt ? ` | expires: ${note.expiresAt}` : ""
      }${note.archiveReason ? ` | archive reason: ${note.archiveReason}` : ""}`,
    ),
  );

  return lines.join("\n");
}
