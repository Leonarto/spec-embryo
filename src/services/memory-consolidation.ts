import { buildNormalizedTerms, extractBodySearchValues } from "./memory-index.ts";
import { buildMemoryQueryBundle } from "./memory-query.ts";
import { findMemoryNote, loadProjectContext, updateMemoryNote, writeHandoff } from "../repository.ts";
import type { MemoryNoteDocument, ProjectContext } from "../domain.ts";

export const MEMORY_CONSOLIDATION_TARGETS = ["handoff"] as const;
export type MemoryConsolidationTarget = (typeof MEMORY_CONSOLIDATION_TARGETS)[number];

export interface MemoryConsolidationRequest {
  noteId: string;
  apply?: boolean;
  target?: MemoryConsolidationTarget;
  title?: string;
  keepSource?: boolean;
}

export interface MemoryConsolidationBundle {
  note: {
    id: string;
    scope: "session" | "org";
    title: string;
    summary: string;
    tags: string[];
    writePolicy: "read-only" | "read-write";
    archivedAt?: string;
    consolidatedAt?: string;
    promotedTo?: string;
    expiresAt?: string;
  };
  apply: boolean;
  target: MemoryConsolidationTarget;
  keepSource: boolean;
  staleReasons: string[];
  duplicateNoteIds: string[];
  contradictionIds: string[];
  relatedRepoIds: string[];
  recommendedAction: "promote-and-retire" | "promote-and-keep" | "already-retired" | "already-consolidated";
  createdHandoffId?: string;
  retiredSource?: boolean;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, " ");
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function detectDuplicates(note: MemoryNoteDocument, context: ProjectContext): string[] {
  const title = normalizeText(note.title);
  const summary = normalizeText(note.summary);

  return context.sessionNotes
    .filter((candidate) => candidate.id !== note.id && !candidate.archivedAt)
    .filter(
      (candidate) =>
        normalizeText(candidate.title) === title ||
        (summary.length > 0 && normalizeText(candidate.summary) === summary),
    )
    .map((candidate) => candidate.id)
    .sort((left, right) => left.localeCompare(right));
}

function detectContradictions(note: MemoryNoteDocument, context: ProjectContext): string[] {
  const title = normalizeText(note.title);
  const summary = normalizeText(note.summary);

  const repoEntries = [
    context.currentState,
    ...context.specs,
    ...context.tasks,
    ...context.handoffs,
  ];

  return repoEntries
    .filter((entry) => normalizeText(entry.title) === title && normalizeText(entry.summary) !== summary)
    .map((entry) => entry.id)
    .sort((left, right) => left.localeCompare(right));
}

function detectStaleReasons(note: MemoryNoteDocument, nowIso: string): string[] {
  const reasons: string[] = [];
  const now = Date.parse(nowIso);

  if (note.archivedAt) {
    reasons.push(`archived:${note.archivedAt}`);
  }

  if (note.consolidatedAt) {
    reasons.push(`consolidated:${note.consolidatedAt}`);
  }

  if (note.expiresAt) {
    const expiresAt = Date.parse(note.expiresAt);
    if (Number.isFinite(expiresAt) && expiresAt <= now) {
      reasons.push(`expired:${note.expiresAt}`);
    }
  }

  return reasons;
}

function detectRelatedRepoIds(note: MemoryNoteDocument, context: ProjectContext, contradictionIds: string[]): string[] {
  const searchInputs = [
    note.title,
    note.summary,
    ...note.tags.map((tag) => tag.trim()).filter(Boolean),
    ...extractBodySearchValues(note.body).slice(0, 3),
  ].filter((value) => value.trim().length > 0);

  const related = new Set<string>(contradictionIds);

  for (const text of searchInputs) {
    const results = buildMemoryQueryBundle(context, {
      text,
      scope: "repo",
      limit: 5,
    }).results;

    for (const entry of results) {
      related.add(entry.id);
      if (related.size >= 5) {
        return uniqueSorted(Array.from(related)).slice(0, 5);
      }
    }
  }

  return uniqueSorted(Array.from(related)).slice(0, 5);
}

function recommendAction(note: MemoryNoteDocument, keepSource: boolean): MemoryConsolidationBundle["recommendedAction"] {
  if (note.archivedAt) {
    return "already-retired";
  }

  if (note.consolidatedAt) {
    return "already-consolidated";
  }

  return keepSource ? "promote-and-keep" : "promote-and-retire";
}

function buildHandoffBody(
  note: MemoryNoteDocument,
  duplicateNoteIds: string[],
  contradictionIds: string[],
  relatedRepoIds: string[],
): string {
  return [
    "# Summary",
    "",
    note.summary,
    "",
    "## Source Note",
    "",
    `- Note: ${note.id}`,
    `- Scope: ${note.scope}`,
    `- Tags: ${note.tags.join(", ") || "none"}`,
    note.expiresAt ? `- Expires at: ${note.expiresAt}` : "- Expires at: none",
    "",
    "## Consolidated Content",
    "",
    note.body.length > 0 ? note.body : "_No additional body content._",
    "",
    "## Duplicate Session Notes",
    "",
    ...(duplicateNoteIds.length > 0 ? duplicateNoteIds.map((id) => `- ${id}`) : ["- none"]),
    "",
    "## Repo Contradictions To Inspect",
    "",
    ...(contradictionIds.length > 0 ? contradictionIds.map((id) => `- ${id}`) : ["- none"]),
    "",
    "## Related Repo Docs",
    "",
    ...(relatedRepoIds.length > 0 ? relatedRepoIds.map((id) => `- ${id}`) : ["- none"]),
  ].join("\n");
}

function handoffIdFor(createdAt: string): string {
  return `HANDOFF-${createdAt.replace(/[-:]/g, "").replace(/\..+/, "")}`;
}

