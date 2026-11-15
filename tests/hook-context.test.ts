import { describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { initializeProject } from "../src/repository.ts";
import { buildHookReferenceData, HOOK_CONTEXT_MAX_BYTES, renderHookReferenceEnvelope, runNativeHookContext, type HookReferenceData } from "../src/services/harness-hook-context.ts";
import { resolveManagedHookRoot } from "../src/services/harness-paths.ts";

const entrypoint = resolve("src/index.ts");
const event = (source = "startup") => ({ hook_event_name: "SessionStart", source });
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "spm-hook-context-"));
  await initializeProject(root);
  return root;
}
function run(root: string, input: string | Buffer, flags: string[] = [], env?: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [entrypoint, "agent", "hook-context", "--harness", "codex", ...flags],
    { cwd: root, encoding: "utf8", input, timeout: 6000, env });
}
function native(stdout: string) {
  const result = JSON.parse(stdout);
  expect(result.hookSpecificOutput.hookEventName).toBe("SessionStart");
  expect(result.continue).toBeUndefined(); expect(result.decision).toBeUndefined();
  expect(Buffer.byteLength(result.hookSpecificOutput.additionalContext)).toBeLessThanOrEqual(HOOK_CONTEXT_MAX_BYTES);
  return result;
}
async function untilGone(pid: number) {
  const deadline = performance.now() + 1000;
  while (performance.now() < deadline) {
    try { process.kill(pid, 0); } catch { return true; }
    await new Promise((done) => setTimeout(done, 10));
  }
  return false;
}

