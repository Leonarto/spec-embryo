import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";
import type { HarnessProvider } from "../domain.ts";
import { withLock } from "../storage.ts";
import { canonicalJson } from "./resume-snapshot.ts";
import { atomicWriteHarnessText, containedHarnessPath, HarnessPathError, readHarnessText } from "./harness-paths.ts";
import { inspectHarnessInstructions } from "./harness-diagnostics.ts";
import { resolveExecutableOnPath } from "./harness-probe.ts";

const MANIFEST_PATH = ".specpm/harness-hooks.json";
const MATCHER = "^(startup|resume|compact)$";
type JsonRecord = Record<string, unknown>;
interface OwnershipEntry { provider: HarnessProvider; target: string; event: "SessionStart"; entry_hash: string }
interface HookManifest { version: 1; entries: OwnershipEntry[] }
export interface HarnessHookPlan {
  provider: HarnessProvider;
  operation: "install" | "remove";
  mode: "preview" | "applied" | "partial";
  target: string;
  manifest: string;
  action: "add" | "adopt" | "remove" | "none" | "conflict";
  changes: Array<{ path: string; before: string | null; after: string; diff: string }>;
  conflicts: string[];
  warnings: string[];
}
export class HarnessHookError extends Error {
  constructor(message: string, readonly exitCode = 2) { super(message); }
}

function record(value: unknown): value is JsonRecord { return value !== null && typeof value === "object" && !Array.isArray(value); }
function targetFor(provider: HarnessProvider): string { return provider === "codex" ? ".codex/hooks.json" : ".claude/settings.json"; }
export function harnessHookPreset(provider: HarnessProvider): JsonRecord {
  return { matcher: MATCHER, hooks: [{ type: "command", command: `spm agent hook-context --harness ${provider}`, timeout: 5 }] };
}
function entryHash(entry: unknown): string { return createHash("sha256").update(canonicalJson(entry)).digest("hex"); }
function parseJson(raw: string | null, label: string): JsonRecord {
  if (raw === null) return {};
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new HarnessHookError(`${label} is not valid JSON; no files were changed.`); }
  if (!record(parsed)) throw new HarnessHookError(`${label} must be a JSON object; no files were changed.`);
  return parsed;
}
function validateNative(native: JsonRecord): void {
  if (native.hooks === undefined) return;
  if (!record(native.hooks)) throw new HarnessHookError("Native hooks must be an object of event arrays.");
  for (const groups of Object.values(native.hooks)) {
    if (!Array.isArray(groups)) throw new HarnessHookError("Native hook events must contain matcher-group arrays.");
    for (const group of groups) {
      if (!record(group) || !Array.isArray(group.hooks) ||
        (group.matcher !== undefined && typeof group.matcher !== "string") ||
        group.hooks.some((handler) => !record(handler) || typeof handler.type !== "string")) {
        throw new HarnessHookError("Native hooks have an incompatible matcher/handler shape.");
      }
    }
  }
}
function parseManifest(raw: string | null): HookManifest {
  if (raw === null) return { version: 1, entries: [] };
  const parsed = parseJson(raw, "Harness ownership manifest");
  if (parsed.version !== 1 || !Array.isArray(parsed.entries)) throw new HarnessHookError("Unsupported harness ownership manifest.");
  const seen = new Set<string>();
  for (const entry of parsed.entries) {
    if (!record(entry) || (entry.provider !== "codex" && entry.provider !== "claude") ||
      entry.target !== targetFor(entry.provider) || entry.event !== "SessionStart" ||
      typeof entry.entry_hash !== "string" || !/^[a-f0-9]{64}$/.test(entry.entry_hash) || seen.has(entry.provider)) {
      throw new HarnessHookError("Invalid harness ownership entry; no ownership was assumed.");
    }
    seen.add(entry.provider);
  }
  return parsed as unknown as HookManifest;
}
function renderDiff(path: string, before: string | null, after: string): string {
  if (before === after) return "";
  return [`--- ${before === null ? "/dev/null" : path}`, `+++ ${path}`,
    ...(before ?? "").trimEnd().split("\n").filter((line) => before !== null || line).map((line) => `-${line}`),
    ...after.trimEnd().split("\n").map((line) => `+${line}`)].join("\n");
}

