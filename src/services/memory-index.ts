import type {
  CurrentStateDocument,
  HandoffDocument,
  MemoryNoteDocument,
  MemoryScopeName,
  ProjectContext,
  SpecDocument,
  TaskDocument,
} from "../domain.ts";

export type MemoryDocument = SpecDocument | TaskDocument | HandoffDocument | CurrentStateDocument | MemoryNoteDocument;
export type MemoryDocKind = MemoryDocument["docKind"];

export interface MemoryIndexEntry {
  id: string;
  docKind: MemoryDocKind;
  scope: MemoryScopeName;
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

interface BodySection {
  heading?: string;
  chunks: string[];
}

export interface BodySearchSection {
  heading?: string;
  text: string;
}

function isGenericHeading(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return new Set([
    "problem",
    "goals",
    "non-goals",
    "notes",
    "narrative",
    "scope",
    "constraints",
    "acceptance criteria",
    "current state",
  ]).has(normalized);
}

function cleanBodyLine(rawLine: string): string {
  return rawLine
    .trim()
    .replace(/^#{1,6}\s+/u, "")
    .replace(/^[-*+]\s+(?:\[[ xX]\]\s+)?/u, "")
    .replace(/^\d+\.\s+/u, "")
    .replace(/^>\s+/u, "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(/`+/gu, "")
    .replace(/[*_~]+/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function buildSectionSearchValues(section: BodySection): string[] {
  const values: string[] = [];
  const heading = section.heading?.trim();
  const informativeHeading = heading && !isGenericHeading(heading);

  if (informativeHeading) {
    values.push(heading);
  }

  for (const chunk of section.chunks) {
    values.push(heading ? `${heading} ${chunk}` : chunk);
  }

  return values;
}

function extractBodySectionsInternal(body: string): BodySection[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const sections: BodySection[] = [];
  let current: BodySection = { chunks: [] };
  let paragraphLines: string[] = [];
  let inFence = false;
  let recoverUnclosedFence = false;

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) {
      return;
    }

    current.chunks.push(paragraphLines.join(" "));
    paragraphLines = [];
  };

  const flushSection = (): void => {
    flushParagraph();
    if (current.heading || current.chunks.length > 0) {
      sections.push(current);
    }
    current = { chunks: [] };
  };

  for (const [index, rawLine] of lines.entries()) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("```")) {
      flushParagraph();

      if (inFence) {
        inFence = false;
        recoverUnclosedFence = false;
        continue;
      }

      recoverUnclosedFence = !lines.slice(index + 1).some((line) => line.trim().startsWith("```"));
      inFence = true;
      continue;
    }

    if (inFence) {
      // Recover from an unclosed fence once the author resumes normal markdown.
      if (recoverUnclosedFence && (trimmed.length === 0 || /^#{1,6}\s+.+$/u.test(trimmed))) {
        inFence = false;
        recoverUnclosedFence = false;

        if (trimmed.length === 0) {
          flushParagraph();
          continue;
        }
      } else {
        continue;
      }
    }

    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/u);
    if (headingMatch) {
      flushSection();
      current.heading = cleanBodyLine(headingMatch[1] ?? "");
      continue;
    }

    if (trimmed.length === 0) {
      flushParagraph();
      continue;
    }

    if (/^---+$|^\*\*\*+$|^___+$/u.test(trimmed)) {
      flushParagraph();
      continue;
    }

    const cleaned = cleanBodyLine(rawLine);
    if (cleaned.length === 0) {
      continue;
    }

    if (/^[-*+]\s+/u.test(trimmed) || /^\d+\.\s+/u.test(trimmed)) {
      flushParagraph();
      current.chunks.push(cleaned);
      continue;
    }

    paragraphLines.push(cleaned);
  }

  flushSection();

  return sections;
}

export function extractBodySections(body: string): BodySearchSection[] {
  return extractBodySectionsInternal(body)
    .flatMap((section) =>
      section.chunks.map((chunk) => ({
        heading: section.heading,
        text: chunk,
      })),
    )
    .filter((section) => section.text.trim().length > 0);
}

export function extractBodySearchValues(body: string): string[] {
  return extractBodySectionsInternal(body)
    .flatMap((section) => buildSectionSearchValues(section))
    .filter((value) => value.trim().length > 0);
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
    ...extractBodySearchValues(document.body),
  ]);

  return {
    id: document.id,
    docKind: document.docKind,
    scope: document.docKind === "memory-note" ? document.scope : "repo",
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
    ...context.sessionNotes.filter((note) => !note.archivedAt).map((note) => toIndexEntry(note)),
    ...context.orgNotes.filter((note) => !note.archivedAt).map((note) => toIndexEntry(note)),
  ].sort((left, right) => left.id.localeCompare(right.id));

  const byId = new Map(entries.map((entry) => [entry.id, entry] as const));

  return {
    entries,
    byId,
    byKind: createKindMap(entries),
  };
}
