import { describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { initializeProject, loadProjectContext } from "../src/repository.ts";
import { parseArgs } from "../src/cli.ts";
import { runResumeCommandResult } from "../src/commands/resume.ts";
import { runHandoffCommandResult } from "../src/commands/handoff.ts";
import { boundHarnessReceipt, readHarnessReceipt, RUN_RECEIPT_MAX_BYTES, validHarnessReceipt, writeHarnessReceipt } from "../src/services/harness-receipts.ts";
import * as contexts from "../src/services/harness-context.ts";
import * as runner from "../src/services/harness-process.ts";
import * as receiptPaths from "../src/services/harness-paths.ts";

const entrypoint = resolve("src/index.ts");
const script = `
import {appendFileSync,existsSync,readFileSync,writeFileSync,unlinkSync} from "node:fs";
import {spawnSync} from "node:child_process";
const mode=process.argv[2];
writeFileSync("executions",String(Number(existsSync("executions")?readFileSync("executions","utf8"):0)+1));
if(mode==="capture") writeFileSync("argv.json",JSON.stringify(process.argv.slice(3)));
const emit=()=>{
 console.log(JSON.stringify({type:"thread.started",thread_id:"opaque;$()"}));
 console.log(JSON.stringify({type:"item.completed",item:{type:"reasoning",text:"PRIVATE_REASONING"}}));
 console.log(JSON.stringify({type:"item.completed",item:{type:"agent_message",text:"PRIVATE_FINAL_RESPONSE: reported tests passed"}}));
 console.log(JSON.stringify({type:"turn.completed"}));
};
if(mode==="overflow") for(let i=0;i<100;i++) console.log(JSON.stringify({type:"future.event",data:"x".repeat(16000)}));
emit();
if(mode==="edit") {writeFileSync("dirty.txt","child final\\n");appendFileSync("docs/spm/current.md","\\nCHILD_MEMORY_CHANGE\\n");}
if(mode==="malformed") console.log("{broken");
if(mode==="fail") process.exitCode=37;
if(mode==="snapshot-fail") writeFileSync("docs/spm/current.md","+++\\ninvalid = [\\n+++\\n");
if(mode==="record-fail"||mode==="timeout-record-fail") writeFileSync(".specpm/runs","not a directory");
if(mode==="guard-fail") {unlinkSync("dirty.txt");spawnSync("mkfifo",["dirty.txt"]);}
if(mode==="timeout-record-fail") {process.on("SIGTERM",()=>process.exit(0));setInterval(()=>{},1000);}
`;
function git(root: string, args: string[]) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}
async function fixture(mode = "output", token = true) {
  const root = await mkdtemp(join(tmpdir(), "spm-native-record-"));
  await initializeProject(root);
  await writeFile(join(root, "fake.mjs"), script);
  await writeFile(join(root, "dirty.txt"), "baseline\n");
  await writeFile(join(root, ".gitignore"), ".specpm/tmp\n");
  await configure(root, mode, token);
  git(root, ["init"]); git(root, ["config", "user.name", "SpM fixture"]); git(root, ["config", "user.email", "spm@example.test"]);
  git(root, ["add", "."]); git(root, ["commit", "-m", "initial"]);
  return root;
}
async function configure(root: string, mode: string, token = true) {
  const path = join(root, ".specpm/config.toml");
  const raw = await readFile(path, "utf8");
  await writeFile(path, raw.replace(/\[backends.codex\][\s\S]*?(?=\n\[backends.claude\])/, [
    "[backends.codex]", "enabled = true", `command = ${JSON.stringify(process.execPath)}`,
    `args = ${JSON.stringify([join(root, "fake.mjs"), mode, ...(token ? ["{session_id}"] : [])])}`, "",
  ].join("\n")));
}
async function run(root: string, extra: string[] = []) {
  const result = await runResumeCommandResult(root,
    parseArgs(["resume", "--backend", "codex", "--protocol", "codex-jsonl", "--spawn", "--json", ...extra]));
  return { ...result, payload: JSON.parse(result.text) };
}
async function recorded(root: string) {
  const result = await run(root, ["--record"]);
  expect(result.payload.record.saved).toBe(true);
  return { ...result, id: result.payload.record.run_id as string,
    receipt: await readHarnessReceipt(root, result.payload.record.run_id) };
}

