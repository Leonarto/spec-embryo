import { createHash } from "node:crypto";
import { relative } from "node:path";
import type { BaseDocument, ProjectContext, ResumeContext, ResumeContextSnapshot } from "../domain.ts";
import { documentSourceHash } from "./document-provenance.ts";

export function canonicalJson(value: unknown): string {
  const canonical = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(canonical);
    if (entry !== null && typeof entry === "object") {
      return Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .filter(([, item]) => item !== undefined).map(([key, item]) => [key, canonical(item)]));
    }
    return entry;
  };
  return JSON.stringify(canonical(value));
}

export function buildResumeSnapshot(project: ProjectContext, context: ResumeContext): {
  snapshot: ResumeContextSnapshot; warnings: string[];
} {
  const warnings: string[] = [];
  const selected: BaseDocument[] = [project.currentState, ...context.activeSpecs,
    ...context.activeTasks.map((entry) => entry.task), ...context.blockedTasks.map((entry) => entry.task),
    ...context.reviewTasks.map((entry) => entry.task), ...context.readyTasks.map((entry) => entry.task),
    ...context.criticalPath, ...(context.recentHandoff ? [context.recentHandoff] : [])];
  const seen = new Set<string>();
  const sources = selected.filter((doc) => {
    if (seen.has(doc.filePath)) return false;
    seen.add(doc.filePath);
    return true;
  }).map((doc) => ({
    id: doc.id, path: relative(project.rootDir, doc.filePath), content_hash: documentSourceHash(doc),
  }));
  for (const source of sources) {
    if (!source.content_hash) warnings.push(`Source bytes unavailable for ${source.path}; content hash is null.`);
  }
  if (!project.git.available) warnings.push("Git is unavailable; context remains usable without Git references.");
  else if (!project.git.head) warnings.push("Git HEAD has no available commit; snapshot head is null.");
  if (context.interruption_window && !context.interruption_window.available) {
    warnings.push(`Interruption window unavailable: ${context.interruption_window.error ?? "unknown error"}`);
  }
  const head = project.git.head ?? null;
  const branch = project.git.branch ?? null;
  const dirty = project.git.dirty;
  // Selected document hashes cover the exact loaded bytes; no filesystem reread.
  // This is an observation of selected context, not an atomic filesystem snapshot.
  const selectedData = {
    project_name: context.projectName, focus: context.focus, summary: context.summary,
    next_actions: context.nextActions, changed_items: context.changedItems,
    active_specs: context.activeSpecs.map((spec) => spec.id),
    active_tasks: context.activeTasks.map((entry) => ({ id: entry.task.id, unmet: entry.unmetDependencies })),
    blocked_tasks: context.blockedTasks.map((entry) => ({ id: entry.task.id, unmet: entry.unmetDependencies })),
    review_tasks: context.reviewTasks.map((entry) => entry.task.id),
    ready_tasks: context.readyTasks.map((entry) => entry.task.id),
    critical_path: context.criticalPath.map((task) => task.id),
    recent_handoff: context.recentHandoff?.id ?? null,
    ...(context.interruption_window ? { interruption_window: context.interruption_window } : {}),
    head, branch, dirty, sources,
  };
  const fingerprint = createHash("sha256").update(canonicalJson(selectedData), "utf8").digest("hex");
  return { snapshot: { head, branch, dirty, fingerprint, sources }, warnings };
}
