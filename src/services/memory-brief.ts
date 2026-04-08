import type { HandoffDocument, ProjectContext } from "../domain.ts";
import { buildMemoryIndex, type MemoryIndexEntry } from "./memory-index.ts";
import { buildMemoryLinksBundle, buildMemoryLinkGraph } from "./memory-links.ts";
import { buildMemoryQueryBundle } from "./memory-query.ts";

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
}

export interface MemoryBriefBundle {
  request: {
    mode: "id" | "spec" | "task" | "text";
    value: string;
    profile: MemoryBriefProfile;
    includeNeighbors: boolean;
    includeCurrent: boolean;
    includeHandoffs: boolean;
  };
  center?: {
    id: string;
    docKind: string;
    title: string;
    summary: string;
    status?: string;
    tags: string[];
  };
  matches?: Array<{
    id: string;
    docKind: string;
    title: string;
    summary: string;
    status?: string;
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

function toCenter(entry: MemoryIndexEntry) {
  return {
    id: entry.id,
    docKind: entry.docKind,
    title: entry.title,
    summary: entry.summary,
    status: entry.status,
    tags: entry.tags,
  };
}

function uniqueIds(values: string[]): string[] {
  return Array.from(new Set(values)).filter(Boolean);
}

export function buildMemoryBriefBundle(context: ProjectContext, request: MemoryBriefRequest): MemoryBriefBundle {
  const { mode, value } = resolveRequestMode(request);
  const profile = resolveProfile(request.profile);
  const includeNeighbors = request.includeNeighbors ?? true;
  const includeCurrent = request.includeCurrent ?? true;
  const includeHandoffs = request.includeHandoffs ?? includeHandoffsByDefault(profile);
  const index = buildMemoryIndex(context);
  const graph = buildMemoryLinkGraph(context);

  if (mode === "text") {
    const query = buildMemoryQueryBundle(context, {
      text: value,
      limit: profile === "review" ? 5 : 4,
    });

    const matches = query.results.map((result) => ({
      id: result.id,
      docKind: result.docKind,
      title: result.title,
      summary: result.summary,
      status: result.status,
    }));

    return {
      request: { mode, value, profile, includeNeighbors, includeCurrent, includeHandoffs },
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
      neighbors: [],
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
        ...(includeCurrent ? context.currentState.activeSpecIds.slice(0, 2) : []),
        ...(includeCurrent ? context.currentState.activeTaskIds.slice(0, 2) : []),
        ...(includeHandoffs ? context.handoffs.slice(0, 2).map((handoff) => handoff.id) : []),
      ]),
    };
  }

  const entry = assertKnownEntry(index.byId.get(value), mode, value);
  const links = buildMemoryLinksBundle(graph, entry.id, { depth: includeNeighbors ? 1 : 1 });
  const neighbors = includeNeighbors ? links.neighborhood : [];
  const handoffs = includeHandoffs
    ? pickRelatedHandoffs(context, entry.id, profile).map((handoff) => ({
        id: handoff.id,
        title: handoff.title,
        summary: handoff.summary,
        createdAt: handoff.createdAt,
      }))
    : [];

  return {
    request: { mode, value, profile, includeNeighbors, includeCurrent, includeHandoffs },
    center: toCenter(entry),
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
      `Center: ${bundle.center.id} [${bundle.center.docKind}${bundle.center.status ? ` ${bundle.center.status}` : ""}] ${bundle.center.title}`,
      `Summary: ${bundle.center.summary}`,
    );
    if (bundle.center.tags.length > 0) {
      lines.push(`Tags: ${bundle.center.tags.join(", ")}`);
    }
  }

  if (bundle.matches && bundle.matches.length > 0) {
    lines.push("", "Matches:");
    lines.push(
      ...bundle.matches.map(
        (match) =>
          `- ${match.id} [${match.docKind}${match.status ? ` ${match.status}` : ""}] ${match.title}: ${match.summary}`,
      ),
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
          `- ${neighbor.id}${neighbor.docKind ? ` [${neighbor.docKind}]` : ""}${neighbor.title ? ` ${neighbor.title}` : ""}`,
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
