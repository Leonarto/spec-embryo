import type { HandoffDocument, MemoryScopeName, ProjectContext } from "../domain.ts";
import {
  buildMemoryIndex,
  buildNormalizedTerms,
  extractBodySections,
  type BodySearchSection,
  type MemoryIndexEntry,
} from "./memory-index.ts";
import { buildMemoryNeighborhood, buildMemoryLinkGraph } from "./memory-links.ts";
import { buildMemoryQueryBundle, type MemoryQueryRank, type MemoryQueryScope } from "./memory-query.ts";

export const MEMORY_BRIEF_PROFILES = ["implementation", "review", "migration"] as const;
export type MemoryBriefProfile = (typeof MEMORY_BRIEF_PROFILES)[number];

export interface MemoryBriefRequest {
  id?: string;
  specId?: string;
  taskId?: string;
  text?: string;
  includeNeighbors?: boolean;
  includeCurrent?: boolean;
  includeHandoffs?: boolean;
  profile?: MemoryBriefProfile;
  scope?: MemoryQueryScope;
  rank?: MemoryQueryRank;
}

export interface MemoryBriefBundle {
  request: {
    mode: "id" | "spec" | "task" | "text";
    value: string;
    profile: MemoryBriefProfile;
    scope?: MemoryQueryScope;
    includeNeighbors: boolean;
    includeCurrent: boolean;
    includeHandoffs: boolean;
    rank: MemoryQueryRank;
  };
  center?: {
    id: string;
    docKind: string;
    scope: MemoryScopeName;
    title: string;
    summary: string;
    status?: string;
    tags: string[];
    matchReasons: string[];
    evidence: MemoryBriefEvidence[];
  };
  matches?: Array<{
    id: string;
    docKind: string;
    scope: MemoryScopeName;
    title: string;
    summary: string;
    status?: string;
    matchReasons: string[];
    rankingReasons: string[];
    evidence: MemoryBriefEvidence[];
  }>;
  current?: {
    focus: string;
    summary: string;
    activeSpecIds: string[];
    activeTaskIds: string[];
    blockedTaskIds: string[];
  };
  neighbors: Array<{
    id: string;
    docKind?: string;
    scope?: MemoryScopeName;
    title?: string;
  }>;
  handoffs: Array<{
    id: string;
    title: string;
    summary: string;
    createdAt: string;
  }>;
  nextInspectIds: string[];
}

export interface MemoryBriefEvidence {
  heading?: string;
  text: string;
  reason: string;
}

function resolveProfile(profile: string | undefined): MemoryBriefProfile {
  return profile === "review" || profile === "migration" ? profile : "implementation";
}

function includeHandoffsByDefault(profile: MemoryBriefProfile): boolean {
  return profile === "review" || profile === "migration";
}

function resolveRequestMode(request: MemoryBriefRequest): { mode: MemoryBriefBundle["request"]["mode"]; value: string } {
  const provided = [
    request.id ? "id" : undefined,
    request.specId ? "spec" : undefined,
    request.taskId ? "task" : undefined,
    request.text ? "text" : undefined,
  ].filter(Boolean);

  if (provided.length !== 1) {
    throw new Error("`memory brief` requires exactly one of --id, --spec, --task, or --text.");
  }

  if (request.id) {
    return { mode: "id", value: request.id.trim() };
  }

  if (request.specId) {
    return { mode: "spec", value: request.specId.trim() };
  }

  if (request.taskId) {
    return { mode: "task", value: request.taskId.trim() };
  }

  return { mode: "text", value: request.text!.trim() };
}

function assertKnownEntry(entry: MemoryIndexEntry | undefined, mode: "id" | "spec" | "task", value: string): MemoryIndexEntry {
  if (!entry) {
    throw new Error(`Unknown document ID for memory brief ${mode}: ${value}`);
  }

  if (mode === "spec" && entry.docKind !== "spec") {
    throw new Error(`Expected a spec document for memory brief --spec, got ${entry.docKind}: ${value}`);
  }

  if (mode === "task" && entry.docKind !== "task") {
    throw new Error(`Expected a task document for memory brief --task, got ${entry.docKind}: ${value}`);
  }

  return entry;
}

