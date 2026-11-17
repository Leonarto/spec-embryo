import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readlink, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, posix, sep } from "node:path";
import type { LockLease } from "../storage.ts";
import { containedHarnessPath } from "./harness-paths.ts";
import { canonicalJson } from "./resume-snapshot.ts";

export const MAX_GUARD_PATHS = 10000;
export interface GuardEntry { path: string; kind: "file" | "symlink" | "missing" | "unavailable"; hash: string | null }
export interface HarnessGuard {
  complete: boolean;
  capture_error: boolean;
  head: string | null;
  changed_paths: string[];
  entries: GuardEntry[];
  omitted_paths: number;
  warnings: string[];
}
export interface GitGuardState { available: boolean; head: string | null; changed_paths: string[] }
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export function normalizeGuardPath(path: string): string {
  const normalized = process.platform === "win32" ? path.replaceAll("\\", "/") : path;
  if (!path || path.includes("\0") || isAbsolute(path) || posix.isAbsolute(normalized) ||
    process.platform === "win32" && /^[A-Za-z]:/.test(path)) throw new Error("Invalid relative guard path");
  if (posix.normalize(normalized) !== normalized || normalized.split("/").some((part) => part === ".." || part === ".")) {
    throw new Error("Guard path is not normalized");
  }
  return normalized;
}

export function parseGitGuardPaths(output: Buffer): string[] {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(output);
  const records = text.split("\0");
  const paths: string[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const item = records[index]!;
    if (!item) continue;
    if (item.length < 4 || item[2] !== " ") throw new Error("Malformed Git status record");
    paths.push(normalizeGuardPath(item.slice(3)));
    if (/[RC]/.test(item.slice(0, 2))) {
      const old = records[++index];
      if (!old) throw new Error("Malformed Git rename record");
      paths.push(normalizeGuardPath(old));
    }
  }
  return [...new Set(paths)].sort(compare);
}

function git(root: string, args: string[]) {
  return spawnSync("git", args, { cwd: root, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" }, maxBuffer: 16777216 });
}
export function readGitGuardState(root: string): GitGuardState {
  const status = git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  if (status.status !== 0) return { available: false, head: null, changed_paths: [] };
  const head = git(root, ["rev-parse", "--verify", "HEAD"]);
  const sha = head.status === 0 ? head.stdout.toString("utf8").trim() : null;
  return { available: true, head: sha && /^[a-f0-9]{40,64}$/.test(sha) ? sha : null,
    changed_paths: parseGitGuardPaths(status.stdout) };
}

function stamp(stat: { dev: bigint; ino: bigint; size: bigint; mtimeNs: bigint; ctimeNs: bigint }): string {
  return [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].join(":");
}
export async function hashGuardPath(root: string, localPath: string): Promise<GuardEntry> {
  const normalized = normalizeGuardPath(localPath);
  // Validate real parents, but do not follow a final symlink outside the repo.
  const parent = await containedHarnessPath(root, dirname(normalized));
  const path = join(parent, basename(normalized));
  let handle;
  try {
    const before = await lstat(path, { bigint: true });
    if (before.isSymbolicLink()) {
      const target = await readlink(path, { encoding: "buffer" });
      if (stamp(before) !== stamp(await lstat(path, { bigint: true }))) throw new Error("Guard path changed during observation");
      return { path: normalized, kind: "symlink", hash: createHash("sha256").update("symlink\0").update(target).digest("hex") };
    }
    if (!before.isFile()) throw new Error("Unsupported guard path type");
    handle = await open(path, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0) | (constants.O_NOFOLLOW ?? 0));
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || stamp(before) !== stamp(opened)) throw new Error("Guard path changed during observation");
    const hash = createHash("sha256");
    for await (const chunk of handle.createReadStream({ autoClose: false })) hash.update(chunk);
    if (stamp(opened) !== stamp(await handle.stat({ bigint: true })) || stamp(opened) !== stamp(await lstat(path, { bigint: true }))) {
      throw new Error("Guard path changed during observation");
    }
    return { path: normalized, kind: "file", hash: hash.digest("hex") };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { path: normalized, kind: "missing", hash: null };
    throw error;
  } finally { await handle?.close(); }
}