describe("read-only native hook context", () => {
  test("startup/resume/compact inject only escaped references and safe metadata once", async () => {
    const root = await fixture();
    try {
      const file = join(root, "docs/spm/current.md");
      let raw = await readFile(file, "utf8");
      raw = raw.replace(/^summary = .*$/m, 'summary = "PRIVATE_SUMMARY"')
        .replace(/^title = .*$/m, 'title = "PRIVATE_TITLE"').replace(/^focus = .*$/m, 'focus = "PRIVATE_FOCUS"');
      await writeFile(file, `${raw}\nPRIVATE_BODY\n`);
      const before = await readFile(file, "utf8");
      for (const provider of ["codex", "claude"]) for (const source of ["startup", "resume", "compact"]) {
        const result = spawnSync(process.execPath, [entrypoint, "agent", "hook-context", "--harness", provider],
          { cwd: root, encoding: "utf8", timeout: 6000, input: JSON.stringify({ ...event(source),
            cwd: "/private/outside/not-authority", transcript_path: "/private/outside/secret-transcript", unknown: "PRIVATE_STDIN" }) });
        expect(result.status).toBe(0);
        const payload = native(result.stdout);
        const text = payload.hookSpecificOutput.additionalContext;
        expect(text).toContain("spm resume --backend prompt --json");
        expect(text.split("BEGIN_SPM_REFERENCE_DATA")).toHaveLength(2);
        expect(text).toContain('"path":"docs/spm/current.md"');
        expect(text).not.toContain("PRIVATE_"); expect(text).not.toContain("secret-transcript");
        expect(text).not.toContain("focus"); expect(text).not.toContain("summary");
      }
      expect(await readFile(file, "utf8")).toBe(before);
      const rootFiles = await resolveManagedHookRoot(root);
      expect(rootFiles).not.toBeNull();
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("subfolder resolution stops at unmanaged nested Git boundaries and rejects external markers", async () => {
    const root = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "spm-hook-marker-outside-"));
    try {
      const sub = join(root, "src/deep"); await mkdir(sub, { recursive: true });
      expect(await resolveManagedHookRoot(sub)).toBe(await resolveManagedHookRoot(root));
      expect(native(run(sub, JSON.stringify(event())).stdout).hookSpecificOutput.additionalContext).toContain("CURRENT");
      await writeFile(join(root, "src/.git"), "gitdir: /unused/worktree");
      const bounded = run(sub, JSON.stringify(event()));
      expect(bounded.status).toBe(0); expect(native(bounded.stdout).hookSpecificOutput.additionalContext).toBe("");
      expect(native(bounded.stdout).systemMessage).toContain("No managed project root");
      await rm(join(root, "src/.git"));
      await mkdir(join(root, "src/.specpm"));
      await writeFile(join(outside, "config.toml"), await readFile(join(root, ".specpm/config.toml")));
      await symlink(join(outside, "config.toml"), join(root, "src/.specpm/config.toml"));
      const rejected = run(sub, JSON.stringify(event()));
      expect(rejected.status).toBe(0); expect(native(rejected.stdout).systemMessage).toContain("marker could not be validated");
    } finally { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
  });

  test("invalid events/input/UTF-8/oversize data return native fallback and exit zero", async () => {
    const root = await fixture();
    try {
      for (const input of ["{broken", JSON.stringify({ ...event(), source: ["startup"] }),
        JSON.stringify({ ...event(), source: "clear" }), JSON.stringify({ ...event(), hook_event_name: "PreCompact" }),
        Buffer.from([0xff]), " ".repeat(65537), JSON.stringify(null)]) {
        const result = run(root, input);
        expect(result.status).toBe(0);
        const payload = native(result.stdout);
        expect(payload.hookSpecificOutput.additionalContext).toBe("");
        expect(payload.systemMessage).toContain("SpM context unavailable");
      }
      for (const flags of [["--spawn"], ["--backend", "claude"], ["--model", "anything"], ["--_spm-hook-worker", "forged"]]) {
        const result = run(root, JSON.stringify(event()), flags);
        expect(result.status).toBe(0); expect(native(result.stdout).hookSpecificOutput.additionalContext).toBe("");
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("stdin without EOF returns fallback after the input deadline and closes normally", async () => {
    const root = await fixture();
    const start = performance.now();
    const child = spawn(process.execPath, [entrypoint, "agent", "hook-context", "--harness", "claude"],
      { cwd: root, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = ""; child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stdin.on("error", () => {}); child.stderr.resume();
    try {
      child.stdin.write('{"hook_event_name":');
      const code = await new Promise<number | null>((done) => child.on("close", done));
      expect(code).toBe(0); expect(performance.now() - start).toBeGreaterThanOrEqual(900);
      expect(performance.now() - start).toBeLessThan(1800);
      expect(native(stdout).hookSpecificOutput.additionalContext).toBe("");
    } finally { child.kill("SIGKILL"); await rm(root, { recursive: true, force: true }); }
  }, 4000);

  test("the parent deadline terminates a worker blocked in synchronous Git and its Git descendant", async () => {
    if (!["darwin", "linux"].includes(process.platform)) return;
    const root = await fixture();
    let gitPid: number | undefined;
    try {
      const bin = join(root, "bin"); await mkdir(bin);
      const script = join(bin, "git");
      await writeFile(script, `#!${process.execPath}\nimport {writeFileSync} from "node:fs"; writeFileSync(${JSON.stringify(join(root, "git.pid"))},String(process.pid));process.on("SIGTERM",()=>{});setInterval(()=>{},1000);\n`);
      await chmod(script, 0o755);
      const start = performance.now();
      const result = run(root, JSON.stringify(event()), [], { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH ?? ""}` });
      expect(result.error).toBeUndefined(); expect(result.status).toBe(0);
      expect(performance.now() - start).toBeLessThan(5000);
      expect(performance.now() - start).toBeGreaterThanOrEqual(3900);
      const payload = native(result.stdout);
      expect(payload.hookSpecificOutput.additionalContext).toBe(""); expect(payload.systemMessage).toContain("deadline exceeded");
      gitPid = Number(await readFile(join(root, "git.pid"), "utf8"));
      expect(await untilGone(gitPid)).toBe(true);
    } finally {
      if (gitPid) { try { process.kill(gitPid, "SIGKILL"); } catch {} }
      await rm(root, { recursive: true, force: true });
    }
  }, 7000);

  test("oversized/invalid worker output is never forwarded and worker flags cannot recurse", async () => {
    const root = await fixture();
    try {
      const script = join(root, "fake-worker.mjs");
      await writeFile(script, 'process.stdout.write("PRIVATE_WORKER_DATA".repeat(2000));');
      const result = await runNativeHookContext(root, "codex", Readable.from([JSON.stringify(event())]), { entrypoint: script });
      expect(result.hookSpecificOutput.additionalContext).toBe("");
      expect(JSON.stringify(result)).not.toContain("PRIVATE_WORKER_DATA");
      const absent = await runNativeHookContext(root, "codex", Readable.from([JSON.stringify(event())]), { executable: "/missing/spm-worker" });
      expect(absent.systemMessage).toContain("could not start");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("reference rendering stays within 8192 UTF-8 bytes and drops non-reference fields", () => {
    const data: HookReferenceData = { version: 1, snapshot: "a".repeat(64),
      counts: { active_specs: 1, active_tasks: 2, blocked_tasks: 3, review_tasks: 4, ready_tasks: 5 },
      references: Array.from({ length: 1000 }, (_, index) => ({ kind: "managed-doc", id: `SPEC-${index}`,
        path: `docs/escaped-\"-\n-🌍-${index}.md`, title: "PRIVATE_TITLE", body: "PRIVATE_BODY" })), references_omitted: 0,
      focus: "PRIVATE_FOCUS" } as HookReferenceData;
    const envelope = renderHookReferenceEnvelope(data);
    const text = envelope.hookSpecificOutput.additionalContext;
    expect(Buffer.byteLength(text)).toBeLessThanOrEqual(8192); expect(text).not.toContain("PRIVATE_");
    const rendered = JSON.parse(text.split("BEGIN_SPM_REFERENCE_DATA\n")[1]!.split("\nEND_SPM_REFERENCE_DATA")[0]!);
    expect(rendered.references[0].path).toBe(data.references[0]!.path);
    expect(rendered.references_omitted).toBeGreaterThan(0);
    expect(rendered.references.length + rendered.references_omitted).toBe(1000);
  });

  test("worker refuses outside managed paths and never reads configured scoped notes", async () => {
    const root = await fixture();
    try {
      let config = await readFile(join(root, ".specpm/config.toml"), "utf8");
      // No scoped notes are needed for resume refs, even if these directories are FIFOs.
      if (process.platform !== "win32") {
        const fifo = join(root, "scope-fifo");
        expect(spawnSync("mkfifo", [fifo]).status).toBe(0);
        config = config.replace('dir = ".specpm/memory/session"', 'dir = "scope-fifo"');
      }
      await writeFile(join(root, ".specpm/config.toml"), config);
      expect((await buildHookReferenceData(root)).references.length).toBeGreaterThan(0);
      config = config.replace('state_file = "docs/spm/current.md"', 'state_file = "../outside/current.md"');
      await writeFile(join(root, ".specpm/config.toml"), config);
      const result = run(root, JSON.stringify(event()));
      expect(result.status).toBe(0); expect(native(result.stdout).hookSpecificOutput.additionalContext).toBe("");
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
