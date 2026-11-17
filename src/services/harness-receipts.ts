import { lstat, mkdir, realpath, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { HarnessInvocation, HarnessProtocol, HarnessProvider, ResumeContextSnapshot } from "../domain.ts";
import { STRUCTURED_OUTPUT_SCHEMA_VERSION } from "./contracts.ts";
import type { HarnessGuard } from "./harness-guard.ts";
import { normalizeGuardPath } from "./harness-guard.ts";
import { containedHarnessPath, readHarnessText } from "./harness-paths.ts";
import { validNativeSessionId } from "./harness-native.ts";
import { utf8Prefix } from "./resume-render.ts";

export const RUN_RECEIPT_MAX_BYTES = 1048576;
export type ReceiptSnapshot = Pick<ResumeContextSnapshot, "head" | "branch" | "dirty" | "fingerprint">;
export interface HarnessRunReceipt {
  schema_version: string;
  kind: "spm-run-receipt";
  run_id: string;
  provider: HarnessProvider;
  protocol: HarnessProtocol | null;
  repo_root: string;
  session_id: string | null;
  initial_snapshot: ReceiptSnapshot;
  final_snapshot: ReceiptSnapshot | null;
  guard: HarnessGuard;
  invocation: Pick<HarnessInvocation, "state" | "exit_code" | "signal" | "cancellation_signal">;
  native_terminal: "completed" | "failed" | "unknown" | null;
  started_at: string;
  finished_at: string;
  spec_ids: string[];
  task_ids: string[];
  changed_paths: string[];
  verification: never[];
  warnings: string[];
}
export class HarnessReceiptError extends Error { readonly exitCode = 2; }
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function receiptRelativePath(id: string): string {
  if (!uuid.test(id)) throw new HarnessReceiptError("Expected an exact SpM-generated receipt UUID; free paths and latest are unsupported.");
  return `.specpm/runs/${id}.json`;
}
export function receiptSnapshot(snapshot: ResumeContextSnapshot): ReceiptSnapshot {
  return { head: snapshot.head, branch: snapshot.branch, dirty: snapshot.dirty, fingerprint: snapshot.fingerprint };
}
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function exact(value: unknown, keys: string[]): value is Record<string, unknown> {
  return record(value) && Object.keys(value).every((key) => keys.includes(key)) && keys.every((key) => key in value);
}
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.every((entry) => typeof entry === "string"); }
function sha(value: unknown) { return typeof value === "string" && /^[a-f0-9]{64}$/.test(value); }
function snapshotValid(value: unknown): boolean {
  return exact(value, ["head", "branch", "dirty", "fingerprint"]) &&
    (value.head === null || typeof value.head === "string" && /^[a-f0-9]{40,64}$/.test(value.head)) &&
    (value.branch === null || typeof value.branch === "string") && typeof value.dirty === "boolean" && sha(value.fingerprint);
}
function pathsValid(value: unknown): value is string[] {
  if (!strings(value) || value.length > 10000 || new Set(value).size !== value.length) return false;
  try { return value.every((path) => normalizeGuardPath(path) === path); } catch { return false; }
}
export function validHarnessReceipt(value: unknown): value is HarnessRunReceipt {
  if (!exact(value, ["schema_version", "kind", "run_id", "provider", "protocol", "repo_root", "session_id", "initial_snapshot", "final_snapshot",
    "guard", "invocation", "native_terminal", "started_at", "finished_at", "spec_ids", "task_ids", "changed_paths", "verification", "warnings"])) return false;
  if (value.schema_version !== STRUCTURED_OUTPUT_SCHEMA_VERSION || value.kind !== "spm-run-receipt" || typeof value.run_id !== "string" || !uuid.test(value.run_id) ||
    (value.provider !== "codex" && value.provider !== "claude") ||
    (value.protocol !== null && (typeof value.protocol !== "string" ||
      (value.provider === "codex" ? value.protocol !== "codex-jsonl" : !["claude-json", "claude-stream-json"].includes(value.protocol)))) ||
    typeof value.repo_root !== "string" || (value.session_id !== null && !validNativeSessionId(value.session_id)) ||
    !snapshotValid(value.initial_snapshot) || (value.final_snapshot !== null && !snapshotValid(value.final_snapshot)) ||
    !strings(value.spec_ids) || !strings(value.task_ids) || !pathsValid(value.changed_paths) || !Array.isArray(value.verification) || value.verification.length !== 0 ||
    !strings(value.warnings) || value.warnings.length > 32 || value.warnings.some((entry) => Buffer.byteLength(entry) > 256) ||
    typeof value.started_at !== "string" || !Number.isFinite(Date.parse(value.started_at)) || typeof value.finished_at !== "string" || !Number.isFinite(Date.parse(value.finished_at)) ||
    (value.native_terminal !== null && (typeof value.native_terminal !== "string" || !["completed", "failed", "unknown"].includes(value.native_terminal)))) return false;
  if (!record(value.invocation) || Object.keys(value.invocation).some((key) => !["state", "exit_code", "signal", "cancellation_signal"].includes(key)) ||
    typeof value.invocation.state !== "string" || !["completed", "failed", "cancelled", "timed_out", "unknown"].includes(value.invocation.state) ||
    (value.invocation.exit_code !== null && !Number.isSafeInteger(value.invocation.exit_code)) ||
    (value.invocation.signal !== null && (typeof value.invocation.signal !== "string" || !/^SIG[A-Z0-9]+$/.test(value.invocation.signal))) ||
    (value.invocation.cancellation_signal !== undefined && value.invocation.cancellation_signal !== "SIGINT" && value.invocation.cancellation_signal !== "SIGTERM")) return false;
  const guard = value.guard;
  if (!exact(guard, ["complete", "capture_error", "head", "changed_paths", "entries", "omitted_paths", "warnings"]) ||
    typeof guard.complete !== "boolean" || typeof guard.capture_error !== "boolean" ||
    (guard.head !== null && (typeof guard.head !== "string" || !/^[a-f0-9]{40,64}$/.test(guard.head))) ||
    !pathsValid(guard.changed_paths) || !Number.isSafeInteger(guard.omitted_paths) || Number(guard.omitted_paths) < 0 ||
    !strings(guard.warnings) || guard.warnings.length > 32 || !Array.isArray(guard.entries) || guard.entries.length > 10000) return false;
  const seen = new Set<string>();
  for (const entry of guard.entries) {
    if (!exact(entry, ["path", "kind", "hash"]) || typeof entry.path !== "string" || typeof entry.kind !== "string" || seen.has(entry.path)) return false;
    try { if (normalizeGuardPath(entry.path) !== entry.path) return false; } catch { return false; }
    seen.add(entry.path);
    if ((entry.kind === "file" || entry.kind === "symlink") ? !sha(entry.hash) :
      !["missing", "unavailable"].includes(entry.kind) || entry.hash !== null) return false;
    if (entry.path === `.specpm/runs/${value.run_id}.json`) return false;
  }
  if (guard.changed_paths.includes(`.specpm/runs/${value.run_id}.json`)) return false;
  if (guard.complete && (guard.capture_error || Number(guard.omitted_paths) !== 0 || guard.entries.some((entry) => entry.kind === "unavailable") || guard.changed_paths.some((path) => !seen.has(path)))) return false;
  return true;
}

