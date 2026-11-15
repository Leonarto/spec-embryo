import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { captureHarnessGuard, guardsMatch, hashGuardPath, parseGitGuardPaths, verifyGuardLease } from "../src/services/harness-guard.ts";
import { withLock } from "../src/storage.ts";

function git(root: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "spm-guard-"));
  git(root, ["init"]); git(root, ["config", "user.name", "SpM fixture"]); git(root, ["config", "user.email", "spm@example.test"]);
  await writeFile(join(root, "dirty.txt"), "baseline\n"); await writeFile(join(root, "old.txt"), "rename baseline\n");
  git(root, ["add", "."]); git(root, ["commit", "-m", "initial"]);
  return root;
}

describe("independent execution evidence guard", () => {
  test("a second edit to an already dirty file invalidates hashes even when Git status is identical", async () => {
    const root = await fixture();
    try {
      await writeFile(join(root, "dirty.txt"), "first\n");
      const first = await captureHarnessGuard(root);
      await writeFile(join(root, "dirty.txt"), "again\n");
      const second = await captureHarnessGuard(root, { observedPaths: first.entries.map((entry) => entry.path) });
      expect(first.complete).toBe(true); expect(second.complete).toBe(true);
      expect(first.changed_paths).toEqual(second.changed_paths); expect(first.head).toBe(second.head);
      expect(guardsMatch(first, second)).toBe(false);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("NUL-delimited renames and expanded untracked paths preserve Unicode/spaces/newlines/backslashes", async () => {
    const root = await fixture();
    try {
      const renamed = "new\n🌍 spaced.txt";
      git(root, ["mv", "old.txt", renamed]);
      await mkdir(join(root, "untracked"));
      const untracked = "untracked/a\\b 🌍\n.txt";
      await writeFile(join(root, untracked), "literal path");
      const guard = await captureHarnessGuard(root);
      expect(guard.complete).toBe(true);
      expect(guard.changed_paths).toContain(renamed); expect(guard.changed_paths).toContain("old.txt"); expect(guard.changed_paths).toContain(untracked);
      expect(guard.entries.find((entry) => entry.path === "old.txt")?.kind).toBe("missing");
      expect(guard.entries.find((entry) => entry.path === renamed)?.kind).toBe("file");
      expect(parseGitGuardPaths(Buffer.from(`R  ${renamed}\0old.txt\0?? ${untracked}\0`))).toEqual(guard.changed_paths);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("final symlinks hash their link data without reading outside; outside parents are incomplete", async () => {
    const root = await fixture(); const outside = await mkdtemp(join(tmpdir(), "spm-guard-outside-"));
    try {
      await writeFile(join(outside, "secret"), "PRIVATE_OUTSIDE_CONTENT");
      await symlink(join(outside, "secret"), join(root, "leaf"));
      const before = await hashGuardPath(root, "leaf");
      expect(before.kind).toBe("symlink");
      await writeFile(join(outside, "secret"), "changed outside");
      expect(await hashGuardPath(root, "leaf")).toEqual(before);
      await symlink(outside, join(root, "parent"));
      const guard = await captureHarnessGuard(root, { observedPaths: ["parent/secret"] });
      expect(guard.complete).toBe(false); expect(guard.capture_error).toBe(true);
      expect(guard.entries.find((entry) => entry.path === "parent/secret")?.kind).toBe("unavailable");
      expect(JSON.stringify(guard)).not.toContain("PRIVATE_OUTSIDE_CONTENT");
    } finally { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
  });

  test("only this verified untracked lease owner is excluded during comparison", async () => {
    const root = await fixture();
    try {
      const expected = await captureHarnessGuard(root);
      const lockPath = join(root, ".specpm/locks/document-create.lock");
      await withLock(lockPath, async (lease) => {
        expect(Object.isFrozen(lease)).toBe(true); expect(lease.pid).toBe(process.pid);
        expect(await verifyGuardLease(root, lease)).toBe(".specpm/locks/document-create.lock/owner.json");
        const actual = await captureHarnessGuard(root, { observedPaths: expected.entries.map((entry) => entry.path), lease, expected });
        expect(guardsMatch(expected, actual)).toBe(true);
        await writeFile(join(lockPath, "foreign-extra"), "not excluded");
        await mkdir(join(root, ".specpm/locks/other")); await writeFile(join(root, ".specpm/locks/other/owner.json"), "foreign");
        const changed = await captureHarnessGuard(root, { lease, expected });
        expect(changed.changed_paths).toContain(".specpm/locks/document-create.lock/foreign-extra");
        expect(changed.changed_paths).toContain(".specpm/locks/other/owner.json");
        expect(guardsMatch(expected, changed)).toBe(false);
      });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("tracked, previously observed, changed, or symlink lease owners are never hidden", async () => {
    for (const variant of ["tracked", "observed", "changed", "symlink"]) {
      const root = await fixture();
      try {
        const expected = await captureHarnessGuard(root);
        const lockPath = join(root, ".specpm/locks/document-create.lock");
        await withLock(lockPath, async (lease) => {
          const local = ".specpm/locks/document-create.lock/owner.json";
          const path = join(root, local);
          if (variant === "tracked") git(root, ["add", "--", local]);
          if (variant === "observed") expected.changed_paths.push(local);
          if (variant === "changed") await writeFile(path, JSON.stringify({ token: "foreign", pid: process.pid }));
          if (variant === "symlink") {
            const bytes = await readFile(path); await rm(path); await writeFile(join(root, "owner-copy"), bytes); await symlink(join(root, "owner-copy"), path);
          }
          const guard = await captureHarnessGuard(root, { lease, expected });
          expect(guard.complete).toBe(false);
          expect(guard.changed_paths).toContain(local);
        });
      } finally { await rm(root, { recursive: true, force: true }); }
    }
  });

  test("own receipt exclusion is exact, and other receipts/files remain observed", async () => {
    const root = await fixture();
    try {
      await mkdir(join(root, ".specpm/runs"), { recursive: true });
      await writeFile(join(root, ".specpm/runs/own.json"), "own"); await writeFile(join(root, ".specpm/runs/other.json"), "other");
      const guard = await captureHarnessGuard(root, { excludeReceiptPath: ".specpm/runs/own.json" });
      expect(guard.changed_paths).not.toContain(".specpm/runs/own.json");
      expect(guard.changed_paths).toContain(".specpm/runs/other.json");
      expect(guard.entries.some((entry) => entry.path === ".specpm/runs/other.json")).toBe(true);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("regular managed bytes are verified while managed symlinks remain explicitly incomplete", async () => {
    const root = await fixture();
    try {
      const hash = createHash("sha256").update(await readFile(join(root, "dirty.txt"))).digest("hex");
      const regular = await captureHarnessGuard(root, { managedSources: [{ path: "dirty.txt", content_hash: hash }] });
      expect(regular.complete).toBe(true);
      await symlink("dirty.txt", join(root, "managed-link"));
      const linked = await captureHarnessGuard(root, { managedSources: [{ path: "managed-link", content_hash: hash }] });
      expect(linked.complete).toBe(false); expect(linked.warnings.join(" ")).toContain("managed-source-bytes-unverified");
      expect(linked.warnings.join(" ")).not.toContain("changed between snapshot");
      expect(linked.entries.find((entry) => entry.path === "managed-link")?.kind).toBe("symlink");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("the 10000-path observation limit is explicit and never enables apply", async () => {
    const root = await fixture();
    try {
      const guard = await captureHarnessGuard(root, { observedPaths: Array.from({ length: 10001 }, (_, index) => `absent-${index}`) });
      expect(guard.complete).toBe(false); expect(guard.entries).toHaveLength(10000); expect(guard.omitted_paths).toBe(1);
      expect(guard.warnings.join(" ")).toContain("10000 paths");
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 15000);

  test("unsafe/unsupported paths and unavailable Git leave an incomplete useful observation", async () => {
    const root = await fixture();
    try {
      const guard = await captureHarnessGuard(root, { observedPaths: ["../outside", "absent.txt", ".git"] });
      expect(guard.complete).toBe(false); expect(guard.capture_error).toBe(true);
      expect(guard.entries.find((entry) => entry.path === "absent.txt")?.kind).toBe("missing");
      expect(guard.entries.find((entry) => entry.path === ".git")?.kind).toBe("unavailable");
      await rm(join(root, ".git"), { recursive: true });
      const noGit = await captureHarnessGuard(root);
      expect(noGit.complete).toBe(false); expect(noGit.head).toBeNull();
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