describe("opt-in native execution evidence", () => {
  test("protocol output retains only normalized final text, including terminals beyond 1 MiB", async () => {
    const root = await fixture("overflow");
    try {
      const result = await run(root);
      expect(result.exitCode).toBe(0); expect(result.payload.invocation.state).toBe("completed");
      expect(result.payload.native_result.terminal).toBe("completed");
      expect(result.payload.invocation.output).toBe(""); expect(result.payload.invocation.stdout_truncated).toBe(true);
      expect(result.payload.invocation.stdout_bytes).toBeGreaterThan(1048576);
      expect(result.text).not.toContain("PRIVATE_REASONING");
      expect(result.payload.native_result.final_text).toContain("PRIVATE_FINAL_RESPONSE");
      await expect(access(join(root, ".specpm/runs"))).rejects.toThrow();
      const human = await runResumeCommandResult(root, parseArgs(["resume", "--backend", "codex", "--protocol", "codex-jsonl", "--spawn"]));
      expect(human.text).toContain("native terminal: completed"); expect(human.text).not.toContain("PRIVATE_REASONING");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("recorded receipts are minimal, exclusive, private, and distinguish initial/final snapshots", async () => {
    const root = await fixture("edit");
    try {
      await writeFile(join(root, "dirty.txt"), "dirty before run\n");
      const ignore = await readFile(join(root, ".gitignore"), "utf8");
      const result = await recorded(root);
      expect(result.exitCode).toBe(0); expect(result.receipt.verification).toEqual([]);
      expect(result.receipt.initial_snapshot.fingerprint).not.toBe(result.receipt.final_snapshot?.fingerprint);
      expect(result.receipt.guard.complete).toBe(true);
      expect(result.receipt.changed_paths).toContain("dirty.txt"); expect(result.receipt.changed_paths).toContain("docs/spm/current.md");
      expect(result.receipt.guard.entries.some((entry) => entry.path.endsWith(`${result.id}.json`))).toBe(false);
      const text = await readFile(join(root, result.payload.record.path), "utf8");
      for (const excluded of ["PRIVATE_REASONING", "PRIVATE_FINAL_RESPONSE", '"output"', '"env"', '"final_text"', '"transcript"']) expect(text).not.toContain(excluded);
      expect(validHarnessReceipt(JSON.parse(text))).toBe(true); expect(Buffer.byteLength(text)).toBeLessThanOrEqual(RUN_RECEIPT_MAX_BYTES);
      await expect(writeHarnessReceipt(root, result.receipt)).rejects.toThrow();
      expect(await readFile(join(root, result.payload.record.path), "utf8")).toBe(text);
      if (process.platform !== "win32") expect((await stat(join(root, result.payload.record.path))).mode & 0o777).toBe(0o600);
      expect(await readFile(join(root, ".gitignore"), "utf8")).toBe(ignore);
      expect((await loadProjectContext(root)).tasks.some((task) => task.status === "done")).toBe(false);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("record and protocol previews never write and pair validation happens before spawn", async () => {
    const root = await fixture();
    try {
      const preview = await runResumeCommandResult(root, parseArgs(["resume", "--backend", "codex", "--protocol", "codex-jsonl", "--record", "--json"]));
      expect(preview.exitCode).toBe(0); expect(JSON.parse(preview.text).resume.protocol).toBe("codex-jsonl");
      expect(JSON.parse(preview.text).record.saved).toBe(false);
      await expect(access(join(root, ".specpm/runs"))).rejects.toThrow(); await expect(access(join(root, ".specpm/tmp"))).rejects.toThrow();
      for (const flags of [["--backend", "prompt", "--protocol", "codex-jsonl"], ["--backend", "codex", "--protocol", "claude-json"],
        ["--backend", "prompt", "--record"], ["--backend", "codex", "--protocol"]]) {
        const result = await runResumeCommandResult(root, parseArgs(["resume", ...flags, "--spawn", "--json"]));
        expect(result.exitCode).toBe(2); expect(JSON.parse(result.text).schema_version).toBe("1.0");
      }
      await expect(access(join(root, "executions"))).rejects.toThrow();
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("both Claude protocols use the shared wrapper without adding flags or retaining transcripts", async () => {
    for (const protocol of ["claude-json", "claude-stream-json"] as const) {
      const root = await fixture();
      try {
        const fake = join(root, "claude-fake.mjs");
        await writeFile(fake, `const result={type:"result",subtype:"success",is_error:false,session_id:"claude-session",result:"CLAUDE_FINAL"};
          ${protocol === "claude-stream-json" ? 'console.log(JSON.stringify({type:"assistant",message:{content:[{type:"thinking",thinking:"PRIVATE_THINKING"}]}}));' : ""}
          console.log(JSON.stringify(result));`);
        const configPath = join(root, ".specpm/config.toml");
        await writeFile(configPath, (await readFile(configPath, "utf8")).replace(/\[backends.claude\][\s\S]*$/, [
          "[backends.claude]", "enabled = true", `command = ${JSON.stringify(process.execPath)}`, `args = ${JSON.stringify([fake])}`, "",
        ].join("\n")));
        const child = spawnSync(process.execPath, [entrypoint, "resume", "--backend", "claude", "--protocol", protocol, "--spawn", "--record", "--json"],
          { cwd: root, encoding: "utf8" });
        expect(child.status).toBe(0);
        const result = JSON.parse(child.stdout);
        expect(result.native_result).toMatchObject({ provider: "claude", protocol, terminal: "completed", session_id: "claude-session", final_text: "CLAUDE_FINAL" });
        expect(result.invocation.output).toBe(""); expect(child.stdout).not.toContain("PRIVATE_THINKING");
        expect(result.resume.args).toEqual([fake]); expect(result.record.saved).toBe(true);
        const receipt = await readFile(join(root, result.record.path), "utf8");
        expect(receipt).not.toContain("CLAUDE_FINAL"); expect(receipt).not.toContain("PRIVATE_THINKING");
      } finally { await rm(root, { recursive: true, force: true }); }
    }
  });

  test("native failure/incomplete state never overrides the independent process result", async () => {
    for (const mode of ["fail", "malformed"]) {
      const root = await fixture(mode);
      try {
        const result = await run(root);
        expect(result.exitCode).toBe(1);
        expect(result.payload.invocation.state).toBe(mode === "fail" ? "failed" : "completed");
        expect(result.payload.native_result.terminal).toBe(mode === "fail" ? "completed" : "unknown");
      } finally { await rm(root, { recursive: true, force: true }); }
    }
  });

  test("post-child snapshot/guard/record failures preserve invocation and native result", async () => {
    for (const mode of ["snapshot-fail", "record-fail", ...(process.platform !== "win32" ? ["guard-fail"] : [])]) {
      const root = await fixture(mode);
      try {
        const result = await run(root, ["--record"]);
        expect(result.exitCode).toBe(1); expect(result.payload.invocation.state).toBe("completed");
        expect(result.payload.native_result.terminal).toBe("completed"); expect(result.payload.evidence_error).toBeDefined();
        expect(result.payload.record.saved).toBe(mode !== "record-fail");
      } finally { await rm(root, { recursive: true, force: true }); }
    }
    const root = await fixture("timeout-record-fail");
    try {
      const result = await run(root, ["--record", "--timeout-ms", "80"]);
      expect(result.exitCode).toBe(124); expect(result.payload.invocation.state).toBe("timed_out");
      expect(result.payload.evidence_error).toBeDefined(); expect(result.payload.record.saved).toBe(false);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("exact session references use current context and literal configured argv tokens", async () => {
    const root = await fixture();
    try {
      const first = await recorded(root);
      await configure(root, "capture");
      const current = join(root, "docs/spm/current.md");
      await writeFile(current, (await readFile(current, "utf8")).replace(/^focus = .*$/m, 'focus = "CURRENT_CONTEXT_ONLY"'));
      const result = await run(root, ["--session-ref", first.id]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(await readFile(join(root, "argv.json"), "utf8"))).toEqual(["opaque;$()"]);
      expect(result.payload.resume.prompt_bundle.context.focus).toBe("CURRENT_CONTEXT_ONLY");
      expect(result.payload.resume.prompt_bundle.context.focus).not.toBe(first.receipt.initial_snapshot.fingerprint);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("missing token, provider/root mismatch, invalid IDs and symlinks reject sessions before executing", async () => {
    const root = await fixture("output", false); const other = await fixture();
    try {
      const first = await recorded(root);
      const before = await readFile(join(root, "executions"), "utf8");
      const noToken = await run(root, ["--session-ref", first.id]);
      expect(noToken.exitCode).toBe(2); expect(noToken.text).toContain("{session_id}");
      for (const id of ["latest", "../run", join(root, "receipt.json"), "not-a-uuid"]) expect((await run(root, ["--session-ref", id])).exitCode).toBe(2);
      const mismatch = await runResumeCommandResult(root, parseArgs(["resume", "--backend", "claude", "--protocol", "claude-json", "--session-ref", first.id, "--spawn", "--json"]));
      expect(mismatch.exitCode).toBe(2);
      await mkdir(join(other, ".specpm/runs")); await writeFile(join(other, first.payload.record.path), JSON.stringify(first.receipt));
      expect((await run(other, ["--session-ref", first.id])).exitCode).toBe(2);
      const path = join(root, first.payload.record.path);
      for (const id of [" bad", "-flag", "x".repeat(513), "hidden\u200bcontrol"]) {
        await writeFile(path, JSON.stringify({ ...first.receipt, session_id: id }));
        expect((await run(root, ["--session-ref", first.id])).exitCode).toBe(2);
      }
      await rm(path); await writeFile(join(root, "receipt-copy.json"), JSON.stringify(first.receipt)); await symlink(join(root, "receipt-copy.json"), path);
      expect((await run(root, ["--session-ref", first.id])).exitCode).toBe(2);
      await rm(path); await rm(join(root, ".specpm/runs"), { recursive: true }); await symlink(join(other, ".specpm/runs"), join(root, ".specpm/runs"));
      expect((await run(root, ["--session-ref", first.id])).exitCode).toBe(2);
      expect(await readFile(join(root, "executions"), "utf8")).toBe(before);
    } finally { await rm(root, { recursive: true, force: true }); await rm(other, { recursive: true, force: true }); }
  });

  test("handoff draft/apply uses the final byte guard, excludes only its own receipt, and preserves task review", async () => {
    const root = await fixture("edit");
    try {
      await writeFile(join(root, "dirty.txt"), "dirty initial\n");
      const result = await recorded(root);
      const preview = await runHandoffCommandResult(root, parseArgs(["handoff", "--from-run", result.id, "--json"]));
      const draft = JSON.parse(preview.text).handoff.draft;
      expect(preview.exitCode).toBe(0); expect(draft.can_apply).toBe(true); expect(draft.verification).toEqual([]);
      expect(draft.body).not.toContain("PRIVATE_FINAL_RESPONSE"); expect(draft.body).not.toContain("PRIVATE_REASONING");
      const currentBefore = await readFile(join(root, "docs/spm/current.md"), "utf8");
      expect((await readdir(join(root, "docs/spm/handoffs"))).filter((path) => path.endsWith(".md"))).toHaveLength(0);
      const applied = await runHandoffCommandResult(root, parseArgs(["handoff", "--from-run", result.id, "--apply", "--note", "Human observed explicit checks separately.", "--json"]));
      expect(applied.exitCode).toBe(0); expect(JSON.parse(applied.text).handoff.applied).toBe(true);
      const handoff = await readFile(JSON.parse(applied.text).handoff.file_path, "utf8");
      expect(handoff).toContain("No verification commands were recorded"); expect(handoff).toContain("Human observed explicit checks separately.");
      expect(handoff).not.toContain("PRIVATE_FINAL_RESPONSE");
      expect(await readFile(join(root, "docs/spm/current.md"), "utf8")).not.toBe(currentBefore);
      expect((await loadProjectContext(root)).tasks.some((task) => task.status === "done")).toBe(false);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("handoff JSON dispatch preserves preview and legacy writes without importing model claims", async () => {
    const root = await fixture();
    try {
      const result = await recorded(root);
      const preview = spawnSync(process.execPath, [entrypoint, "handoff", "--from-run", result.id, "--json"], { cwd: root, encoding: "utf8" });
      expect(preview.status).toBe(0); expect(JSON.parse(preview.stdout).handoff.applied).toBe(false);
      const invalid = spawnSync(process.execPath, [entrypoint, "handoff", "--from-run", "latest", "--apply", "--json"], { cwd: root, encoding: "utf8" });
      expect(invalid.status).toBe(2); expect(JSON.parse(invalid.stdout).schema_version).toBe("1.0");
      const legacy = await runHandoffCommandResult(root, parseArgs(["handoff", "--title", "Legacy checkpoint", "--note", "Explicit user note"]));
      expect(legacy.exitCode).toBe(0); expect(legacy.text).toContain("Created handoff");
      const project = await loadProjectContext(root);
      expect(project.handoffs.some((handoff) => handoff.title === "Legacy checkpoint" && handoff.body.includes("Explicit user note"))).toBe(true);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("second edits to dirty bytes, new paths, and foreign .specpm data prevent handoff writes", async () => {
    for (const changed of ["dirty.txt", "new.txt", ".specpm/foreign.json"]) {
      const root = await fixture("edit");
      try {
        await writeFile(join(root, "dirty.txt"), "initial dirty"); const result = await recorded(root);
        await writeFile(join(root, changed), "second edit");
        const before = await readFile(join(root, "docs/spm/current.md"), "utf8");
        const applied = await runHandoffCommandResult(root, parseArgs(["handoff", "--from-run", result.id, "--apply", "--json"]));
        expect(applied.exitCode).toBe(2); expect(JSON.parse(applied.text).handoff.draft.conflicts.length).toBeGreaterThan(0);
        expect(await readFile(join(root, "docs/spm/current.md"), "utf8")).toBe(before);
        expect((await readdir(join(root, "docs/spm/handoffs"))).filter((path) => path.endsWith(".md"))).toHaveLength(0);
      } finally { await rm(root, { recursive: true, force: true }); }
    }
  });

  test("lock ownership is rechecked after comparison and before the canonical write", async () => {
    const root = await fixture();
    try {
      const result = await recorded(root);
      const original = contexts.loadRootedHarnessContext;
      const contextLoader = spyOn(contexts, "loadRootedHarnessContext").mockImplementation(async (path: string) => {
        const context = await original(path);
        const owner = join(root, ".specpm/locks/document-create.lock/owner.json");
        const record = JSON.parse(await readFile(owner, "utf8")); record.token = "changed-owner"; await writeFile(owner, JSON.stringify(record));
        return context;
      });
      try {
        const applied = await runHandoffCommandResult(root, parseArgs(["handoff", "--from-run", result.id, "--apply", "--json"]));
        expect(applied.exitCode).toBe(2); expect(applied.text).toContain("Write-lock ownership changed");
        expect((await readdir(join(root, "docs/spm/handoffs"))).filter((path) => path.endsWith(".md"))).toHaveLength(0);
      } finally { contextLoader.mockRestore(); }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("unknown process closure makes the saved guard incomplete even if byte observations match", async () => {
    const root = await fixture();
    const processRunner = spyOn(runner, "runHarnessProcess").mockResolvedValue({ state: "unknown", exit_code: 0, signal: null,
      output: "", stdout_bytes: 0, stdout_truncated: false, warnings: ["closure unverified"] });
    try {
      const result = await recorded(root);
      expect(result.exitCode).toBe(1); expect(result.receipt.invocation.state).toBe("unknown");
      expect(result.receipt.guard.complete).toBe(false); expect(result.receipt.guard.warnings.join(" ")).toContain("tree-closure-unverified");
      const applied = await runHandoffCommandResult(root, parseArgs(["handoff", "--from-run", result.id, "--apply", "--json"]));
      expect(applied.exitCode).toBe(2); expect(JSON.parse(applied.text).handoff.applied).toBe(false);
    } finally { processRunner.mockRestore(); await rm(root, { recursive: true, force: true }); }
  });

  test("storage overflow disables apply while preserving bounded minimal execution evidence", async () => {
    const root = await fixture();
    try {
      const result = await recorded(root); const receipt = structuredClone(result.receipt);
      receipt.guard.entries = Array.from({ length: 10000 }, (_, index) => ({ path: `${index}-${"a".repeat(200)}.txt`, kind: "file", hash: "a".repeat(64) }));
      const bounded = boundHarnessReceipt(receipt);
      expect(Buffer.byteLength(JSON.stringify(bounded))).toBeLessThanOrEqual(RUN_RECEIPT_MAX_BYTES);
      expect(bounded.guard.complete).toBe(false); expect(bounded.invocation.state).toBe("completed"); expect(bounded.native_terminal).toBe("completed");
      expect(validHarnessReceipt(bounded)).toBe(true);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("receipt reads reject oversized, malformed and extra-field data before any child launch", async () => {
    const root = await fixture();
    try {
      const result = await recorded(root);
      const count = await readFile(join(root, "executions"), "utf8");
      const path = join(root, result.payload.record.path);
      for (const raw of ["x".repeat(RUN_RECEIPT_MAX_BYTES + 1), "{broken", JSON.stringify({ ...result.receipt, output: "unrequested transcript" })]) {
        await writeFile(path, raw);
        const resumed = await run(root, ["--session-ref", result.id]);
        expect(resumed.exitCode).toBe(2); expect(resumed.payload.invocation.state).toBe("failed");
      }
      if (process.platform !== "win32") {
        await rm(path); expect(spawnSync("mkfifo", [path]).status).toBe(0);
        const child = spawnSync(process.execPath, [entrypoint, "resume", "--backend", "codex", "--protocol", "codex-jsonl", "--session-ref", result.id, "--spawn", "--json"],
          { cwd: root, encoding: "utf8", timeout: 1000 });
        expect(child.error).toBeUndefined(); expect(child.status).toBe(2); expect(JSON.parse(child.stdout).schema_version).toBe("1.0");
      }
      expect(await readFile(join(root, "executions"), "utf8")).toBe(count);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("invalid receipt UTF-8 is a precondition failure in both CLI dispatchers, while I/O remains exit 1", async () => {
    const root = await fixture();
    try {
      const result = await recorded(root);
      const path = join(root, result.payload.record.path);
      const before = await readFile(join(root, "executions"), "utf8");
      for (const bytes of [Buffer.from([0xff]), Buffer.from([0xf0, 0x9f])]) {
        await writeFile(path, bytes);
        for (const args of [["resume", "--backend", "codex", "--protocol", "codex-jsonl", "--session-ref", result.id, "--spawn"],
          ["handoff", "--from-run", result.id, "--apply"]]) {
          const child = spawnSync(process.execPath, [entrypoint, ...args, "--json"], { cwd: root, encoding: "utf8" });
          expect(child.status).toBe(2);
          const payload = JSON.parse(child.stdout);
          expect(payload.schema_version).toBe("1.0");
          expect((payload.invocation?.error ?? payload.error).type).toBe("precondition");
          expect((payload.invocation?.error ?? payload.error).message).toContain("UTF-8");
        }
      }
      expect(await readFile(join(root, "executions"), "utf8")).toBe(before);
      await writeFile(path, JSON.stringify(result.receipt));
      const reader = spyOn(receiptPaths, "readHarnessText").mockRejectedValue(Object.assign(new Error("fixture permission failure"), { code: "EACCES" }));
      try {
        expect((await run(root, ["--session-ref", result.id])).exitCode).toBe(1);
        expect((await runHandoffCommandResult(root, parseArgs(["handoff", "--from-run", result.id, "--apply", "--json"]))).exitCode).toBe(1);
      } finally { reader.mockRestore(); }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("exact receipt enums reject nested arrays and other non-string JSON values without coercion", async () => {
    const root = await fixture();
    try {
      const result = await recorded(root);
      const mutations: Array<(value: Record<string, any>) => void> = [
        (value) => { value.provider = "claude"; value.protocol = ["claude-json"]; },
        (value) => { value.native_terminal = ["completed"]; },
        (value) => { value.invocation.state = ["completed"]; },
        (value) => { value.guard.entries[0].kind = ["missing"]; value.guard.entries[0].hash = null; },
      ];
      for (const mutate of mutations) {
        const candidate = structuredClone(result.receipt); mutate(candidate);
        expect(validHarnessReceipt(candidate)).toBe(false);
        await writeFile(join(root, result.payload.record.path), JSON.stringify(candidate));
        expect((await run(root, ["--session-ref", result.id])).exitCode).toBe(2);
        expect((await runHandoffCommandResult(root, parseArgs(["handoff", "--from-run", result.id, "--apply", "--json"]))).exitCode).toBe(2);
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