async function checkedRunsPath(rootDir: string, create: boolean): Promise<string> {
  const path = await containedHarnessPath(rootDir, ".specpm/runs");
  try {
    const stat = await lstat(join(rootDir, ".specpm/runs"));
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new HarnessReceiptError("Run receipt directory must be a real directory inside this repo.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    if (!create) throw new HarnessReceiptError("Run receipt directory is unavailable; start with new portable context.");
    await mkdir(path, { recursive: true, mode: 0o700 });
  }
  if ((await lstat(join(rootDir, ".specpm/runs"))).isSymbolicLink()) throw new HarnessReceiptError("Run receipt directory cannot be a symlink.");
  return path;
}
export async function readHarnessReceipt(rootDir: string, id: string): Promise<HarnessRunReceipt> {
  const local = receiptRelativePath(id);
  const root = await realpath(rootDir);
  await checkedRunsPath(root, false);
  const path = join(root, local);
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new HarnessReceiptError("Run receipt must be a regular non-symlink file.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new HarnessReceiptError("Run receipt was not found; start with new portable context.");
    throw error;
  }
  let raw;
  try { raw = await readHarnessText(root, local, RUN_RECEIPT_MAX_BYTES, { allowLeafSymlink: false }); }
  catch (error) {
    if (error instanceof TypeError && (error as NodeJS.ErrnoException).code === "ERR_ENCODING_INVALID_ENCODED_DATA") {
      throw new HarnessReceiptError("Run receipt is not valid UTF-8.");
    }
    throw error;
  }
  let parsed;
  try { parsed = JSON.parse(raw ?? ""); } catch { throw new HarnessReceiptError("Run receipt is not valid JSON."); }
  if (!validHarnessReceipt(parsed) || parsed.run_id !== id) throw new HarnessReceiptError("Run receipt does not match the supported exact schema.");
  if (parsed.repo_root !== root) throw new HarnessReceiptError("Run receipt belongs to a different repo/worktree or moved root; start with new portable context.");
  return parsed;
}

export function boundHarnessReceipt(receipt: HarnessRunReceipt): HarnessRunReceipt {
  receipt.warnings = receipt.warnings.slice(0, 32).map((warning) => utf8Prefix(warning, 256));
  if (receipt.guard.changed_paths.length > 10000 || receipt.changed_paths.length > 10000) {
    receipt.guard.complete = false;
    receipt.guard.changed_paths = receipt.guard.changed_paths.slice(0, 10000);
    receipt.changed_paths = receipt.changed_paths.slice(0, 10000);
  }
  let text = JSON.stringify(receipt);
  while (Buffer.byteLength(text) > RUN_RECEIPT_MAX_BYTES) {
    receipt.guard.complete = false;
    if (!receipt.guard.warnings.includes("Receipt exceeded 1048576 bytes; guard data was offloaded and apply is disabled.")) {
      receipt.guard.warnings.push("Receipt exceeded 1048576 bytes; guard data was offloaded and apply is disabled.");
    }
    const arrays = [receipt.guard.entries, receipt.guard.changed_paths, receipt.changed_paths, receipt.spec_ids, receipt.task_ids];
    const largest = arrays.sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0]!;
    if (!largest.length) throw new Error("Receipt metadata exceeds its storage limit.");
    const removed = Math.ceil(largest.length / 2);
    largest.splice(largest.length - removed, removed);
    receipt.guard.omitted_paths += removed;
    text = JSON.stringify(receipt);
  }
  return receipt;
}

export async function writeHarnessReceipt(rootDir: string, receipt: HarnessRunReceipt): Promise<string> {
  const root = await realpath(rootDir);
  if (receipt.repo_root !== root || !validHarnessReceipt(receipt)) throw new HarnessReceiptError("Refusing an invalid run receipt.");
  const local = receiptRelativePath(receipt.run_id);
  const text = JSON.stringify(receipt);
  if (Buffer.byteLength(text) > RUN_RECEIPT_MAX_BYTES) throw new HarnessReceiptError("Run receipt exceeds 1048576 bytes.");
  const runs = await checkedRunsPath(root, true);
  const path = await containedHarnessPath(root, local);
  if (path !== join(runs, `${receipt.run_id}.json`)) throw new HarnessReceiptError("Receipt target changed during preparation.");
  await writeFile(path, text, { encoding: "utf8", mode: 0o600, flag: "wx" });
  return local;
}
