import { randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import type { HarnessInvocation, HarnessProtocol, HarnessProvider, NativeHarnessResult, ResumeContextSnapshot } from "../domain.ts";
import { buildResumeContext } from "../engine.ts";
import { STRUCTURED_OUTPUT_SCHEMA_VERSION } from "./contracts.ts";
import { captureHarnessGuard, type HarnessGuard } from "./harness-guard.ts";
import { loadRootedHarnessContext } from "./harness-context.ts";
import { buildResumeSnapshot } from "./resume-snapshot.ts";
import { boundHarnessReceipt, receiptRelativePath, receiptSnapshot, writeHarnessReceipt, type HarnessRunReceipt } from "./harness-receipts.ts";

export interface EvidenceError { type: "guard" | "snapshot" | "record"; message: string }
export interface RunEvidenceStart {
  root: string;
  id: string;
  path: string;
  provider: HarnessProvider;
  protocol: HarnessProtocol | null;
  startedAt: string;
  snapshot: ResumeContextSnapshot;
  guard: HarnessGuard;
  specIds: string[];
  taskIds: string[];
  errors: EvidenceError[];
}
function incompleteGuard(): HarnessGuard {
  return { complete: false, capture_error: true, head: null, changed_paths: [], entries: [], omitted_paths: 0,
    warnings: ["Guard capture failed; handoff apply is disabled."] };
}
export async function beginRunEvidence(rootDir: string, provider: HarnessProvider, protocol: HarnessProtocol | null,
  snapshot: ResumeContextSnapshot, specIds: string[], taskIds: string[]): Promise<RunEvidenceStart> {
  const root = await realpath(rootDir);
  const id = randomUUID();
  const path = receiptRelativePath(id);
  const errors: EvidenceError[] = [];
  let guard;
  try { guard = await captureHarnessGuard(root, { managedSources: snapshot.sources, excludeReceiptPath: path }); }
  catch { guard = incompleteGuard(); }
  if (guard.capture_error) errors.push({ type: "guard", message: "Initial guard could not be completely observed." });
  return { root, id, path, provider, protocol, startedAt: new Date().toISOString(), snapshot, guard, specIds, taskIds, errors };
}

export async function finishRunEvidence(start: RunEvidenceStart, invocation: HarnessInvocation, native: NativeHarnessResult | null): Promise<{
  record: { requested: true; run_id: string; path: string | null; saved: boolean; guard_complete: boolean };
  evidence_error?: { type: EvidenceError["type"]; message: string; additional_errors: EvidenceError[] };
  warnings: string[];
}> {
  const errors = [...start.errors];
  let finalSnapshot: ResumeContextSnapshot | null = null;
  let finalSpecIds: string[] = [];
  let finalTaskIds: string[] = [];
  try {
    const context = await loadRootedHarnessContext(start.root);
    const resume = buildResumeContext(context);
    finalSnapshot = buildResumeSnapshot(context, resume).snapshot;
    finalSpecIds = resume.activeSpecs.map((spec) => spec.id);
    finalTaskIds = [...resume.activeTasks, ...resume.blockedTasks, ...resume.reviewTasks, ...resume.readyTasks].map((entry) => entry.task.id);
  } catch { errors.push({ type: "snapshot", message: "Final selected-context snapshot could not be captured." }); }
  let guard;
  try {
    guard = await captureHarnessGuard(start.root, { observedPaths: start.guard.entries.map((entry) => entry.path),
      managedSources: finalSnapshot?.sources ?? start.snapshot.sources, excludeReceiptPath: start.path });
  } catch { guard = incompleteGuard(); }
  guard.complete &&= start.guard.complete && finalSnapshot !== null;
  if (invocation.state === "unknown") {
    guard.complete = false;
    guard.warnings.push("tree-closure-unverified: the final observation is not a stabilized process-tree checkpoint; handoff apply is disabled.");
  }
  guard.capture_error ||= start.guard.capture_error;
  guard.omitted_paths += start.guard.omitted_paths;
  guard.warnings = [...new Set([...start.guard.warnings, ...guard.warnings])].slice(0, 32);
  if (guard.capture_error && !errors.some((error) => error.type === "guard")) errors.push({ type: "guard", message: "Final guard bytes could not be completely observed." });
  const receipt: HarnessRunReceipt = {
    schema_version: STRUCTURED_OUTPUT_SCHEMA_VERSION, kind: "spm-run-receipt", run_id: start.id,
    provider: start.provider, protocol: start.protocol, repo_root: start.root, session_id: native?.session_id ?? null,
    initial_snapshot: receiptSnapshot(start.snapshot), final_snapshot: finalSnapshot ? receiptSnapshot(finalSnapshot) : null, guard,
    invocation: { state: invocation.state, exit_code: invocation.exit_code, signal: invocation.signal,
      ...(invocation.cancellation_signal ? { cancellation_signal: invocation.cancellation_signal } : {}) },
    native_terminal: native?.terminal ?? null, started_at: start.startedAt, finished_at: new Date().toISOString(),
    spec_ids: [...new Set([...start.specIds, ...finalSpecIds])], task_ids: [...new Set([...start.taskIds, ...finalTaskIds])],
    changed_paths: [...new Set([...start.guard.changed_paths, ...guard.changed_paths])].sort(),
    verification: [], warnings: [...invocation.warnings, ...(native?.warnings ?? []), ...guard.warnings],
  };
  let path: string | null = null;
  try { path = await writeHarnessReceipt(start.root, boundHarnessReceipt(receipt)); }
  catch { errors.push({ type: "record", message: "Requested run receipt could not be saved; no saved receipt is claimed." }); }
  return {
    record: { requested: true, run_id: start.id, path, saved: path !== null, guard_complete: receipt.guard.complete },
    ...(errors.length ? { evidence_error: { ...errors[0]!, additional_errors: errors.slice(1) } } : {}),
    warnings: [...receipt.guard.warnings,
      "Run receipts contain local metadata only and have no automatic cleanup. Consider a local Git exclusion for .specpm/runs; SpM did not edit .gitignore."],
  };
}
