import { describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { initializeProject } from "../src/repository.ts";
import { parseArgs } from "../src/cli.ts";
import { runHooksCommandResult } from "../src/commands/hooks.ts";
import { applyHarnessHookPlan, buildHarnessHookPlan, harnessHookPreset } from "../src/services/harness-hooks.ts";
import * as paths from "../src/services/harness-paths.ts";
import * as probes from "../src/services/harness-probe.ts";
import type { HarnessProvider } from "../src/domain.ts";

const manifestPath = ".specpm/harness-hooks.json";
const target = (provider: HarnessProvider) => provider === "codex" ? ".codex/hooks.json" : ".claude/settings.json";
async function fixture() {
  const rootDir = await mkdtemp(join(tmpdir(), "spm-harness-hooks-"));
  await initializeProject(rootDir);
  return rootDir;
}
async function writeNative(root: string, provider: HarnessProvider, object: unknown) {
  const path = join(root, target(provider));
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(object));
}
async function json(root: string, path: string) { return JSON.parse(await readFile(join(root, path), "utf8")); }

describe("repository harness hook presets", () => {
  test("plans/install previews are read-only and use one SessionStart preset per provider", async () => {
    const root = await fixture();
    try {
      for (const provider of ["codex", "claude"] as const) {
        const preset = harnessHookPreset(provider);
        expect(preset).toEqual({ matcher: "^(startup|resume|compact)$", hooks: [
          { type: "command", command: `spm agent hook-context --harness ${provider}`, timeout: 5 },
        ] });
        const plan = await buildHarnessHookPlan(root, provider);
        expect(plan.action).toBe("add"); expect(plan.mode).toBe("preview");
        expect(plan.changes.map((change) => change.path)).toEqual([target(provider), manifestPath]);
        expect(plan.changes[0]!.diff).toContain(`+++ ${target(provider)}`);
        const result = await runHooksCommandResult(root, parseArgs(["hooks", "install", "--harness", provider, "--json"]));
        expect(result.exitCode).toBe(0); expect(JSON.parse(result.text).mode).toBe("preview");
        await expect(access(join(root, target(provider)))).rejects.toThrow();
      }
      await expect(access(join(root, manifestPath))).rejects.toThrow();
      await expect(access(join(root, ".specpm/locks/document-create.lock"))).rejects.toThrow();
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("apply is idempotent, preserves foreign keys/handler order, and removes only owned groups", async () => {
    const root = await fixture();
    const foreign = { matcher: "startup", hooks: [{ type: "command", command: "echo foreign", timeout: 17 }] };
    try {
      for (const provider of ["codex", "claude"] as const) {
        await writeNative(root, provider, { unrelated: { keep: [1, 2] }, hooks: {
          SessionStart: [foreign], Stop: [{ hooks: [{ type: "http", url: "https://example.test" }] }],
        } });
        const first = await applyHarnessHookPlan(root, provider);
        expect(first.mode).toBe("applied"); expect(first.action).toBe("add");
        const native = await json(root, target(provider));
        expect(native.unrelated).toEqual({ keep: [1, 2] });
        expect(native.hooks.SessionStart[0]).toEqual(foreign);
        expect(native.hooks.Stop).toEqual([{ hooks: [{ type: "http", url: "https://example.test" }] }]);
        expect(native.hooks.SessionStart).toHaveLength(2);
        const before = await readFile(join(root, target(provider)), "utf8");
        const again = await applyHarnessHookPlan(root, provider);
        expect(again.changes).toEqual([]); expect(again.action).toBe("none");
        expect(await readFile(join(root, target(provider)), "utf8")).toBe(before);
      }
      expect((await json(root, manifestPath)).entries).toHaveLength(2);
      const preview = await buildHarnessHookPlan(root, "codex", "remove");
      expect(preview.action).toBe("remove");
      expect((await json(root, target("codex"))).hooks.SessionStart).toHaveLength(2);
      await applyHarnessHookPlan(root, "codex", "remove");
      expect((await json(root, target("codex"))).hooks.SessionStart).toEqual([foreign]);
      expect((await json(root, manifestPath)).entries.map((entry: { provider: string }) => entry.provider)).toEqual(["claude"]);
      expect((await buildHarnessHookPlan(root, "claude")).action).toBe("none");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("exact preexisting entries require explicit adoption and retain original config bytes", async () => {
    const root = await fixture();
    try {
      await writeNative(root, "claude", { user: "keep", hooks: { SessionStart: [{ hooks: [
        { timeout: 5, command: "spm agent hook-context --harness claude", type: "command" },
      ], matcher: "^(startup|resume|compact)$" }] } });
      const before = await readFile(join(root, target("claude")), "utf8");
      const unownedRemove = await applyHarnessHookPlan(root, "claude", "remove");
      expect(unownedRemove.action).toBe("conflict");
      const plan = await buildHarnessHookPlan(root, "claude");
      expect(plan.action).toBe("adopt"); expect(plan.changes.map((change) => change.path)).toEqual([manifestPath]);
      await applyHarnessHookPlan(root, "claude");
      expect(await readFile(join(root, target("claude")), "utf8")).toBe(before);
      expect((await buildHarnessHookPlan(root, "claude")).changes).toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("mixed groups or complete-entry differences cannot be adopted, replaced, or duplicated", async () => {
    for (const variant of ["timeout", "extra", "mixed", "matcher"]) {
      const root = await fixture();
      try {
        const preset = harnessHookPreset("codex") as { matcher: string; hooks: Array<Record<string, unknown>> };
        if (variant === "timeout") preset.hooks[0]!.timeout = 7;
        if (variant === "extra") preset.hooks[0]!.statusMessage = "user addition";
        if (variant === "mixed") preset.hooks.push({ type: "command", command: "echo foreign" });
        if (variant === "matcher") preset.matcher = "startup";
        await writeNative(root, "codex", { hooks: { SessionStart: [preset] } });
        const before = await readFile(join(root, target("codex")), "utf8");
        for (const operation of ["install", "remove"] as const) {
          const plan = await applyHarnessHookPlan(root, "codex", operation);
          expect(plan.action).toBe("conflict"); expect(plan.changes).toEqual([]);
        }
        expect(await readFile(join(root, target("codex")), "utf8")).toBe(before);
        await expect(access(join(root, manifestPath))).rejects.toThrow();
      } finally { await rm(root, { recursive: true, force: true }); }
    }
  });

  test("a modified owned entry is a conflict for both install and removal", async () => {
    const root = await fixture();
    try {
      await applyHarnessHookPlan(root, "codex");
      const native = await json(root, target("codex")); native.hooks.SessionStart[0].hooks[0].timeout = 9;
      await writeNative(root, "codex", native);
      const before = await readFile(join(root, target("codex")), "utf8");
      for (const operation of ["install", "remove"] as const) {
        const plan = await applyHarnessHookPlan(root, "codex", operation);
        expect(plan.conflicts.join(" ")).toContain("Owned hook entry changed");
        expect(plan.warnings.join(" ")).toContain("Desired preset comparison");
        expect(plan.changes).toEqual([]);
      }
      expect(await readFile(join(root, target("codex")), "utf8")).toBe(before);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("invalid JSON/shapes are rejected before writes with one versioned envelope", async () => {
    const root = await fixture();
    try {
      await mkdir(join(root, ".claude"));
      for (const raw of ["{broken", "[]", '{"hooks":[]}', '{"hooks":{"SessionStart":{}}}',
        '{"hooks":{"SessionStart":[{"matcher":3,"hooks":[]}]}}']) {
        await writeFile(join(root, target("claude")), raw);
        const result = await runHooksCommandResult(root, parseArgs(["hooks", "install", "--harness", "claude", "--apply", "--json"]));
        expect(result.exitCode).toBe(2); expect(JSON.parse(result.text).schema_version).toBe("1.0");
        expect(await readFile(join(root, target("claude")), "utf8")).toBe(raw);
      }
      await expect(access(join(root, manifestPath))).rejects.toThrow();
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("external parent/leaf symlinks and dangling outside parents are never written", async () => {
    const outside = await mkdtemp(join(tmpdir(), "spm-hook-outside-"));
    try {
      for (const kind of ["parent", "leaf", "dangling"]) {
        const root = await fixture();
        try {
          if (kind === "leaf") {
            await mkdir(join(root, ".claude"));
            await writeFile(join(outside, "settings.json"), "{}");
            await symlink(join(outside, "settings.json"), join(root, target("claude")));
          } else await symlink(kind === "dangling" ? join(outside, "missing") : outside, join(root, ".claude"));
          const result = await runHooksCommandResult(root, parseArgs(["hooks", "install", "--harness", "claude", "--apply", "--json"]));
          expect(result.exitCode).toBe(2);
          expect(JSON.parse(result.text).error.message).toMatch(/outside|unresolved symlink/);
          await expect(access(join(root, manifestPath))).rejects.toThrow();
          await expect(access(join(outside, "missing"))).rejects.toThrow();
        } finally { await rm(root, { recursive: true, force: true }); }
      }
      expect(await readFile(join(outside, "settings.json"), "utf8")).toBe("{}");
    } finally { await rm(outside, { recursive: true, force: true }); }
  });

  test("partial manifest failure is recoverable through explicit exact adoption", async () => {
    const root = await fixture();
    const original = paths.atomicWriteHarnessText;
    const writer = spyOn(paths, "atomicWriteHarnessText").mockImplementation(async (rootDir: string, path: string, text: string) => {
      if (path === manifestPath) throw new Error("fixture manifest failure");
      return original(rootDir, path, text);
    });
    try {
      const partial = await applyHarnessHookPlan(root, "claude");
      expect(partial.mode).toBe("partial");
      expect((await json(root, target("claude"))).hooks.SessionStart).toHaveLength(1);
      await expect(access(join(root, manifestPath))).rejects.toThrow();
      writer.mockRestore();
      const before = await readFile(join(root, target("claude")), "utf8");
      expect((await buildHarnessHookPlan(root, "claude")).action).toBe("adopt");
      await applyHarnessHookPlan(root, "claude");
      expect(await readFile(join(root, target("claude")), "utf8")).toBe(before);
      expect((await buildHarnessHookPlan(root, "claude")).action).toBe("none");
    } finally { writer.mockRestore(); await rm(root, { recursive: true, force: true }); }
  });

  test("the shared lock preserves concurrent provider manifests and avoids duplicate groups", async () => {
    const root = await fixture();
    try {
      await Promise.all([applyHarnessHookPlan(root, "codex"), applyHarnessHookPlan(root, "claude"), applyHarnessHookPlan(root, "codex")]);
      expect((await json(root, manifestPath)).entries.map((entry: { provider: string }) => entry.provider).sort()).toEqual(["claude", "codex"]);
      for (const provider of ["codex", "claude"] as const) expect((await json(root, target(provider))).hooks.SessionStart).toHaveLength(1);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("a foreign config edit observed before writing is preserved rather than overwritten", async () => {
    const root = await fixture();
    const probe = spyOn(probes, "resolveExecutableOnPath").mockImplementation(async () => {
      await writeNative(root, "claude", { foreign: "new edit while applying" });
      return null;
    });
    try {
      const result = await runHooksCommandResult(root, parseArgs(["hooks", "install", "--harness", "claude", "--apply", "--json"]));
      expect(result.exitCode).toBe(2);
      expect(JSON.parse(result.text).error.message).toContain("changed during apply");
      expect(await json(root, target("claude"))).toEqual({ foreign: "new edit while applying" });
      await expect(access(join(root, manifestPath))).rejects.toThrow();
    } finally { probe.mockRestore(); await rm(root, { recursive: true, force: true }); }
  });

  test("native configuration FIFOs are rejected without blocking the CLI", async () => {
    if (process.platform === "win32") return;
    const root = await fixture();
    try {
      await mkdir(join(root, ".claude"));
      expect(spawnSync("mkfifo", [join(root, target("claude"))]).status).toBe(0);
      const result = spawnSync(process.execPath, [resolve("src/index.ts"), "hooks", "plan", "--harness", "claude", "--json"],
        { cwd: root, encoding: "utf8", timeout: 1000 });
      expect(result.error).toBeUndefined(); expect(result.status).toBe(2);
      expect(JSON.parse(result.stdout).error.message).toContain("regular project file");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("harness and Git event flags cannot be mixed, and invalid CLI selections are usage failures", async () => {
    const root = await fixture();
    try {
      for (const extra of [["--event", "commit"], ["--events", "commit,ci"], ["--apply"]]) {
        const result = spawnSync(process.execPath, [resolve("src/index.ts"), "hooks", "plan", "--harness", "codex", "--json", ...extra],
          { cwd: root, encoding: "utf8" });
        expect(result.status).toBe(2); expect(JSON.parse(result.stdout).schema_version).toBe("1.0");
      }
      const result = await runHooksCommandResult(root, parseArgs(["hooks", "remove", "--harness=unknown", "--json"]));
      expect(result.exitCode).toBe(2); expect(JSON.parse(result.text).error).toBeDefined();
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
