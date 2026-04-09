import type { ProjectContext, SpecStatus, TaskStatus } from "../domain.ts";
import { buildNormalizedTerms, type MemoryDocKind, type MemoryIndexEntry } from "./memory-index.ts";
import { buildMemoryLinkGraph, buildMemoryNeighborhood, type MemoryRelation } from "./memory-links.ts";

export const MEMORY_QUERY_DOC_KINDS = ["spec", "task", "handoff", "current-state"] as const;
export const MEMORY_QUERY_STATUSES = [
  "proposed",
  "active",
  "paused",
  "done",
  "archived",
  "todo",
  "in_progress",
  "blocked",
  "review",
  "cancelled",
] as const;

export type MemoryQueryDocKind = (typeof MEMORY_QUERY_DOC_KINDS)[number];
export type MemoryQueryStatus = SpecStatus | TaskStatus;

export interface MemoryQueryFilters {
  text?: string;
  docKind?: MemoryQueryDocKind;
  status?: MemoryQueryStatus;
  tags?: string[];
  id?: string;
  linkedTo?: string;
  neighborOf?: string;
  limit?: number;
}

export interface MemoryQueryResult {
  id: string;
  docKind: MemoryDocKind;
  title: string;
  summary: string;
  status?: string;
  tags: string[];
  filePath: string;
  matchReasons: string[];
  relationHints: string[];
}

export interface MemoryQueryBundle {
  filters: {
    text?: string;
    docKind?: MemoryQueryDocKind;
    status?: MemoryQueryStatus;
    tags: string[];
    id?: string;
    linkedTo?: string;
    neighborOf?: string;
    limit: number;
  };
  totalMatches: number;
  results: MemoryQueryResult[];
}

interface ScoredEntry {
  entry: MemoryIndexEntry;
  score: number;
  matchReasons: string[];
  relationHints: string[];
}

function normalizeTagValue(value: string): string | undefined {
  const parts = value
    .trim()
    .toLowerCase()
    .split(/[\s_-]+/u)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return undefined;
  }

  return parts.join("-");
}

function normalizePhrase(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, " ");
}

function normalizeRequestedText(text: string | undefined): string | undefined {
  if (text === undefined) {
    return undefined;
  }

  const normalized = normalizePhrase(text);
  if (normalized.length === 0) {
    throw new Error("`--text` must contain at least one non-whitespace character.");
  }

  return normalized;
}

function assertDocIdExists(id: string, knownIds: Set<string>, filterName: "--linked-to" | "--neighbor-of"): void {
  if (!knownIds.has(id)) {
    throw new Error(`Unknown document ID for ${filterName}: ${id}`);
  }
}

function matchesTagFilter(entry: MemoryIndexEntry, requestedTags: string[]): boolean {
  if (requestedTags.length === 0) {
    return true;
  }

  const normalizedTags = new Set(
    entry.tags
      .map((tag) => normalizeTagValue(tag))
      .filter((tag): tag is string => Boolean(tag)),
  );

  return requestedTags.every((tag) => normalizedTags.has(tag));
}

function scoreTextMatch(entry: MemoryIndexEntry, text: string | undefined): { score: number; reasons: string[] } | undefined {
  if (!text) {
    return { score: 0, reasons: [] };
  }

  const phrase = normalizePhrase(text);
  const queryTerms = buildNormalizedTerms([text]);
  const lowerId = entry.id.toLowerCase();
  const lowerTitle = entry.title.toLowerCase();
  const lowerSummary = entry.summary.toLowerCase();

  let score = 0;
  const reasons: string[] = [];

  if (lowerId === phrase) {
    score += 120;
    reasons.push("exact id");
  } else if (lowerId.includes(phrase)) {
    score += 60;
    reasons.push("id phrase");
  }

  if (lowerTitle === phrase) {
    score += 100;
    reasons.push("exact title");
  } else if (lowerTitle.includes(phrase)) {
    score += 50;
    reasons.push("title phrase");
  }

  if (lowerSummary.includes(phrase)) {
    score += 20;
    reasons.push("summary phrase");
  }

  if (entry.normalizedText.includes(phrase)) {
    score += 10;
    reasons.push("normalized text");
  }

  const allTermsMatch = queryTerms.every(
    (term) =>
      entry.normalizedText.includes(term) ||
      entry.normalizedTerms.some((candidate) => candidate.includes(term)),
  );

  if (allTermsMatch) {
    score += queryTerms.length * 5;
    reasons.push("all query terms");
  }

  if (entry.docKind === "spec" && score > 0) {
    const taskCount = entry.document.docKind === "spec" ? entry.document.taskIds.length : 0;
    score += 30 + Math.min(taskCount * 2, 10);
    reasons.push("spec anchor");
  }

  return score > 0 ? { score, reasons: uniqueSorted(reasons) } : undefined;
}

function compareResults(left: ScoredEntry, right: ScoredEntry): number {
  return right.score - left.score || left.entry.id.localeCompare(right.entry.id);
}