export async function buildMemoryConsolidationBundle(
  rootDir: string,
  request: MemoryConsolidationRequest,
): Promise<MemoryConsolidationBundle> {
  const context = await loadProjectContext(rootDir);
  const note = await findMemoryNote(rootDir, request.noteId);

  if (note.scope !== "session") {
    throw new Error(`Only session memory notes can be consolidated in this slice: ${note.id}`);
  }

  const target = request.target ?? "handoff";
  const keepSource = request.keepSource === true;
  const nowIso = new Date().toISOString();
  const duplicateNoteIds = detectDuplicates(note, context);
  const contradictionIds = detectContradictions(note, context);
  const relatedRepoIds = detectRelatedRepoIds(note, context, contradictionIds);
  const staleReasons = detectStaleReasons(note, nowIso);
  const recommendedAction = recommendAction(note, keepSource);

  if (!request.apply) {
    return {
      note: {
        id: note.id,
        scope: note.scope,
        title: note.title,
        summary: note.summary,
        tags: note.tags,
        writePolicy: note.writePolicy,
        archivedAt: note.archivedAt,
        consolidatedAt: note.consolidatedAt,
        promotedTo: note.promotedTo,
        expiresAt: note.expiresAt,
      },
      apply: false,
      target,
      keepSource,
      staleReasons,
      duplicateNoteIds,
      contradictionIds,
      relatedRepoIds,
      recommendedAction,
    };
  }

  if (note.writePolicy !== "read-write") {
    throw new Error(`Memory note ${note.id} is not writable under the configured scope policy.`);
  }

  if (note.archivedAt) {
    return {
      note: {
        id: note.id,
        scope: note.scope,
        title: note.title,
        summary: note.summary,
        tags: note.tags,
        writePolicy: note.writePolicy,
        archivedAt: note.archivedAt,
        consolidatedAt: note.consolidatedAt,
        promotedTo: note.promotedTo,
        expiresAt: note.expiresAt,
      },
      apply: true,
      target,
      keepSource,
      staleReasons,
      duplicateNoteIds,
      contradictionIds,
      relatedRepoIds,
      recommendedAction,
      createdHandoffId: note.promotedTo,
      retiredSource: true,
    };
  }

  const createdAt = nowIso;
  const handoffId = handoffIdFor(createdAt);
  const handoffTitle = request.title?.trim() || `Consolidated ${note.title}`;
  await writeHandoff(rootDir, context.currentState, {
    id: handoffId,
    title: handoffTitle,
    summary: note.summary,
    createdAt,
    activeTaskIds: context.currentState.activeTaskIds.slice(0, 4),
    relatedSpecIds: context.currentState.activeSpecIds.slice(0, 4),
    author: "spec-embryo",
    body: buildHandoffBody(note, duplicateNoteIds, contradictionIds, relatedRepoIds),
  });

  const updatedNote = await updateMemoryNote(rootDir, note.id, (current, now) => ({
    ...current,
    consolidatedAt: current.consolidatedAt ?? now,
    promotedTo: handoffId,
    archivedAt: keepSource ? current.archivedAt : current.archivedAt ?? now,
    archiveReason: keepSource ? current.archiveReason : current.archiveReason ?? `Consolidated to ${handoffId}`,
    tags: Array.from(new Set([...current.tags, "consolidated"])),
    updatedAt: now,
  }));

  return {
    note: {
      id: updatedNote.id,
      scope: updatedNote.scope,
      title: updatedNote.title,
      summary: updatedNote.summary,
      tags: updatedNote.tags,
      writePolicy: updatedNote.writePolicy,
      archivedAt: updatedNote.archivedAt,
      consolidatedAt: updatedNote.consolidatedAt,
      promotedTo: updatedNote.promotedTo,
      expiresAt: updatedNote.expiresAt,
    },
    apply: true,
    target,
    keepSource,
    staleReasons,
    duplicateNoteIds,
    contradictionIds,
    relatedRepoIds,
    recommendedAction: keepSource ? "promote-and-keep" : "promote-and-retire",
    createdHandoffId: handoffId,
    retiredSource: !keepSource,
  };
}

export function renderMemoryConsolidationBundle(bundle: MemoryConsolidationBundle): string {
  return [
    `${bundle.apply ? "Applied" : "Memory"} consolidation [${bundle.target}] for ${bundle.note.id}`,
    `Scope: ${bundle.note.scope}`,
    `Title: ${bundle.note.title}`,
    `Summary: ${bundle.note.summary}`,
    `Recommended action: ${bundle.recommendedAction}`,
    `Keep source note: ${bundle.keepSource ? "yes" : "no"}`,
    "",
    "Stale signals:",
    ...(bundle.staleReasons.length > 0 ? bundle.staleReasons.map((reason) => `- ${reason}`) : ["- none"]),
    "",
    "Duplicate session notes:",
    ...(bundle.duplicateNoteIds.length > 0 ? bundle.duplicateNoteIds.map((id) => `- ${id}`) : ["- none"]),
    "",
    "Repo contradictions:",
    ...(bundle.contradictionIds.length > 0 ? bundle.contradictionIds.map((id) => `- ${id}`) : ["- none"]),
    "",
    "Related repo docs:",
    ...(bundle.relatedRepoIds.length > 0 ? bundle.relatedRepoIds.map((id) => `- ${id}`) : ["- none"]),
    ...(bundle.createdHandoffId ? ["", `Created handoff: ${bundle.createdHandoffId}`] : []),
    ...(bundle.retiredSource !== undefined ? [`Retired source: ${bundle.retiredSource ? "yes" : "no"}`] : []),
  ].join("\n");
}
