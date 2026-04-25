import type { MemoryScopeName, ProjectContext, ResumeContext } from "../domain.ts";
import {
  buildMemoryBriefBundle,
  type MemoryBriefEvidence,
  type MemoryBriefBundle,
  type MemoryBriefRequest,
} from "./memory-brief.ts";

export const CONTEXT_PACK_PROFILES = ["implementation", "review", "migration", "resume"] as const;
export type ContextPackProfile = (typeof CONTEXT_PACK_PROFILES)[number];

export interface ContextPackItem {
  kind:
    | "center"
    | "match"
    | "evidence"
    | "current"
    | "neighbor"
    | "handoff"
    | "focus"
    | "next-actions"
    | "active-spec"
    | "active-task"
    | "blocked-task"
    | "ready-task"
    | "changed-item";
  ref?: string;
  scope: MemoryScopeName;
  title: string;
  summary: string;
  reason: string;
}

export interface ContextPackArtifact {
  kind: "inspect-doc" | "inspect-handoff" | "inspect-change" | "inspect-task";
  ref: string;
  scope?: MemoryScopeName;
  note: string;
}

export interface ContextPackBundle {
  source: "memory" | "resume";
  profile: ContextPackProfile;
  mode: string;
  value: string;
  focus: string;
  summary: string;
  mustReadNow: ContextPackItem[];
  supporting: ContextPackItem[];
  offloaded: ContextPackArtifact[];
  nextInspectIds: string[];
}

function compactList(values: string[], limit: number): string {
  const kept = values.filter(Boolean).slice(0, limit);
  return kept.length > 0 ? kept.join(", ") : "none";
}

