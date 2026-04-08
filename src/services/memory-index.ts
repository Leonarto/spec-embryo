import type {
  CurrentStateDocument,
  HandoffDocument,
  ProjectContext,
  SpecDocument,
  TaskDocument,
} from "../domain.ts";

export type MemoryDocument = SpecDocument | TaskDocument | HandoffDocument | CurrentStateDocument;
export type MemoryDocKind = MemoryDocument["docKind"];

export interface MemoryIndexEntry {
  id: string;
  docKind: MemoryDocKind;
  title: string;
  summary: string;
  tags: string[];
  filePath: string;
  updatedAt?: string;
  status?: string;
  owner?: string;
  ownerRole?: string;
  handoffKind?: string;
  priority?: number;
  normalizedTerms: string[];
  normalizedText: string;
  document: MemoryDocument;
}

export interface MemoryIndex {
  entries: MemoryIndexEntry[];
  byId: Map<string, MemoryIndexEntry>;
  byKind: Map<MemoryDocKind, MemoryIndexEntry[]>;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_-]+/u)
    .map((term) => term.trim())
    .filter(Boolean);
}

function normalizePhrase(value: string): string | undefined {
  const normalized = value.trim().toLowerCase().replace(/\s+/gu, " ");
  return normalized.length > 0 ? normalized : undefined;
}

export function buildNormalizedTerms(values: Array<string | undefined>): string[] {
  const terms = new Set<string>();

  for (const value of values) {
    if (!value) {
      continue;
    }

    const phrase = normalizePhrase(value);
    if (phrase) {
      terms.add(phrase);
    }

    for (const token of tokenize(value)) {
      terms.add(token);
    }
  }

  return Array.from(terms).sort((left, right) => left.localeCompare(right));
}

function toIndexEntry(document: MemoryDocument): MemoryIndexEntry {
  const normalizedTerms = buildNormalizedTerms([
    document.id,
    document.title,
    document.summary,
    ...document.tags,
  ]);

  return {
    id: document.id,
    docKind: document.docKind,
    title: document.title,
    summary: document.summary,
    tags: document.tags,
    filePath: document.filePath,
    updatedAt: document.updatedAt,
    status: "status" in document ? document.status : undefined,
    owner: "owner" in document ? document.owner : undefined,
    ownerRole: "ownerRole" in document ? document.ownerRole : undefined,
    handoffKind: "handoffKind" in document ? document.handoffKind : undefined,
    priority: "priority" in document ? document.priority : undefined,
    normalizedTerms,
    normalizedText: normalizedTerms.join(" "),
    document,
  };
}

function createKindMap(entries: MemoryIndexEntry[]): Map<MemoryDocKind, MemoryIndexEntry[]> {
  const byKind = new Map<MemoryDocKind, MemoryIndexEntry[]>();

  for (const entry of entries) {
    const existing = byKind.get(entry.docKind) ?? [];
    existing.push(entry);
    byKind.set(entry.docKind, existing);
  }

  return byKind;
}

export function buildMemoryIndex(context: ProjectContext): MemoryIndex {
  const entries = [
    toIndexEntry(context.currentState),
    ...context.specs.map((spec) => toIndexEntry(spec)),
    ...context.tasks.map((task) => toIndexEntry(task)),
    ...context.handoffs.map((handoff) => toIndexEntry(handoff)),
  ].sort((left, right) => left.id.localeCompare(right.id));

  const byId = new Map(entries.map((entry) => [entry.id, entry] as const));

  return {
    entries,
    byId,
    byKind: createKindMap(entries),
  };
}
