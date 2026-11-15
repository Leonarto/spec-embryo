import { describe, expect, spyOn, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "../src/cli.ts";
import { runResumeCommandResult } from "../src/commands/resume.ts";
import { initializeProject, loadProjectContext } from "../src/repository.ts";
import { buildResumeContext } from "../src/engine.ts";
import { resolveResumeBackend } from "../src/backends/index.ts";
import { MAX_HARNESS_STDOUT_BYTES, runHarnessProcess } from "../src/services/harness-process.ts";
import * as artifacts from "../src/services/harness-artifacts.ts";
import * as harnessProcess from "../src/services/harness-process.ts";

const entrypoint = resolve("src/index.ts");
const fixtureScript = `
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const [mode, extra, delay] = process.argv.slice(2);
const ready = () => writeFileSync("ready", "ready");
if (mode === "output") { process.stdout.write('arbitrary text\\n{");not json"}\\n'); process.stderr.write("diagnostic-only\\n"); }
else if (mode === "fail") { process.stdout.write("child failure output"); process.exitCode = 37; }
else if (mode === "overflow") { process.stdout.write("a".repeat(1048574) + "🌍" + "z".repeat(2*1048576)); }
else if (mode === "split") { const bytes = Buffer.from("🌍"); process.stdout.write(bytes.subarray(0,2)); setTimeout(() => process.stdout.write(bytes.subarray(2)), 10); }
else if (mode === "self-signal") process.kill(process.pid, "SIGTERM");
else if (mode === "descendant-output") { spawn(process.execPath, [process.argv[1], "late-output"], {stdio: ["ignore", "inherit", "inherit"]}); process.exit(0); }
else if (mode === "late-output") { setTimeout(() => process.stdout.write("output after parent exit"), 100); }
else if (mode === "background-reader") {
  const leaf = spawn(process.execPath, [process.argv[1], "delayed-read", extra], {stdio: "ignore"});
  writeFileSync("background-pid", String(leaf.pid));
  leaf.on("spawn", () => process.exit(0));
}
else if (mode === "delayed-read") {
  setTimeout(() => {
    let result;
    try { result = {text:readFileSync(process.env.SPM_PROMPT_FILE,"utf8")}; }
    catch(error) { result = {error:error.code}; }
    writeFileSync(extra, JSON.stringify(result));
  }, 350);
}
else if (mode === "inspect") {
  setTimeout(() => {
    const bundle = JSON.parse(readFileSync(process.env.SPM_PROMPT_BUNDLE_FILE,"utf8"));
    const prefix = readFileSync(process.env.SPM_PROMPT_STABLE_PREFIX_FILE,"utf8");
    const tail = readFileSync(process.env.SPM_PROMPT_VARIABLE_TAIL_FILE,"utf8");
    const text = readFileSync(process.env.SPM_PROMPT_FILE,"utf8");
    writeFileSync(extra, JSON.stringify({focus:bundle.context.focus, file:process.env.SPM_PROMPT_FILE, text, prefix, tail}));
  }, Number(delay||0));
}
else if (mode === "ignore" || mode === "exit-zero" || mode === "tree" || mode === "leaf") {
  const handle = () => { if (mode === "exit-zero") process.exit(0); };
  process.on("SIGINT", handle); process.on("SIGTERM", handle);
  if (mode === "tree") {
    const leaf=spawn(process.execPath,[process.argv[1],"leaf"],{stdio:"inherit"});
    writeFileSync("tree-pids",JSON.stringify({parent:process.pid,leaf:leaf.pid}));
    const wait=setInterval(()=>{ if(existsSync("leaf-ready")){clearInterval(wait);ready();}},5);
  } else if (mode === "leaf") writeFileSync("leaf-ready",String(process.pid));
  else ready();
  setInterval(() => { if(mode === "ignore") process.stdout.write("activity\\n"); }, 25);
}
`;

async function fixture(mode = "output", extraArgs: string[] = []) {
  const rootDir = await mkdtemp(join(tmpdir(), "spm-harness-process-"));
  await initializeProject(rootDir);
  const script = join(rootDir, "fake-harness.mjs");
  await writeFile(script, fixtureScript);
  const configFile = join(rootDir, ".specpm/config.toml");
  const config = await readFile(configFile, "utf8");
  await writeFile(configFile, config.replace(/\[backends.codex\][\s\S]*?(?=\n\[backends.claude\])/, [
    "[backends.codex]", "enabled = true", `command = ${JSON.stringify(process.execPath)}`,
    `args = ${JSON.stringify([script, mode, ...extraArgs])}`, "",
  ].join("\n")));
  return rootDir;
}

function cli(rootDir: string, args: string[] = []) {
  const child = spawn(process.execPath, [entrypoint, "resume", "--backend", "codex", "--spawn", "--json", ...args],
    { cwd: rootDir, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = ""; let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
  const done = new Promise<{ code: number | null; stdout: string; stderr: string }>((resolveDone, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolveDone({ code, stdout, stderr }));
  });
  return { child, done };
}

async function untilFile(path: string) {
  const deadline = performance.now() + 5000;
  while (performance.now() < deadline) {
    try { await access(path); return; } catch { await new Promise((done) => setTimeout(done, 10)); }
  }
  throw new Error(`Fixture never became ready: ${path}`);
}

function envelope(result: { stdout: string }) {
  const payload = JSON.parse(result.stdout);
  expect(payload.schema_version).toBe("1.0");
  expect(payload).toHaveProperty("resume");
  expect(payload).toHaveProperty("invocation");
  return payload;
}

describe("harness process contract", () => {
  test("captures stdout as data, keeps stderr diagnostic, and cleans owned artifacts", async () => {
    const rootDir = await fixture();
    try {
      const result = await cli(rootDir).done;
      const payload = envelope(result);
      expect(result.code).toBe(0);
      expect(payload.invocation.state).toBe("completed");
      expect(payload.invocation.output).toContain("arbitrary text");
      expect(payload.invocation.stdout_truncated).toBe(false);
      expect(payload.invocation.exit_code).toBe(0);
      expect(result.stderr).toContain("diagnostic-only");
      expect(result.stdout).not.toContain("diagnostic-only");
      expect(payload.resume.artifacts_retained).toBe(false);
      await expect(access(dirname(payload.resume.artifact_paths.promptTextFile))).rejects.toThrow();
      expect((await loadProjectContext(rootDir)).tasks.some((task) => task.status === "done")).toBe(false);
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("drains output beyond 1 MiB and never cuts a UTF-8 code point", async () => {
    const rootDir = await fixture("overflow");
    try {
      const result = await cli(rootDir).done;
      const payload = envelope(result);
      expect(result.code).toBe(0);
      expect(payload.invocation.stdout_truncated).toBe(true);
      expect(payload.invocation.stdout_bytes).toBe(1048574 + 4 + 2 * MAX_HARNESS_STDOUT_BYTES);
      expect(Buffer.byteLength(payload.invocation.output)).toBe(1048574);
      expect(payload.invocation.output).not.toContain("\uFFFD");
    } finally { await rm(rootDir, { recursive: true, force: true }); }
    const split = await fixture("split");
    try { expect(envelope(await cli(split).done).invocation.output).toBe("🌍"); }
    finally { await rm(split, { recursive: true, force: true }); }
  });

  test("waits for stream close after parent exit", async () => {
    const rootDir = await fixture("descendant-output");
    try {
      const result = await cli(rootDir).done;
      expect(result.code).toBe(0);
      expect(envelope(result).invocation.output).toBe("output after parent exit");
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("retains prompts when a same-group background descendant outlives closed parent streams", async () => {
    if (!["darwin", "linux"].includes(process.platform)) return;
    const rootDir = await fixture("background-reader", ["late-prompt-read.json"]);
    let leaf: number | undefined;
    try {
      const result = await cli(rootDir).done;
      leaf = Number(await readFile(join(rootDir, "background-pid"), "utf8"));
      const payload = envelope(result);
      expect(result.code).toBe(1);
      expect(payload.invocation.state).toBe("unknown");
      expect(payload.invocation.exit_code).toBe(0);
      expect(payload.invocation.signal).toBeNull();
      expect(payload.invocation.warnings.join(" ")).toContain("background work was not terminated");
      expect(payload.resume.artifacts_retained).toBe(true);
      await access(payload.resume.artifact_paths.promptTextFile);
      await untilFile(join(rootDir, "late-prompt-read.json"));
      const read = JSON.parse(await readFile(join(rootDir, "late-prompt-read.json"), "utf8"));
      expect(read.error).toBeUndefined();
      expect(read.text).toContain("You are resuming work on this repository.");
    } finally {
      if (leaf) { try { process.kill(leaf, "SIGKILL"); } catch {} }
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("preserves child failure and externally generated signal as failed states", async () => {
    for (const mode of ["fail", "self-signal"]) {
      const rootDir = await fixture(mode);
      try {
        const result = await cli(rootDir).done;
        const payload = envelope(result);
        expect(result.code).toBe(1);
        expect(payload.invocation.state).toBe("failed");
        expect(payload.invocation.error.type).toBe("process");
        expect(payload.invocation.exit_code).toBe(mode === "fail" ? 37 : null);
        expect(payload.invocation.signal).toBe(mode === "self-signal" ? "SIGTERM" : null);
        expect(payload.invocation.cancellation_signal).toBeUndefined();
      } finally { await rm(rootDir, { recursive: true, force: true }); }
    }
  });

  test("emits versioned JSON for launch, artifact, precondition, usage and context failures", async () => {
    const rootDir = await fixture();
    try {
      const configFile = join(rootDir, ".specpm/config.toml");
      const original = await readFile(configFile, "utf8");
      await writeFile(configFile, original.replace(`command = ${JSON.stringify(process.execPath)}`, 'command = "/missing/spm-fixture-cli"'));
      const launched = await cli(rootDir).done;
      expect(launched.code).toBe(1);
      expect(envelope(launched).invocation.error.type).toBe("spawn");
      expect(envelope(launched).invocation.exit_code).toBeNull();
      await writeFile(configFile, original);
      const usage = await cli(rootDir, ["--timeout-ms", "0"]).done;
      expect(usage.code).toBe(2);
      expect(envelope(usage).invocation.error.type).toBe("usage");
      const byteUsage = await cli(rootDir, ["--max-context-bytes", "4095"]).done;
      expect(byteUsage.code).toBe(2);
      expect(envelope(byteUsage).invocation.error.type).toBe("usage");
      const unavailable = await cli(rootDir, ["--since=--help"]).done;
      expect(unavailable.code).toBe(2);
      expect(envelope(unavailable).interruption_window.available).toBe(false);
      expect(envelope(unavailable).invocation.error.type).toBe("precondition");
      await writeFile(configFile, original.replace("[backends.codex]\nenabled = true", "[backends.codex]\nenabled = false"));
      const disabled = await cli(rootDir).done;
      expect(disabled.code).toBe(2);
      expect(envelope(disabled).invocation.error.type).toBe("precondition");
      await writeFile(configFile, original);
      await rm(join(rootDir, ".specpm/tmp"), { recursive: true, force: true });
      await writeFile(join(rootDir, ".specpm/tmp"), "not a directory");
      const artifact = await cli(rootDir).done;
      expect(artifact.code).toBe(1);
      expect(envelope(artifact).invocation.error.type).toBe("artifact");
      expect(envelope(artifact).invocation.output).toBe("");
      await writeFile(configFile, "invalid [ TOML");
      const context = await cli(rootDir).done;
      expect(context.code).toBe(1);
      expect(envelope(context).invocation.error.type).toBe("context");
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("previews use path templates without reserving directories", async () => {
    const rootDir = await fixture();
    try {
      const result = await runResumeCommandResult(rootDir, parseArgs(["resume", "--backend", "codex", "--json"]));
      const payload = JSON.parse(result.text);
      expect(payload.resume.artifact_paths_are_templates).toBe(true);
      expect(payload.resume.artifact_paths.promptTextFile).toContain("{run-id}");
      await expect(access(join(rootDir, ".specpm/tmp"))).rejects.toThrow();
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("two concurrent runs receive independent files and preserve diagnostic retention", async () => {
    const rootDir = await fixture("inspect");
    try {
      const project = await loadProjectContext(rootDir);
      const context = buildResumeContext(project);
      const run = (name: string, retained: boolean) => {
        const config = structuredClone(project.config);
        config.backends.codex.args = [join(rootDir, "fake-harness.mjs"), "inspect", join(rootDir, `${name}.json`), "80"];
        return resolveResumeBackend("codex", config).run({ ...context, focus: name },
          { rootDir, config, json: true, spawn: true, retainArtifacts: retained });
      };
      const [first, second] = await Promise.all([run("first", false), run("second", true)]);
      const a = JSON.parse(await readFile(join(rootDir, "first.json"), "utf8"));
      const b = JSON.parse(await readFile(join(rootDir, "second.json"), "utf8"));
      expect(a.focus).toBe("first"); expect(b.focus).toBe("second");
      expect(a.file).not.toBe(b.file);
      expect(a.text).toContain('"focus": "first"'); expect(b.tail).toContain('"focus": "second"');
      expect(a.prefix).toBe(b.prefix);
      expect(first.invocation?.state).toBe("completed"); expect(second.invocation?.state).toBe("completed");
      await expect(access(dirname(a.file))).rejects.toThrow();
      expect(await readFile(b.file, "utf8")).toBe(b.text);
      expect((await readdir(dirname(b.file))).sort()).toHaveLength(5);
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("partial artifact write failure cleans only owned files and never launches the child", async () => {
    const rootDir = await fixture();
    const originalWriter = artifacts.writeHarnessArtifactFiles;
    const writer = spyOn(artifacts, "writeHarnessArtifactFiles").mockImplementation(async (entries) => {
      await originalWriter(entries.slice(0, 1));
      throw new Error("fixture partial write failure");
    });
    try {
      const foreign = join(rootDir, ".specpm/tmp/foreign-active");
      await mkdir(foreign, { recursive: true });
      await writeFile(join(foreign, "owned-by-someone-else"), "keep");
      const result = await runResumeCommandResult(rootDir, parseArgs(["resume", "--backend", "codex", "--spawn", "--json"]));
      const payload = JSON.parse(result.text);
      expect(result.exitCode).toBe(1);
      expect(payload.invocation.error.type).toBe("artifact");
      expect(payload.invocation.error.message).toContain("partial write");
      expect(payload.invocation.stdout_bytes).toBe(0);
      expect(await readdir(join(rootDir, ".specpm/tmp"))).toEqual(["foreign-active"]);
      expect(await readFile(join(foreign, "owned-by-someone-else"), "utf8")).toBe("keep");
    } finally { writer.mockRestore(); await rm(rootDir, { recursive: true, force: true }); }
  });

  test("ownership verification refuses changed or missing markers", async () => {
    const rootDir = await fixture();
    try {
      for (const missing of [false, true]) {
        const reservation = await artifacts.reserveHarnessArtifacts(rootDir, "codex");
        await artifacts.markHarnessArtifacts(reservation);
        const marker = join(reservation.directory, ".spm-run.json");
        if (missing) await rm(marker);
        else await writeFile(marker, JSON.stringify({ owner: "foreign" }));
        expect(await artifacts.cleanupHarnessArtifacts(reservation)).toContain("retained");
        await access(reservation.directory);
      }
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("CLI retention is explicit and unknown process trees retain their own artifacts", async () => {
    const rootDir = await fixture();
    try {
      const retained = envelope(await cli(rootDir, ["--retain-artifacts"]).done);
      expect(retained.resume.artifacts_retained).toBe(true);
      await access(retained.resume.artifact_paths.promptTextFile);
      const runner = spyOn(harnessProcess, "runHarnessProcess").mockResolvedValue({
        state: "unknown", exit_code: null, signal: null, output: "", stdout_bytes: 0,
        stdout_truncated: false, warnings: ["fixture closure unverified"], error: { type: "unknown", message: "unverified tree" },
      });
      try {
        const result = await runResumeCommandResult(rootDir,
          parseArgs(["resume", "--backend", "codex", "--spawn", "--json"]));
        const payload = JSON.parse(result.text);
        expect(result.exitCode).toBe(1);
        expect(payload.invocation.state).toBe("unknown");
        expect(payload.resume.artifacts_retained).toBe(true);
        expect(payload.warnings.join(" ")).toContain("closure is unverified");
        await access(payload.resume.artifact_paths.promptTextFile);
      } finally { runner.mockRestore(); }
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("cancellation during artifact preparation never starts a child", async () => {
    const rootDir = await fixture();
    const originalWriter = artifacts.writeHarnessArtifactFiles;
    const writer = spyOn(artifacts, "writeHarnessArtifactFiles").mockImplementation(async (entries) => {
      await originalWriter(entries);
      process.emit("SIGINT");
    });
    try {
      const result = await runResumeCommandResult(rootDir,
        parseArgs(["resume", "--backend", "codex", "--spawn", "--json"]));
      const payload = JSON.parse(result.text);
      expect(result.exitCode).toBe(130);
      expect(payload.invocation.state).toBe("cancelled");
      expect(payload.invocation.exit_code).toBeNull();
      expect(payload.invocation.stdout_bytes).toBe(0);
      expect(payload.resume.artifacts_retained).toBe(false);
      expect(await readdir(join(rootDir, ".specpm/tmp"))).toEqual([]);
    } finally { writer.mockRestore(); await rm(rootDir, { recursive: true, force: true }); }
  });

  test("timeout is monotonic despite activity and remains timed_out after graceful exit zero", async () => {
    for (const mode of ["ignore", "exit-zero"]) {
      const rootDir = await fixture(mode);
      try {
        const started = performance.now();
        const result = await cli(rootDir, ["--timeout-ms", "120"]).done;
        const elapsed = performance.now() - started;
        const payload = envelope(result);
        expect(result.code).toBe(124);
        expect(payload.invocation.state).toBe("timed_out");
        expect(payload.invocation.error.type).toBe("timeout");
        expect(payload.invocation.signal).toBe(mode === "ignore" ? "SIGKILL" : null);
        expect(elapsed).toBeLessThan(4000);
        if (mode === "ignore") expect(elapsed).toBeGreaterThanOrEqual(2000);
        else expect(payload.invocation.exit_code).toBe(0);
      } finally { await rm(rootDir, { recursive: true, force: true }); }
    }
  }, 12000);

  test("managed SIGINT and SIGTERM cancellation stays cancelled even if the child exits zero", async () => {
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
      const rootDir = await fixture("exit-zero");
      const launched = cli(rootDir);
      try {
        await untilFile(join(rootDir, "ready"));
        launched.child.kill(signal);
        const result = await launched.done;
        const payload = envelope(result);
        expect(result.code).toBe(signal === "SIGINT" ? 130 : 143);
        expect(payload.invocation.state).toBe("cancelled");
        expect(payload.invocation.cancellation_signal).toBe(signal);
        expect(payload.invocation.exit_code).toBe(0);
        expect(payload.invocation.signal).toBeNull();
      } finally { launched.child.kill("SIGKILL"); await rm(rootDir, { recursive: true, force: true }); }
    }
  });

  test("macOS/Linux cancellation closes a child and grandchild that ignore termination", async () => {
    if (!["darwin", "linux"].includes(process.platform)) return;
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
    const rootDir = await fixture("tree");
    const launched = cli(rootDir);
    let pids: { parent: number; leaf: number } | undefined;
    try {
      await untilFile(join(rootDir, "ready"));
      pids = JSON.parse(await readFile(join(rootDir, "tree-pids"), "utf8"));
      launched.child.kill(signal);
      const result = await launched.done;
      const payload = envelope(result);
      expect(result.code).toBe(signal === "SIGINT" ? 130 : 143);
      expect(payload.invocation.state).toBe("cancelled");
      expect(payload.invocation.signal).toBe("SIGKILL");
      for (const pid of [pids!.parent, pids!.leaf]) expect(() => process.kill(pid, 0)).toThrow();
      expect(payload.resume.artifacts_retained).toBe(false);
    } finally {
      launched.child.kill("SIGKILL");
      if (pids) for (const pid of [pids.parent, pids.leaf]) { try { process.kill(pid, "SIGKILL"); } catch {} }
      await rm(rootDir, { recursive: true, force: true });
    }
    }
  }, 12000);

  test("unverified Windows tree cancellation is unknown with an explicit warning", async () => {
    const rootDir = await fixture("exit-zero");
    try {
      const invocation = await runHarnessProcess({ command: process.execPath,
        args: [join(rootDir, "fake-harness.mjs"), "exit-zero"], cwd: rootDir, env: {},
        captureStdout: true, timeoutMs: 100, platform: "win32" });
      expect(invocation.state).toBe("unknown");
      expect(invocation.warnings.join(" ")).toContain("best-effort direct-child");
      expect(invocation.error?.type).toBe("unknown");
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("rejects invalid timeout values in an exactly-one JSON envelope", async () => {
    const rootDir = await fixture();
    try {
      for (const value of ["", "0", "-1", "0.5", "Infinity", "NaN", "9007199254740992"]) {
        const result = spawnSync(process.execPath, [entrypoint, "resume", "--json", `--timeout-ms=${value}`],
          { cwd: rootDir, encoding: "utf8" });
        expect(result.status).toBe(2);
        expect(envelope(result).invocation.error.type).toBe("usage");
      }
      const large = await cli(rootDir, ["--timeout-ms", "9007199254740991"]).done;
      expect(large.code).toBe(0);
      expect(large.stderr).not.toContain("TimeoutOverflowWarning");
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });
});
