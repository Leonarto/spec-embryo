import { realpath } from "node:fs/promises";
import type { HarnessRunReceipt } from "./harness-receipts.ts";
import { readHarnessReceipt, receiptRelativePath } from "./harness-receipts.ts";
import { captureHarnessGuard, guardsMatch, verifyGuardLease } from "./harness-guard.ts";
import { containedHarnessPath } from "./harness-paths.ts";
import { loadRootedHarnessContext } from "./harness-context.ts";
import { withLock } from "../storage.ts";
import { writeHandoff } from "../repository.ts";

export interface RunHandoffDraft {
  run_id: string;
  provider: HarnessRunReceipt["provider"];
  protocol: HarnessRunReceipt["protocol"];
  initial_snapshot: HarnessRunReceipt["initial_snapshot"];
  final_snapshot: HarnessRunReceipt["final_snapshot"];
  invocation: HarnessRunReceipt["invocation"];
  native_terminal: HarnessRunReceipt["native_terminal"];
  spec_ids: string[];
  task_ids: string[];
  changed_paths: string[];
  verification: never[];
  can_apply: boolean;
  conflicts: string[];
  body: string;
}
function draftFrom(receipt: HarnessRunReceipt, conflicts: string[]): RunHandoffDraft {
  const body = ["# Observed run checkpoint", "", `Run: ${receipt.run_id}`, `Provider/protocol: ${receipt.provider} / ${receipt.protocol ?? "generic"}`,
    `Initial observed snapshot: ${receipt.initial_snapshot.fingerprint}`, `Final observed snapshot: ${receipt.final_snapshot?.fingerprint ?? "unavailable"}`,
    `Process state: ${receipt.invocation.state}; exit code: ${receipt.invocation.exit_code ?? "none"}; signal: ${receipt.invocation.signal ?? "none"}`,
    `Native terminal: ${receipt.native_terminal ?? "not selected"}`, "", "## Specification and task references", "", "```json",
    JSON.stringify({ spec_ids: receipt.spec_ids, task_ids: receipt.task_ids }), "```", "", "## Observed changed paths", "", "```json",
    JSON.stringify(receipt.changed_paths), "```", "", "## Observed verification", "", "No verification commands were recorded. Process success is not evidence that tests passed or work is done.",
    "", "Review remains required; this handoff does not update task status."].join("\n");
  return { run_id: receipt.run_id, provider: receipt.provider, protocol: receipt.protocol,
    initial_snapshot: receipt.initial_snapshot, final_snapshot: receipt.final_snapshot,
    invocation: receipt.invocation, native_terminal: receipt.native_terminal,
    spec_ids: receipt.spec_ids, task_ids: receipt.task_ids, changed_paths: receipt.changed_paths,
    verification: [], can_apply: !conflicts.length, conflicts, body };
}

export async function prepareRunHandoff(rootDir: string, id: string, options: { apply?: boolean; note?: string } = {}): Promise<{
  draft: RunHandoffDraft; applied: boolean; file_path?: string;
}> {
  const root = await realpath(rootDir);
  if (!options.apply) {
    const receipt = await readHarnessReceipt(root, id);
    const guard = await captureHarnessGuard(root, { observedPaths: receipt.guard.entries.map((entry) => entry.path),
      excludeReceiptPath: receiptRelativePath(id), expected: receipt.guard });
    const conflicts = guardsMatch(receipt.guard, guard) ? [] : ["Repository observation differs from the run's final guard or the guard is incomplete; apply is disabled."];
    return { draft: draftFrom(receipt, conflicts), applied: false };
  }
  const lockPath = await containedHarnessPath(root, ".specpm/locks/document-create.lock");
  return withLock(lockPath, async (lease) => {
    const receipt = await readHarnessReceipt(root, id);
    const guard = await captureHarnessGuard(root, { observedPaths: receipt.guard.entries.map((entry) => entry.path),
      excludeReceiptPath: receiptRelativePath(id), lease, expected: receipt.guard });
    const draft = draftFrom(receipt, guardsMatch(receipt.guard, guard) ? [] : ["Repository changed or the final guard is incomplete; no handoff was written."]);
    if (!draft.can_apply) return { draft, applied: false };
    const context = await loadRootedHarnessContext(root);
    if (!await verifyGuardLease(root, lease)) {
      return { draft: draftFrom(receipt, ["Write-lock ownership changed; no handoff was written."]), applied: false };
    }
    const createdAt = new Date().toISOString();
    const handoffId = `HANDOFF-${createdAt.replace(/[-:]/g, "").replace(/\..+/, "")}-RUN-${id.slice(0, 8)}`;
    const filePath = await writeHandoff(root, context.currentState, {
      id: handoffId, title: `Run ${id} checkpoint`, summary: "Observed execution checkpoint; verification and review remain required.",
      createdAt, activeTaskIds: receipt.task_ids, relatedSpecIds: receipt.spec_ids, author: "spec-embryo",
      body: options.note ? `${draft.body}\n\n## Additional Note\n\n${options.note}` : draft.body,
    }, { config: context.config });
    return { draft, applied: true, file_path: filePath };
  });
}