function pickRelatedHandoffs(context: ProjectContext, centerId: string, profile: MemoryBriefProfile): HandoffDocument[] {
  const relevant = context.handoffs.filter(
    (handoff) =>
      handoff.activeTaskIds.includes(centerId) ||
      handoff.relatedSpecIds.includes(centerId),
  );

  if (relevant.length > 0) {
    return relevant.slice(0, profile === "review" ? 3 : 2);
  }

  return context.handoffs.slice(0, profile === "migration" ? 2 : 1);
}

function truncateEvidenceText(value: string, maxLength = 180): string {
  const trimmed = value.trim().replace(/\s+/gu, " ");
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildEvidenceReason(score: number, phraseMatched: boolean, termMatches: number, explicit: boolean): string {
  if (explicit) {
    return "Section selected from the explicit target to avoid stuffing the whole document into the brief.";
  }

  if (phraseMatched) {
    return "Section contains the query phrase and was promoted as the strongest supporting evidence.";
  }

  if (termMatches > 1 || score >= 6) {
    return "Section has strong query-term overlap and was promoted ahead of broader document context.";
  }

  return "Section retained as compact evidence for this retrieval match.";
}

function scoreSection(section: BodySearchSection, queryText: string | undefined): {
  score: number;
  phraseMatched: boolean;
  termMatches: number;
} {
  if (!queryText) {
    return {
      score: section.heading ? 3 : 1,
      phraseMatched: false,
      termMatches: 0,
    };
  }

  const phrase = queryText.trim().toLowerCase().replace(/\s+/gu, " ");
  const normalized = `${section.heading ? `${section.heading} ` : ""}${section.text}`.toLowerCase();
  const terms = buildNormalizedTerms([queryText]);
  const termMatches = terms.filter((term) => normalized.includes(term)).length;
  const phraseMatched = phrase.length > 0 && normalized.includes(phrase);

  return {
    score: (phraseMatched ? 8 : 0) + termMatches * 2 + (section.heading ? 1 : 0),
    phraseMatched,
    termMatches,
  };
}

function buildDocumentEvidence(entry: MemoryIndexEntry, queryText: string | undefined, explicit: boolean): MemoryBriefEvidence[] {
  const sections = extractBodySections(entry.document.body);
  if (sections.length === 0) {
    return [];
  }

  return sections
    .map((section, index) => {
      const scored = scoreSection(section, explicit ? undefined : queryText);
      return {
        heading: section.heading,
        text: truncateEvidenceText(section.text),
        reason: buildEvidenceReason(scored.score, scored.phraseMatched, scored.termMatches, explicit),
        score: scored.score,
        index,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.index - right.index ||
        left.text.localeCompare(right.text),
    )
    .slice(0, 2)
    .map(({ heading, text, reason }) => ({
      heading,
      text,
      reason,
    }));
}

function toCenter(entry: MemoryIndexEntry, queryText?: string): NonNullable<MemoryBriefBundle["center"]> {
  return {
    id: entry.id,
    docKind: entry.docKind,
    scope: entry.scope,
    title: entry.title,
    summary: entry.summary,
    status: entry.status,
    tags: entry.tags,
    matchReasons: [],
    evidence: buildDocumentEvidence(entry, queryText, true),
  };
}

function uniqueIds(values: string[]): string[] {
  return Array.from(new Set(values)).filter(Boolean);
}

function buildNeighborItems(
  graph: ReturnType<typeof buildMemoryLinkGraph>,
  centerIds: string[],
): Array<{ id: string; docKind?: string; scope?: MemoryScopeName; title?: string }> {
  const centerIdSet = new Set(centerIds);
  const neighborIds = new Set<string>();

  for (const centerId of centerIds) {
    const neighborhood = buildMemoryNeighborhood(graph, centerId, { depth: 1 });
    for (const id of neighborhood.documentIds) {
      if (!centerIdSet.has(id)) {
        neighborIds.add(id);
      }
    }
  }

  return Array.from(neighborIds)
    .map((id) => {
      const entry = graph.index.byId.get(id);
      return {
        id,
        docKind: entry?.docKind,
        scope: entry?.scope,
        title: entry?.title,
      };
    })
    .sort(
      (left, right) =>
        left.id.localeCompare(right.id) ||
        (left.docKind ?? "").localeCompare(right.docKind ?? "") ||
        (left.title ?? "").localeCompare(right.title ?? ""),
    );
}

export function buildMemoryBriefBundle(context: ProjectContext, request: MemoryBriefRequest): MemoryBriefBundle {
  const { mode, value } = resolveRequestMode(request);
  const profile = resolveProfile(request.profile);
  const includeNeighbors = request.includeNeighbors ?? true;
  const includeCurrent = request.includeCurrent ?? true;
  const includeHandoffs = request.includeHandoffs ?? includeHandoffsByDefault(profile);
  const scope = request.scope;
  const rank = request.rank ?? "default";
  const index = buildMemoryIndex(context);
  const graph = buildMemoryLinkGraph(context);

  if (mode === "text") {
    const query = buildMemoryQueryBundle(context, {
      text: value,
      scope,
      limit: profile === "review" ? 5 : 4,
      rank,
    });

    const matches = query.results.map((result) => ({
      id: result.id,
      docKind: result.docKind,
      scope: result.scope,
      title: result.title,
      summary: result.summary,
      status: result.status,
      matchReasons: result.matchReasons,
      rankingReasons: result.rankingReasons,
      evidence: buildDocumentEvidence(index.byId.get(result.id)!, value, false),
    }));
    const neighbors = includeNeighbors ? buildNeighborItems(graph, matches.slice(0, 2).map((item) => item.id)) : [];

    return {
      request: { mode, value, profile, scope, includeNeighbors, includeCurrent, includeHandoffs, rank },
      matches,
      current: includeCurrent
        ? {
            focus: context.currentState.focus,
            summary: context.currentState.summary,
            activeSpecIds: context.currentState.activeSpecIds,
            activeTaskIds: context.currentState.activeTaskIds,
            blockedTaskIds: context.currentState.blockedTaskIds,
          }
        : undefined,
      neighbors,
      handoffs: includeHandoffs
        ? context.handoffs.slice(0, profile === "review" ? 3 : 2).map((handoff) => ({
            id: handoff.id,
            title: handoff.title,
            summary: handoff.summary,
            createdAt: handoff.createdAt,
          }))
        : [],
      nextInspectIds: uniqueIds([
        ...matches.slice(0, 3).map((item) => item.id),
        ...(includeNeighbors ? neighbors.slice(0, 2).map((item) => item.id) : []),
        ...(includeCurrent ? context.currentState.activeSpecIds.slice(0, 2) : []),
        ...(includeCurrent ? context.currentState.activeTaskIds.slice(0, 2) : []),
        ...(includeHandoffs ? context.handoffs.slice(0, 2).map((handoff) => handoff.id) : []),
      ]),
    };
  }

  const entry = assertKnownEntry(index.byId.get(value), mode, value);
  if (scope && entry.scope !== scope) {
    throw new Error(`Requested document ${entry.id} is in scope ${entry.scope}, not ${scope}.`);
  }
  const neighbors = includeNeighbors ? buildNeighborItems(graph, [entry.id]) : [];
  const handoffs = includeHandoffs
    ? pickRelatedHandoffs(context, entry.id, profile).map((handoff) => ({
        id: handoff.id,
        title: handoff.title,
        summary: handoff.summary,
        createdAt: handoff.createdAt,
      }))
    : [];
  const center = toCenter(entry, value);
  center.matchReasons =
    mode === "task"
      ? ["explicit task"]
      : mode === "spec"
        ? ["explicit spec"]
        : ["explicit id"];

  return {
    request: { mode, value, profile, scope, includeNeighbors, includeCurrent, includeHandoffs, rank },
    center,
    current: includeCurrent
      ? {
          focus: context.currentState.focus,
          summary: context.currentState.summary,
          activeSpecIds: context.currentState.activeSpecIds,
          activeTaskIds: context.currentState.activeTaskIds,
          blockedTaskIds: context.currentState.blockedTaskIds,
        }
      : undefined,
    neighbors,
    handoffs,
    nextInspectIds: uniqueIds([
      entry.id,
      ...neighbors.slice(0, 4).map((item) => item.id),
      ...handoffs.slice(0, 2).map((item) => item.id),
    ]).slice(0, 6),
  };
}

export function renderMemoryBriefBundle(bundle: MemoryBriefBundle): string {
  const lines: string[] = [
    `Memory brief [${bundle.request.profile}] via ${bundle.request.mode}: ${bundle.request.value}`,
  ];

  if (bundle.center) {
    lines.push(
      "",
      `Center: ${bundle.center.id} [${bundle.center.docKind}${bundle.center.status ? ` ${bundle.center.status}` : ""} scope:${bundle.center.scope}] ${bundle.center.title}`,
      `Summary: ${bundle.center.summary}`,
    );
    if (bundle.center.matchReasons.length > 0) {
      lines.push(`Match: ${bundle.center.matchReasons.join(", ")}`);
    }
    if (bundle.center.tags.length > 0) {
      lines.push(`Tags: ${bundle.center.tags.join(", ")}`);
    }
    if (bundle.center.evidence.length > 0) {
      lines.push("Evidence:");
      lines.push(
        ...bundle.center.evidence.map((evidence) =>
          `- ${evidence.heading ? `${evidence.heading}: ` : ""}${evidence.text} (reason: ${evidence.reason})`,
        ),
      );
    }
  }

  if (bundle.matches && bundle.matches.length > 0) {
    lines.push("", "Matches:");
    lines.push(
      ...bundle.matches.map((match) => {
        const evidenceSummary =
          match.evidence.length > 0
            ? ` | evidence: ${match.evidence
                .map((evidence) => `${evidence.heading ? `${evidence.heading}: ` : ""}${evidence.text}`)
                .join(" || ")}`
            : "";
        const rankingSummary = match.rankingReasons.length > 0 ? ` (ranking: ${match.rankingReasons.join(", ")})` : "";
        return `- ${match.id} [${match.docKind}${match.status ? ` ${match.status}` : ""} scope:${match.scope}] ${match.title}: ${match.summary}${
          match.matchReasons.length > 0 ? ` (match: ${match.matchReasons.join(", ")})` : ""
        }${rankingSummary}${evidenceSummary}`;
      }),
    );
  }

  if (bundle.current) {
    lines.push("", "Current:");
    lines.push(`- Focus: ${bundle.current.focus}`);
    lines.push(`- Summary: ${bundle.current.summary}`);
    lines.push(`- Active specs: ${bundle.current.activeSpecIds.join(", ") || "none"}`);
    lines.push(`- Active tasks: ${bundle.current.activeTaskIds.join(", ") || "none"}`);
    lines.push(`- Blocked tasks: ${bundle.current.blockedTaskIds.join(", ") || "none"}`);
  }

  lines.push("", "Neighbors:");
  if (bundle.neighbors.length === 0) {
    lines.push("- none");
  } else {
    lines.push(
      ...bundle.neighbors.map(
        (neighbor) =>
          `- ${neighbor.id}${neighbor.docKind ? ` [${neighbor.docKind}${neighbor.scope ? ` scope:${neighbor.scope}` : ""}]` : ""}${neighbor.title ? ` ${neighbor.title}` : ""}`,
      ),
    );
  }

  lines.push("", "Handoffs:");
  if (bundle.handoffs.length === 0) {
    lines.push("- none");
  } else {
    lines.push(
      ...bundle.handoffs.map(
        (handoff) => `- ${handoff.id} ${handoff.title}: ${handoff.summary}`,
      ),
    );
  }

  lines.push("", `Next inspect: ${bundle.nextInspectIds.join(", ") || "none"}`);
  return lines.join("\n");
}
