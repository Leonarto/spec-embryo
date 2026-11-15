import { describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { delimiter, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runDoctorCommand } from "../src/commands/doctor.ts";
import { runAgentCommand } from "../src/commands/agent.ts";
import { initializeProject } from "../src/repository.ts";
import { buildHarnessDiagnostics, inspectHarnessInstructions, projectHarnessDiagnostics, type HarnessInstructionInspection } from "../src/services/harness-diagnostics.ts";
import { HARNESS_PROBE_MAX_BYTES, resolveHarnessExecutable, runHarnessProbe, type HarnessProbeResult } from "../src/services/harness-probe.ts";
import * as probes from "../src/services/harness-probe.ts";

const profile = { date: "2026-11-15", codex: "0.169.0-alpha.11.1", claude: "2.1.309" };
const entrypoint = resolve("src/index.ts");
const emptyInstructions: HarnessInstructionInspection = { instructionFiles: [], importsAgents: false, spmBlocks: [], warnings: [] };

async function fixture() {
  const rootDir = await mkdtemp(join(tmpdir(), "spm-harness-diagnostics-"));
  await initializeProject(rootDir);
  const bin = join(rootDir, "bin");
  await mkdir(bin);
  return { rootDir, bin };
}

async function executable(path: string, body: string) {
  await writeFile(path, `#!${process.execPath}\n${body}\n`);
  await chmod(path, 0o755);
}

function available(output: string): HarnessProbeResult {
  return { status: "available", output, bytes_received: Buffer.byteLength(output), truncated: false, exit_code: 0 };
}

describe("explicit harness diagnostics", () => {
  test("normal doctor/brief and explicit snippet execute zero probes and retain legacy keys", async () => {
    const { rootDir } = await fixture();
    const probe = spyOn(probes, "runHarnessProbe").mockResolvedValue(available("should not run"));
    try {
      const doctor = JSON.parse(await runDoctorCommand(rootDir, parseArgs(["doctor", "--json"])));
      const brief = JSON.parse(await runAgentCommand(rootDir, parseArgs(["agent", "brief", "--json"])));
      const snippet = JSON.parse(await runAgentCommand(rootDir,
        parseArgs(["agent", "snippet", "--harness", "claude", "--json"])));
      expect(probe).not.toHaveBeenCalled();
      expect(doctor.schema_version).toBe("1.0"); expect(doctor).toHaveProperty("summary");
      expect(brief).toHaveProperty("repo"); expect(brief).toHaveProperty("workflowLoop");
      expect("harness" in doctor).toBe(false); expect("harness" in brief).toBe(false);
      expect(snippet.harness.provider).toBe("claude"); expect(snippet.harness.probeStatus).toBe("not-requested");
      expect(snippet.harness.version).toBeNull(); expect(snippet.snippetLines.length).toBeGreaterThan(0);
      const human = await runAgentCommand(rootDir, parseArgs(["agent", "snippet", "--harness", "claude"]));
      expect(human).toContain("no CLI probes"); expect(Buffer.byteLength(human)).toBeLessThan(8192);
    } finally { probe.mockRestore(); await rm(rootDir, { recursive: true, force: true }); }
  });

  test("doctor and brief expose the same optional projection and ignore configured backend commands", async () => {
    const { rootDir, bin } = await fixture();
    const oldPath = process.env.PATH;
    try {
      const log = join(rootDir, "probes.jsonl");
      await executable(join(bin, "codex"), `
        import {appendFileSync,readFileSync} from "node:fs";
        const args=process.argv.slice(2); appendFileSync(${JSON.stringify(log)},JSON.stringify(args)+"\\n");
        if(readFileSync(0,"utf8")!=="") process.exit(9);
        if(args[0]==="--version") console.log("codex-cli ${profile.codex}");
        else if(args.join(" ")==="exec --help") console.log("Usage: codex exec [OPTIONS]\\n --json  Print JSONL");
        else if(args.join(" ")==="exec resume --help") console.log("Usage: codex exec resume [OPTIONS] [SESSION_ID]");
        else console.log("Usage: codex [OPTIONS]");
      `);
      process.env.PATH = `${bin}${delimiter}${oldPath ?? ""}`;
      const configPath = join(rootDir, ".specpm/config.toml");
      const config = await readFile(configPath, "utf8");
      await writeFile(configPath, config.replace('command = "codex"', 'command = "arbitrary-user-command --dangerous"'));
      const doctor = JSON.parse(await runDoctorCommand(rootDir, parseArgs(["doctor", "--harness", "codex", "--json"])));
      const brief = JSON.parse(await runAgentCommand(rootDir, parseArgs(["agent", "brief", "--harness", "codex", "--json"])));
      expect(doctor.harness).toEqual(brief.harness);
      expect(doctor.harness.executable).toBe(await resolveHarnessExecutable("codex", rootDir));
      expect(doctor.harness.version.parsed).toBe(profile.codex);
      expect(doctor.harness.version.prerelease).toBe(true);
      expect(doctor.harness.capabilities.native_compatibility.status).toBe("unverified");
      expect(doctor.harness.capabilities.structured_output.status).toBe("observed");
      expect(doctor.harness.capabilities.session_resume.status).toBe("observed");
      const invoked = (await readFile(log, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
      expect(invoked).toEqual([["--version"], ["--help"], ["exec", "--help"], ["exec", "resume", "--help"],
        ["--version"], ["--help"], ["exec", "--help"], ["exec", "resume", "--help"]]);
      expect(await runDoctorCommand(rootDir, parseArgs(["doctor", "--harness", "codex"]))).toContain("Harness: codex");
      expect(await runAgentCommand(rootDir, parseArgs(["agent", "brief", "--harness", "codex"]))).toContain("Harness: codex");
    } finally {
      if (oldPath === undefined) delete process.env.PATH; else process.env.PATH = oldPath;
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("missing CLI does not change project health and never writes adoption files", async () => {
    const { rootDir, bin } = await fixture();
    const oldPath = process.env.PATH;
    try {
      const before = JSON.parse(await runDoctorCommand(rootDir, parseArgs(["doctor", "--json"])));
      process.env.PATH = bin;
      const after = JSON.parse(await runDoctorCommand(rootDir, parseArgs(["doctor", "--harness", "claude", "--json"])));
      expect(after.summary).toEqual(before.summary);
      expect(after.findings).toEqual(before.findings);
      expect(after.harness.executable).toBeNull(); expect(after.harness.version).toBeNull();
      expect(after.harness.probeStatus).toBe("missing");
      expect(after.harness.suggestedCommands[0].command).toBe("spm resume --backend prompt --json");
      expect((await inspectHarnessInstructions(rootDir, "claude")).instructionFiles).not.toContain("CLAUDE.md");
    } finally {
      if (oldPath === undefined) delete process.env.PATH; else process.env.PATH = oldPath;
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("version/profile observations never become blanket compatibility guarantees", () => {
    for (const raw of [`${profile.claude} (Claude Code)`, "not-a-version", "999.0.0", "3.0.0-beta.1"]) {
      const report = projectHarnessDiagnostics("claude", "/fake/claude", [
        { args: ["--version"], result: available(raw) },
        { args: ["--help"], result: available(" --output-format <format>\n --resume <session>") },
      ], emptyInstructions, true);
      expect(report.capabilities.native_compatibility!.status).toBe("unverified");
      expect(report.capabilities.structured_output!.status).toBe("observed");
      expect(report.capabilities.session_resume!.status).toBe("observed");
      expect(report.capabilities.root_instructions!.evidence).toContain(`documentation profile ${profile.date}`);
    }
    const lookalike = projectHarnessDiagnostics("codex", "/fake/codex", [
      { args: ["--version"], result: available("unknown") },
      { args: ["exec", "--help"], result: available(" --json-schema <schema>") },
    ], emptyInstructions, true);
    expect(lookalike.capabilities.structured_output!.status).toBe("unverified");
    expect(lookalike.warnings.join(" ")).toContain("unknown or prerelease");
  });

  test("inspection is bounded to seven root paths and returns paths/warnings without document contents", async () => {
    const { rootDir } = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "spm-harness-outside-"));
    try {
      await writeFile(join(rootDir, "AGENTS.md"), "## Optional SpM workflow\nPRIVATE_ROOT_BODY\n");
      await writeFile(join(rootDir, "CLAUDE.md"), "@AGENTS.md\n## Optional SpM workflow\nPRIVATE_CLAUDE_BODY\n");
      await writeFile(join(rootDir, "CLAUDE.local.md"), "PRIVATE_LOCAL_BODY");
      await mkdir(join(rootDir, ".codex"));
      await writeFile(join(rootDir, ".codex/hooks.json"), '{"command":"spm agent hook-context --harness codex"}');
      await writeFile(join(rootDir, ".codex/config.toml"), "[hooks.SessionStart]\ncommand='inline'\n");
      await mkdir(join(rootDir, "nested"));
      await writeFile(join(rootDir, "nested/CLAUDE.md"), "NESTED_SECRET_NOT_INSPECTED");
      await writeFile(join(outside, "CLAUDE.md"), "OUTSIDE_SECRET_NOT_INSPECTED");
      await symlink(outside, join(rootDir, ".claude"));
      const inspected = await inspectHarnessInstructions(rootDir, "claude");
      expect(inspected.importsAgents).toBe(true);
      expect(inspected.spmBlocks).toEqual(["AGENTS.md", "CLAUDE.md"]);
      expect(inspected.instructionFiles).not.toContain("nested/CLAUDE.md");
      expect(inspected.instructionFiles).not.toContain(".claude/CLAUDE.md");
      expect(inspected.warnings.join(" ")).toContain("resolves outside");
      expect(inspected.warnings.join(" ")).toContain("duplicate");
      expect(inspected.warnings.join(" ")).toContain("static inspection does not confirm");
      const codex = await inspectHarnessInstructions(rootDir, "codex");
      expect(codex.warnings.join(" ")).toContain("Inline Codex hook");
      expect(codex.warnings.join(" ")).toContain("context hooks and instruction blocks");
      expect(JSON.stringify(inspected)).not.toContain("PRIVATE_");
      expect(JSON.stringify(inspected)).not.toContain("SECRET_NOT_INSPECTED");
      await writeFile(join(rootDir, "CLAUDE.md"), "x".repeat(70000));
      expect((await inspectHarnessInstructions(rootDir, "claude")).warnings.join(" ")).toContain("limited to 65536 bytes");
    } finally { await rm(rootDir, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
  });

  test("bounded probes drain combined stdout/stderr and report launch failures", async () => {
    const { rootDir, bin } = await fixture();
    try {
      const path = join(bin, "codex");
      await executable(path, `process.stdout.write("a".repeat(131072)); process.stderr.write("b".repeat(131072));`);
      const result = await runHarnessProbe(path, ["--help"], rootDir);
      expect(result.status).toBe("available");
      expect(result.bytes_received).toBe(262144);
      expect(result.truncated).toBe(true);
      expect(Buffer.byteLength(result.output)).toBe(HARNESS_PROBE_MAX_BYTES);
      const missing = await runHarnessProbe(join(bin, "missing"), ["--version"], rootDir);
      expect(missing.status).toBe("error");
      const throwing = await runHarnessProbe("\0", ["--help"], rootDir);
      expect(throwing.status).toBe("error");
      const disallowed = await runHarnessProbe(path, ["exec", "arbitrary"] as never, rootDir);
      expect(disallowed.status).toBe("error");
      expect(disallowed.output).toContain("not allowlisted");
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("root instruction FIFOs are rejected without opening or waiting for a writer", async () => {
    if (process.platform === "win32") return;
    const { rootDir } = await fixture();
    try {
      const fifo = join(rootDir, "CLAUDE.md");
      const created = spawnSync("mkfifo", [fifo], { encoding: "utf8", timeout: 1000 });
      expect(created.status).toBe(0);
      const result = spawnSync(process.execPath,
        [entrypoint, "agent", "snippet", "--harness", "claude", "--json"],
        { cwd: rootDir, encoding: "utf8", timeout: 1000 });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload.harness.probeStatus).toBe("not-requested");
      expect(payload.harness.instructionFiles).not.toContain("CLAUDE.md");
      expect(payload.harness.warnings).toContain("Instruction path CLAUDE.md is not a regular file.");
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("hung probes terminate within the fixed deadline despite continuous output", async () => {
    const { rootDir, bin } = await fixture();
    try {
      const path = join(bin, "codex");
      await executable(path, `process.on("SIGTERM",()=>{}); setInterval(()=>{process.stdout.write("activity");process.stderr.write("activity");},10);`);
      const start = performance.now();
      const result = await runHarnessProbe(path, ["--version"], rootDir);
      expect(result.status).toBe("timeout");
      expect(performance.now() - start).toBeGreaterThanOrEqual(1900);
      expect(performance.now() - start).toBeLessThan(2800);
      expect(result.bytes_received).toBeGreaterThan(0);
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  }, 5000);

  test("injectable probes are separate from projection and only receive allowlisted arguments", async () => {
    const { rootDir } = await fixture();
    try {
      const commands: string[] = [];
      const report = await buildHarnessDiagnostics(rootDir, "claude", { dependencies: {
        resolveExecutable: async () => "/canonical/claude",
        probe: async (_path, args) => {
          commands.push(args.join(" "));
          return args[0] === "--version" ? available(`${profile.claude} (Claude Code)`)
            : { ...available("partial"), status: "timeout", truncated: true };
        },
      } });
      expect(commands).toEqual(["--version", "--help"]);
      expect(report.probeStatus).toBe("timeout");
      expect(report.warnings.join(" ")).toContain("65536-byte");
      expect(report.warnings.join(" ")).toContain("returned timeout");
      const noProcesses = await buildHarnessDiagnostics(rootDir, "codex", { probe: false, dependencies: {
        resolveExecutable: async () => { throw new Error("must not resolve"); },
        probe: async () => { throw new Error("must not probe"); },
      } });
      expect(noProcesses.probeStatus).toBe("not-requested");
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  test("invalid selections emit one versioned JSON usage envelope from the dispatcher", async () => {
    const { rootDir } = await fixture();
    try {
      for (const args of [["doctor", "--harness=unknown"], ["doctor", "--harness"],
        ["agent", "brief", "--harness=unknown"], ["agent", "unknown", "--harness=codex"]]) {
        const result = spawnSync(process.execPath, [entrypoint, ...args, "--json"], { cwd: rootDir, encoding: "utf8" });
        expect(result.status).toBe(2);
        const payload = JSON.parse(result.stdout);
        expect(payload.schema_version).toBe("1.0"); expect(payload.error.type).toBe("usage");
        expect(payload.harness).toBeNull();
      }
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });
});