function uniqueRefs<T extends { ref: string; note: string; kind: ContextPackArtifact["kind"] }>(values: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const value of values) {
    const key = `${value.kind}:${value.ref}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return result;
}

function buildMemoryCurrentItem(bundle: MemoryBriefBundle): ContextPackItem | undefined {
  if (!bundle.current) {
    return undefined;
  }

  return {
    kind: "current",
    ref: "CURRENT",
    scope: "repo",
    title: bundle.current.focus,
    summary: `Summary: ${bundle.current.summary}; active specs: ${compactList(bundle.current.activeSpecIds, 2)}; active tasks: ${compactList(bundle.current.activeTaskIds, 3)}.`,
    reason: "Current project state keeps the pack aligned with the repo's active focus.",
  };
}

function toMemoryNeighborItem(neighbor: MemoryBriefBundle["neighbors"][number]): ContextPackItem {
  return {
    kind: "neighbor",
    ref: neighbor.id,
    scope: neighbor.scope ?? "repo",
    title: `${neighbor.id}${neighbor.title ? ` ${neighbor.title}` : ""}`,
    summary: `Linked ${neighbor.docKind ?? "document"} kept compact for local context expansion.`,
    reason: "Directly linked context is often the cheapest next expansion if the center is not enough.",
  };
}

function toMemoryHandoffItem(handoff: MemoryBriefBundle["handoffs"][number]): ContextPackItem {
  return {
    kind: "handoff",
    ref: handoff.id,
    scope: "repo",
    title: `${handoff.id} ${handoff.title}`,
    summary: handoff.summary,
    reason: "Recent handoffs preserve interrupted intent without forcing the whole history into the pack.",
  };
}

function toEvidenceItem(
  owner: { id: string; scope: MemoryScopeName; title: string },
  evidence: MemoryBriefEvidence,
  reasonPrefix: string,
): ContextPackItem {
  return {
    kind: "evidence",
    ref: owner.id,
    scope: owner.scope,
    title: `${owner.id}${evidence.heading ? ` ${evidence.heading}` : ` ${owner.title}`}`,
    summary: evidence.text,
    reason: `${reasonPrefix} ${evidence.reason}`.trim(),
  };
}

export function buildMemoryContextPack(context: ProjectContext, request: MemoryBriefRequest): ContextPackBundle {
  const brief = buildMemoryBriefBundle(context, request);
  const profile = brief.request.profile;
  const mustReadNow: ContextPackItem[] = [];
  const supporting: ContextPackItem[] = [];

  if (brief.center) {
    mustReadNow.push({
      kind: "center",
      ref: brief.center.id,
      scope: brief.center.scope,
      title: `${brief.center.id} ${brief.center.title}`,
      summary: brief.center.summary,
      reason: brief.center.matchReasons.join(", ") || "Explicit target document anchors the pack.",
    });
    if (brief.center.evidence[0]) {
      mustReadNow.push(
        toEvidenceItem(
          { id: brief.center.id, scope: brief.center.scope, title: brief.center.title },
          brief.center.evidence[0],
          "Top section-level evidence for the explicit target.",
        ),
      );
    }
  } else if (brief.matches) {
    const topMatches = brief.matches.slice(0, 2);
    mustReadNow.push(
      ...topMatches.map((match) => ({
        kind: "match" as const,
        ref: match.id,
        scope: match.scope,
        title: `${match.id} ${match.title}`,
        summary: match.summary,
        reason: match.matchReasons.join(", ") || "Topical retrieval match selected for the compact pack.",
      })),
    );
    const topEvidence = topMatches
      .flatMap((match) =>
        match.evidence.slice(0, 1).map((evidence) =>
          toEvidenceItem(
            { id: match.id, scope: match.scope, title: match.title },
            evidence,
            "Top section-level evidence for this retrieval match.",
          ),
        ),
      )
      .slice(0, 1);
    mustReadNow.push(...topEvidence);
  }

  const currentItem = buildMemoryCurrentItem(brief);
  if (currentItem) {
    mustReadNow.push(currentItem);
  }

  if (brief.matches && brief.center) {
    supporting.push(
      ...brief.matches.slice(0, 2).map((match) => ({
        kind: "match" as const,
        ref: match.id,
        scope: match.scope,
        title: `${match.id} ${match.title}`,
        summary: match.summary,
        reason: match.matchReasons.join(", ") || "Related match retained as supporting context.",
      })),
    );
  } else if (brief.matches) {
    supporting.push(
      ...brief.matches.slice(2, 4).map((match) => ({
        kind: "match" as const,
        ref: match.id,
        title: `${match.id} ${match.title}`,
        summary: match.summary,
        reason: match.matchReasons.join(", ") || "Additional topical match retained as supporting context.",
      })),
    );
  }

  if (brief.center) {
    const center = brief.center;
    supporting.push(
      ...center.evidence.slice(1).map((evidence) =>
        toEvidenceItem(
          { id: center.id, scope: center.scope, title: center.title },
          evidence,
          "Additional section-level evidence kept nearby for compact expansion.",
        ),
      ),
    );
  } else if (brief.matches) {
    supporting.push(
      ...brief.matches.slice(0, 2).flatMap((match) =>
        match.evidence.slice(brief.matches[0] === match ? 1 : 0, 2).map((evidence) =>
          toEvidenceItem(
            { id: match.id, scope: match.scope, title: match.title },
            evidence,
            "Supporting section-level evidence retained ahead of broader expansion material.",
          ),
        ),
      ),
    );
  }

  supporting.push(...brief.neighbors.slice(0, 2).map(toMemoryNeighborItem));
  supporting.push(...brief.handoffs.slice(0, 1).map(toMemoryHandoffItem));

  const offloaded = uniqueRefs([
    ...(brief.matches ?? []).slice(brief.center ? 2 : 4).map((match) => ({
      kind: "inspect-doc" as const,
      ref: match.id,
      scope: match.scope,
      note: `Retrieved match kept out of the active pack: ${match.title}`,
    })),
    ...brief.neighbors.slice(2).map((neighbor) => ({
      kind: "inspect-doc" as const,
      ref: neighbor.id,
      scope: neighbor.scope,
      note: `Linked context available on expansion${neighbor.title ? `: ${neighbor.title}` : ""}`,
    })),
    ...brief.handoffs.slice(1).map((handoff) => ({
      kind: "inspect-handoff" as const,
      ref: handoff.id,
      scope: "repo",
      note: `Recent handoff kept offloaded: ${handoff.title}`,
    })),
  ]);

  const primaryTitle =
    brief.center?.title ??
    brief.matches?.[0]?.title ??
    brief.current?.focus ??
    `${profile} context pack`;
  const primarySummary =
    brief.center?.summary ??
    brief.matches?.[0]?.summary ??
    brief.current?.summary ??
    "Compact context assembled from managed repo memory.";

  return {
    source: "memory",
    profile,
    mode: brief.request.mode,
    value: brief.request.value,
    focus: primaryTitle,
    summary: primarySummary,
    mustReadNow,
    supporting,
    offloaded,
    nextInspectIds: brief.nextInspectIds,
  };
}

function toChangedItemSummary(item: ResumeContext["changedItems"][number]): string {
  if (item.kind === "other") {
    return item.path;
  }

  return `${item.id}: ${item.title}`;
}

export function buildResumeContextPack(context: ResumeContext): ContextPackBundle {
  const mustReadNow: ContextPackItem[] = [
    {
      kind: "focus",
      scope: "repo",
      title: context.focus,
      summary: context.summary,
      reason: "Current focus is the smallest stable anchor for resuming work.",
    },
  ];

  if (context.nextActions.length > 0) {
    mustReadNow.push({
      kind: "next-actions",
      scope: "repo",
      title: "Deterministic next actions",
      summary: context.nextActions.slice(0, 2).join(" | "),
      reason: "Resume should start from the repo's explicit next steps before expanding supporting context.",
    });
  }

  mustReadNow.push(
    ...context.activeSpecs.slice(0, 2).map((spec) => ({
      kind: "active-spec" as const,
      ref: spec.id,
      scope: "repo",
      title: `${spec.id} ${spec.title}`,
      summary: `Status: ${spec.status}; linked tasks: ${compactList(spec.taskIds, 4)}.`,
      reason: "Active specs define the stable planning surface around the current work.",
    })),
  );

  mustReadNow.push(
    ...context.activeTasks.slice(0, 3).map((entry) => ({
      kind: "active-task" as const,
      ref: entry.task.id,
      scope: "repo",
      title: `${entry.task.id} ${entry.task.title}`,
      summary: `Status: ${entry.task.status}; unmet dependencies: ${compactList(entry.unmetDependencies, 3)}.`,
      reason: "Active tasks are the narrowest concrete execution anchors for the next slice.",
    })),
  );

  mustReadNow.push(
    ...context.blockedTasks.slice(0, 2).map((entry) => ({
      kind: "blocked-task" as const,
      ref: entry.task.id,
      scope: "repo",
      title: `${entry.task.id} ${entry.task.title}`,
      summary: `Blocked by: ${compactList(entry.unmetDependencies, 3)}.`,
      reason: "Blocked work changes what is safe to pick up next.",
    })),
  );

  const supporting: ContextPackItem[] = [
    ...context.readyTasks.slice(0, 2).map((entry) => ({
      kind: "ready-task" as const,
      ref: entry.task.id,
      scope: "repo",
      title: `${entry.task.id} ${entry.task.title}`,
      summary: `Priority: p${entry.task.priority}.`,
      reason: "Ready tasks are useful expansion material if the current slice is finished or blocked.",
    })),
    ...context.changedItems.slice(0, 3).map((item) => ({
      kind: "changed-item" as const,
      ref: item.path,
      scope: "repo",
      title: item.path,
      summary: toChangedItemSummary(item),
      reason: "Recent changed files help localize the working set without pasting large diffs into the pack.",
    })),
  ];

  if (context.recentHandoff) {
    supporting.push({
      kind: "handoff",
      ref: context.recentHandoff.id,
      scope: "repo",
      title: `${context.recentHandoff.id} ${context.recentHandoff.title}`,
      summary: context.recentHandoff.summary,
      reason: "The latest handoff preserves prior intent that may not be obvious from status alone.",
    });
  }

  const offloaded = uniqueRefs([
    ...context.readyTasks.slice(2).map((entry) => ({
      kind: "inspect-task" as const,
      ref: entry.task.id,
      scope: "repo",
      note: `Additional ready task kept out of the active pack: ${entry.task.title}`,
    })),
    ...context.changedItems.slice(3).map((item) => ({
      kind: "inspect-change" as const,
      ref: item.path,
      scope: "repo",
      note: `Changed file available for deeper inspection: ${toChangedItemSummary(item)}`,
    })),
  ]);

  return {
    source: "resume",
    profile: "resume",
    mode: "resume",
    value: context.projectName,
    focus: context.focus,
    summary: context.summary,
    mustReadNow,
    supporting,
    offloaded,
    nextInspectIds: Array.from(
      new Set([
        ...context.activeSpecs.map((spec) => spec.id),
        ...context.activeTasks.map((entry) => entry.task.id),
        ...context.readyTasks.slice(0, 2).map((entry) => entry.task.id),
      ]),
    ).slice(0, 8),
  };
}

function renderItems(items: ContextPackItem[]): string[] {
  if (items.length === 0) {
    return ["- none"];
  }

  return items.map((item) => {
    const ref = item.ref ? `${item.ref} ` : "";
    return `- [${item.kind} scope:${item.scope}] ${ref}${item.title}: ${item.summary} (reason: ${item.reason})`;
  });
}

function renderArtifacts(artifacts: ContextPackArtifact[]): string[] {
  if (artifacts.length === 0) {
    return ["- none"];
  }

  return artifacts.map((artifact) => `- [${artifact.kind}${artifact.scope ? ` scope:${artifact.scope}` : ""}] ${artifact.ref}: ${artifact.note}`);
}

export function renderContextPack(bundle: ContextPackBundle): string {
  const lines: string[] = [
    `Context pack [${bundle.profile}] from ${bundle.source} via ${bundle.mode}: ${bundle.value}`,
    `Focus: ${bundle.focus}`,
    `Summary: ${bundle.summary}`,
    "",
    "Must read now:",
    ...renderItems(bundle.mustReadNow),
    "",
    "Supporting context:",
    ...renderItems(bundle.supporting),
    "",
    "Offloaded detail:",
    ...renderArtifacts(bundle.offloaded),
    "",
    `Next inspect: ${bundle.nextInspectIds.join(", ") || "none"}`,
  ];

  return lines.join("\n");
}