export async function verifyGuardLease(root: string, lease: Readonly<LockLease>): Promise<string | null> {
  let handle;
  try {
    const canonicalRoot = await realpath(root);
    const local = relative(canonicalRoot, join(await realpath(lease.lockPath), "owner.json")).split(sep).join("/");
    if (local !== ".specpm/locks/document-create.lock/owner.json" || lease.pid !== process.pid) return null;
    const parent = await containedHarnessPath(canonicalRoot, dirname(local));
    const path = join(parent, basename(local));
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 4096) return null;
    handle = await open(path, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0) | (constants.O_NOFOLLOW ?? 0));
    if (!(await handle.stat()).isFile()) return null;
    const buffer = Buffer.alloc(4097);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > 4096) return null;
    const owner = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, bytesRead)));
    if (owner.token !== lease.token || owner.pid !== lease.pid) return null;
    // A tracked owner is project state, never an ignorable operation artifact.
    if (git(canonicalRoot, ["ls-files", "--error-unmatch", "--", local]).status !== 1) return null;
    return local;
  } catch { return null; }
  finally { await handle?.close(); }
}

export async function captureHarnessGuard(rootDir: string, options: {
  observedPaths?: string[]; managedSources?: Array<{ path: string; content_hash: string | null }>;
  excludeReceiptPath?: string; lease?: Readonly<LockLease>; expected?: HarnessGuard;
} = {}): Promise<HarnessGuard> {
  const root = await realpath(rootDir);
  const warnings: string[] = [];
  let captureError = false;
  let complete = true;
  let state: GitGuardState;
  try { state = readGitGuardState(root); }
  catch { state = { available: false, head: null, changed_paths: [] }; captureError = true; }
  if (!state.available) { complete = false; warnings.push("Git change observation is unavailable; handoff apply is disabled."); }
  const excluded = options.excludeReceiptPath;
  let ignoredOwner: string | null = null;
  if (options.lease) {
    ignoredOwner = await verifyGuardLease(root, options.lease);
    if (ignoredOwner && (options.expected?.changed_paths.includes(ignoredOwner) || options.expected?.entries.some((entry) => entry.path === ignoredOwner))) ignoredOwner = null;
    if (!ignoredOwner) { complete = false; warnings.push("Current write-lock ownership could not be safely excluded from the guard."); }
  }
  const visible = (path: string) => path !== excluded && path !== ignoredOwner;
  const changedPaths = state.changed_paths.filter(visible);
  const candidates: string[] = [];
  for (const path of [...changedPaths, ...(options.observedPaths ?? []), ...(options.managedSources ?? []).map((source) => source.path)].filter(visible)) {
    try { candidates.push(normalizeGuardPath(path)); } catch { complete = false; captureError = true; }
  }
  let paths = [...new Set(candidates)].sort(compare);
  const omitted = Math.max(0, paths.length - MAX_GUARD_PATHS);
  if (omitted) { complete = false; warnings.push("Guard observation exceeded 10000 paths; handoff apply is disabled."); paths = paths.slice(0, MAX_GUARD_PATHS); }
  const entries: GuardEntry[] = [];
  const sources = new Map((options.managedSources ?? []).map((source) => [source.path, source]));
  for (const path of paths) {
    try {
      const entry = await hashGuardPath(root, path);
      entries.push(entry);
      const source = sources.get(path);
      if (source?.content_hash && entry.kind !== "file") {
        complete = false; warnings.push("managed-source-bytes-unverified: Selected managed bytes were not captured by a regular in-root guard entry.");
      } else if (source?.content_hash && source.content_hash !== entry.hash) {
        complete = false; warnings.push("Managed source changed between snapshot and guard observation.");
      }
    } catch {
      entries.push({ path, kind: "unavailable", hash: null });
      complete = false; captureError = true;
    }
  }
  if (captureError) warnings.push("Some guard bytes could not be safely observed; handoff apply is disabled.");
  try {
    const after = readGitGuardState(root);
    if (!after.available || after.head !== state.head || canonicalJson(after.changed_paths.filter(visible)) !== canonicalJson(changedPaths)) {
      complete = false; warnings.push("Repository changed during guard observation; handoff apply is disabled.");
    }
  } catch { complete = false; captureError = true; warnings.push("Final Git observation failed; handoff apply is disabled."); }
  return { complete, capture_error: captureError, head: state.head, changed_paths: changedPaths,
    entries, omitted_paths: omitted, warnings: [...new Set(warnings)].slice(0, 32) };
}

export function guardsMatch(expected: HarnessGuard, actual: HarnessGuard): boolean {
  return expected.complete && actual.complete && expected.head === actual.head &&
    canonicalJson(expected.changed_paths) === canonicalJson(actual.changed_paths) && canonicalJson(expected.entries) === canonicalJson(actual.entries);
}