function relationHintLabel(relation: MemoryRelation, perspectiveId: string): string {
  const otherId = relation.fromId === perspectiveId ? relation.toId : relation.fromId;
  return `${relation.relation} -> ${otherId}`;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function buildRelationHints(relations: MemoryRelation[], perspectiveId: string): string[] {
  return uniqueSorted(relations.map((relation) => relationHintLabel(relation, perspectiveId)));
}

function buildFilterReasons(entry: MemoryIndexEntry, filters: MemoryQueryFilters, requestedTags: string[]): string[] {
  const reasons: string[] = [];

  if (filters.docKind) {
    reasons.push(`kind:${entry.docKind}`);
  }

  if (filters.status && entry.status) {
    reasons.push(`status:${entry.status}`);
  }

  if (filters.id) {
    reasons.push(`id:${entry.id}`);
  }

  if (requestedTags.length > 0) {
    reasons.push(...requestedTags.map((tag) => `tag:${tag.trim().toLowerCase()}`));
  }

  if (filters.linkedTo) {
    reasons.push(`linked:${filters.linkedTo}`);
  }

  if (filters.neighborOf) {
    reasons.push(`neighbor:${filters.neighborOf}`);
  }

  return reasons;
}

export function buildMemoryQueryBundle(context: ProjectContext, filters: MemoryQueryFilters): MemoryQueryBundle {
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
  const requestedText = normalizeRequestedText(filters.text);
  const requestedTags = uniqueSorted(
    (filters.tags ?? [])
      .map((tag) => normalizeTagValue(tag))
      .filter((tag): tag is string => Boolean(tag)),
  );
  const graph = buildMemoryLinkGraph(context);
  const knownIds = new Set(graph.index.byId.keys());
  const linkedTo = filters.linkedTo?.trim();
  const neighborOf = filters.neighborOf?.trim();

  if (linkedTo) {
    assertDocIdExists(linkedTo, knownIds, "--linked-to");
  }

  if (neighborOf) {
    assertDocIdExists(neighborOf, knownIds, "--neighbor-of");
  }

  const linkedIds =
    linkedTo !== undefined
      ? new Set(
          graph.relations
            .filter((relation) => relation.fromId === linkedTo || relation.toId === linkedTo)
            .flatMap((relation) =>
              relation.fromId === linkedTo ? [relation.toId] : [relation.fromId],
            ),
        )
      : undefined;

  const neighborhoodIds =
    neighborOf !== undefined
      ? new Set(
          buildMemoryNeighborhood(graph, neighborOf, { depth: 1 }).documentIds.filter(
            (id) => id !== neighborOf,
          ),
        )
      : undefined;

  const scored = graph.index.entries
    .flatMap((entry): ScoredEntry[] => {
      if (filters.docKind && entry.docKind !== filters.docKind) {
        return [];
      }

      if (filters.status && entry.status !== filters.status) {
        return [];
      }

      if (filters.id && entry.id.toLowerCase() !== filters.id.trim().toLowerCase()) {
        return [];
      }

      if (!matchesTagFilter(entry, requestedTags)) {
        return [];
      }

      if (linkedIds && !linkedIds.has(entry.id)) {
        return [];
      }

      if (neighborhoodIds && !neighborhoodIds.has(entry.id)) {
        return [];
      }

      const textScore = scoreTextMatch(entry, requestedText);
      if (requestedText && textScore === undefined) {
        return [];
      }

      const relationHints =
        linkedTo !== undefined
          ? buildRelationHints(
              graph.relations.filter(
                (relation) =>
                  (relation.fromId === linkedTo && relation.toId === entry.id) ||
                  (relation.toId === linkedTo && relation.fromId === entry.id),
              ),
              entry.id,
            )
          : neighborOf !== undefined
            ? buildRelationHints(
                graph.relations.filter(
                  (relation) =>
                    (relation.fromId === neighborOf && relation.toId === entry.id) ||
                    (relation.toId === neighborOf && relation.fromId === entry.id),
                ),
                entry.id,
            )
          : [];

      const matchReasons = uniqueSorted([
        ...buildFilterReasons(entry, filters, requestedTags),
        ...(textScore?.reasons ?? []),
      ]);

      return [
        {
          entry,
          score: textScore?.score ?? 0,
          matchReasons,
          relationHints,
        },
      ];
    })
    .sort(compareResults);

  return {
    filters: {
      text: requestedText,
      docKind: filters.docKind,
      status: filters.status,
      tags: requestedTags,
      id: filters.id?.trim() || undefined,
      linkedTo,
      neighborOf,
      limit,
    },
    totalMatches: scored.length,
    results: scored.slice(0, limit).map(({ entry, matchReasons, relationHints }) => ({
      id: entry.id,
      docKind: entry.docKind,
      title: entry.title,
      summary: entry.summary,
      status: entry.status,
      tags: entry.tags,
      filePath: entry.filePath,
      matchReasons,
      relationHints,
    })),
  };
}

export function renderMemoryQueryBundle(bundle: MemoryQueryBundle): string {
  if (bundle.results.length === 0) {
    return "No managed memory documents matched the query.";
  }

  return bundle.results
    .map((result) => {
      const statusLabel = result.status ? ` ${result.status}` : "";
      const reasonLine = result.matchReasons.length > 0 ? `\n  match: ${result.matchReasons.join(", ")}` : "";
      const relationLine =
        result.relationHints.length > 0 ? `\n  relations: ${result.relationHints.join(", ")}` : "";
      const tagLine = result.tags.length > 0 ? `\n  tags: ${result.tags.join(", ")}` : "";
      return `${result.id} [${result.docKind}${statusLabel}] ${result.title}\n  ${result.summary}${reasonLine}${relationLine}${tagLine}`;
    })
    .join("\n\n");
}
