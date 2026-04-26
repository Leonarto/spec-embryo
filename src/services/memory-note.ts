import {
  createMemoryNote,
  findMemoryNote,
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
  action: "create" | "update";
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

export function renderMemoryNoteMutationBundle(bundle: MemoryNoteMutationBundle): string {
  return [
    `${bundle.action === "create" ? "Created" : "Updated"} memory note ${bundle.note.id}`,
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