export async function buildHarnessHookPlan(rootDir: string, provider: HarnessProvider,
  operation: "install" | "remove" = "install"): Promise<HarnessHookPlan> {
  const root = await realpath(rootDir);
  const target = targetFor(provider);
  const before = await readHarnessText(root, target);
  const manifestBefore = await readHarnessText(root, MANIFEST_PATH);
  const native = parseJson(before, "Native hook configuration");
  validateNative(native);
  const manifest = parseManifest(manifestBefore);
  const preset = harnessHookPreset(provider);
  const expectedHash = entryHash(preset);
  const ownership = manifest.entries.find((entry) => entry.provider === provider);
  const groups = (record(native.hooks) ? native.hooks.SessionStart : undefined) as JsonRecord[] | undefined;
  const command = `spm agent hook-context --harness ${provider}`;
  const matches = (groups ?? []).map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => Array.isArray(entry.hooks) && entry.hooks.some((handler) => record(handler) && handler.command === command));
  const plan: HarnessHookPlan = { provider, operation, mode: "preview", target, manifest: MANIFEST_PATH,
    action: "none", changes: [], conflicts: [], warnings: [] };
  const conflict = (message: string) => { plan.action = "conflict"; plan.conflicts.push(message); };
  if (matches.length > 1) conflict("Multiple SpM command entries exist; ownership is ambiguous and no entries will be changed.");
  else if (matches.length === 1) {
    const match = matches[0]!;
    if ((match.entry.hooks as unknown[]).length !== 1) conflict("SpM and foreign handlers share a matcher group; the group cannot be adopted, replaced, or removed.");
    else if (match.entry.matcher !== MATCHER) conflict("The SpM command uses a different matcher; no duplicate preset will be added.");
    else if (ownership && ownership.entry_hash !== entryHash(match.entry)) conflict("Owned hook entry changed, including timeout or other fields; it will not be overwritten or removed.");
    else if (!ownership && entryHash(match.entry) !== expectedHash) conflict("A matching SpM signature has different complete entry fields; it cannot be adopted. Review the preset diff manually.");
    else if (operation === "remove" && !ownership) conflict("An identical hook has no ownership manifest; remove will not assume ownership.");
    else if (operation === "remove") {
      (native.hooks as JsonRecord).SessionStart = groups!.filter((_, index) => index !== match.index);
      manifest.entries = manifest.entries.filter((entry) => entry.provider !== provider);
      plan.action = "remove";
    } else if (!ownership) {
      manifest.entries.push({ provider, target, event: "SessionStart", entry_hash: expectedHash });
      plan.action = "adopt";
      plan.warnings.push("An identical native entry exists without ownership. Apply records explicit adoption without rewriting that configuration.");
    }
  } else if (ownership) conflict("The owned native hook entry is missing; reconcile the manifest manually before making changes.");
  else if (operation === "install") {
    native.hooks ??= {};
    (native.hooks as JsonRecord).SessionStart = [...(groups ?? []), preset];
    manifest.entries.push({ provider, target, event: "SessionStart", entry_hash: expectedHash });
    plan.action = "add";
  }
  if (!plan.conflicts.length && plan.action !== "none") {
    if (plan.action !== "adopt") {
      const after = `${JSON.stringify(native, null, 2)}\n`;
      plan.changes.push({ path: target, before, after, diff: renderDiff(target, before, after) });
    }
    const manifestAfter = `${JSON.stringify(manifest, null, 2)}\n`;
    if (manifestAfter !== manifestBefore) plan.changes.push({ path: MANIFEST_PATH, before: manifestBefore,
      after: manifestAfter, diff: renderDiff(MANIFEST_PATH, manifestBefore, manifestAfter) });
  }
  if (plan.conflicts.length && matches.length === 1) {
    plan.warnings.push(`Desired preset comparison:\n${renderDiff(target, JSON.stringify(matches[0]!.entry, null, 2), JSON.stringify(preset, null, 2))}`);
  }
  const inspection = await inspectHarnessInstructions(root, provider);
  plan.warnings.push(...inspection.warnings);
  if (JSON.stringify(native).includes("spm agent hook-context") && !matches.length) {
    plan.warnings.push("Other SpM-like context handlers exist; review possible duplicate context before applying this preset.");
  }
  if (!(await resolveExecutableOnPath("spm", root))) plan.warnings.push("spm was not found on PATH; the preview remains useful, but hook execution is unverified.");
  plan.warnings.push("The harness controls trust and permissions. This preset does not grant either or certify effective hook loading.");
  return plan;
}

export async function applyHarnessHookPlan(rootDir: string, provider: HarnessProvider,
  operation: "install" | "remove" = "install"): Promise<HarnessHookPlan> {
  const lock = await containedHarnessPath(rootDir, ".specpm/locks/document-create.lock");
  return withLock(lock, async () => {
    const plan = await buildHarnessHookPlan(rootDir, provider, operation);
    if (plan.conflicts.length) return plan;
    let nativeWritten = false;
    try {
      for (const change of plan.changes) {
        if (await readHarnessText(rootDir, change.path) !== change.before) {
          throw new HarnessHookError("Hook configuration changed during apply; re-run the preview instead of overwriting it.");
        }
        await atomicWriteHarnessText(rootDir, change.path, change.after);
        if (change.path === plan.target) nativeWritten = true;
      }
      plan.mode = "applied";
      return plan;
    } catch (error) {
      if (!nativeWritten) throw error;
      plan.mode = "partial";
      plan.warnings.push(operation === "install"
        ? "Native configuration was written but ownership persistence failed. Rerun the preview to adopt the identical entry; no duplicate entry is needed."
        : "Native removal was written but ownership persistence failed. Reconcile the stale manifest manually; no further entries will be removed automatically.");
      return plan;
    }
  });
}

export function harnessHookFailureCode(error: unknown): number {
  return error instanceof HarnessHookError || error instanceof HarnessPathError ? error.exitCode : 1;
}
export function renderHarnessHookPlan(plan: HarnessHookPlan): string {
  return [`${plan.provider} context hook ${plan.operation}: ${plan.action} (${plan.mode})`,
    `Target: ${plan.target}`, `Ownership: ${plan.manifest}`,
    ...plan.conflicts.map((entry) => `Conflict: ${entry}`), ...plan.warnings.map((entry) => `Warning: ${entry}`),
    ...plan.changes.map((entry) => entry.diff),
    ...(plan.mode === "preview" && !plan.conflicts.length ? ["Use --apply with install/remove to write this plan."] : [])].join("\n");
}
