import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";
import type { HarnessProvider } from "../domain.ts";
import type { AdoptionCommandSuggestion } from "./adoption.ts";
import { resolveHarnessExecutable, runHarnessProbe, type HarnessProbeArgs, type HarnessProbeResult } from "./harness-probe.ts";

export type HarnessCapabilityState = "observed" | "documented" | "unsupported" | "unverified";
export interface HarnessCapability { status: HarnessCapabilityState; evidence: string[]; note: string }
export interface HarnessInstructionInspection {
  instructionFiles: string[];
  importsAgents: boolean;
  spmBlocks: string[];
  warnings: string[];
}
export interface HarnessDiagnosticReport {
  provider: HarnessProvider;
  executable: string | null;
  version: { raw: string; parsed: string | null; prerelease: boolean } | null;
  probeStatus: "available" | "missing" | "timeout" | "error" | "not-requested";
  capabilities: Record<string, HarnessCapability>;
  instructionFiles: string[];
  warnings: string[];
  suggestedCommands: AdoptionCommandSuggestion[];
}
export class HarnessSelectionError extends Error { readonly exitCode = 2; }

export function selectHarness(value: string | boolean | undefined): HarnessProvider | undefined {
  if (value === undefined) return undefined;
  if (value === "codex" || value === "claude") return value;
  throw new HarnessSelectionError("--harness requires codex or claude.");
}

const INSTRUCTION_PATHS = ["AGENTS.md", "CLAUDE.md", "CLAUDE.local.md", ".claude/CLAUDE.md",
  ".claude/settings.json", ".codex/hooks.json", ".codex/config.toml"];

export async function inspectHarnessInstructions(rootDir: string, provider: HarnessProvider): Promise<HarnessInstructionInspection> {
  const root = await realpath(rootDir);
  const instructionFiles: string[] = [];
  const contents = new Map<string, string>();
  const warnings: string[] = [];
  for (const path of INSTRUCTION_PATHS) {
    let handle;
    try {
      const canonical = await realpath(join(root, path));
      const local = relative(root, canonical);
      if (local === ".." || local.startsWith("../") || local.startsWith("..\\") || isAbsolute(local)) {
        warnings.push(`Instruction path ${path} resolves outside the project root; it was not inspected.`);
        continue;
      }
      if (!(await lstat(canonical)).isFile()) {
        warnings.push(`Instruction path ${path} is not a regular file.`);
        continue;
      }
      // Revalidate after a nonblocking open: a path may change after lstat.
      const flags = constants.O_RDONLY | (constants.O_NONBLOCK ?? 0) | (constants.O_NOFOLLOW ?? 0);
      handle = await open(canonical, flags);
      const stat = await handle.stat();
      if (!stat.isFile()) { warnings.push(`Instruction path ${path} is not a regular file.`); continue; }
      instructionFiles.push(path);
      const buffer = Buffer.alloc(65536);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      contents.set(path, buffer.subarray(0, bytesRead).toString("utf8"));
      if (stat.size > buffer.length) warnings.push(`Instruction inspection of ${path} was limited to 65536 bytes; review the rest manually.`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") warnings.push(`Instruction path ${path} could not be inspected; review it manually.`);
    } finally { await handle?.close(); }
  }
  const claudePaths = ["CLAUDE.md", "CLAUDE.local.md", ".claude/CLAUDE.md"];
  const importsAgents = claudePaths.some((path) => /(?:^|\s)@(?:\.\/)?AGENTS\.md(?=\s|$)/m.test(contents.get(path) ?? ""));
  const spmBlocks = [...contents].filter(([, value]) => /^#{1,6}\s+(?:Optional\s+)?SpM\b|<!--\s*spm\b/im.test(value)).map(([path]) => path);
  if (spmBlocks.length > 1) warnings.push("Multiple root instruction files contain SpM blocks; review possible duplicate guidance.");
  if (provider === "claude") {
    if (instructionFiles.includes("AGENTS.md") && claudePaths.some((path) => instructionFiles.includes(path))) {
      warnings.push(importsAgents ? "A Claude instruction file imports AGENTS.md; verify whether native loading also includes it to avoid duplicate guidance."
        : "AGENTS.md and Claude instruction files coexist; review possible shadowing and loading conditions manually.");
    }
    if (instructionFiles.includes("CLAUDE.local.md")) warnings.push("CLAUDE.local.md exists; review local instruction precedence.");
    warnings.push("Claude AGENTS.md loading depends on version/configuration and other instruction files; static inspection does not confirm effective loading. Use spm agent snippet --harness claude for bounded guidance; review an @AGENTS.md import only if needed.");
  }
  const hookFiles = provider === "codex" ? [".codex/hooks.json", ".codex/config.toml"] : [".claude/settings.json"];
  const hookContext = hookFiles.filter((path) => /spm\s+(?:agent\s+hook-context|resume|memory)/.test(contents.get(path) ?? ""));
  if (hookContext.length && spmBlocks.length) warnings.push("SpM context hooks and instruction blocks coexist; review possible duplicate context before installing anything.");
  if (provider === "codex" && /(?:^|\n)\s*(?:\[[^\]]*hooks[^\]]*\]|hooks\s*=)/i.test(contents.get(".codex/config.toml") ?? "")) {
    warnings.push("Inline Codex hook configuration exists; review possible duplication with .codex/hooks.json manually.");
  }
  return { instructionFiles, importsAgents, spmBlocks, warnings };
}

export function projectHarnessDiagnostics(provider: HarnessProvider, executable: string | null,
  probes: Array<{ args: HarnessProbeArgs; result: HarnessProbeResult }>, instructions: HarnessInstructionInspection,
  requested: boolean): HarnessDiagnosticReport {
  const warnings = [...instructions.warnings];
  const versionProbe = probes.find((entry) => entry.args[0] === "--version");
  const raw = versionProbe?.result.output.trim() ?? "";
  const match = raw.match(/(?:^|\s)v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)(?=\s|$)/);
  const parsed = match?.[1] ?? null;
  const prerelease = parsed?.includes("-") ?? false;
  let probeStatus: HarnessDiagnosticReport["probeStatus"] = requested ? executable ? "available" : "missing" : "not-requested";
  if (probes.some((entry) => entry.result.status === "error")) probeStatus = "error";
  if (probes.some((entry) => entry.result.status === "timeout")) probeStatus = "timeout";
  if (requested && !executable) warnings.push(`${provider} executable was not found on PATH; portable prompt-return remains available.`);
  if (requested && executable && (!parsed || prerelease)) warnings.push("Harness version is unknown or prerelease; native compatibility remains unverified and no flags are added automatically.");
  for (const { args, result } of probes) {
    if (result.status !== "available") warnings.push(`Harness probe ${args.join(" ")} returned ${result.status}; review manually.`);
    if (result.truncated) warnings.push(`Harness probe ${args.join(" ")} exceeded the combined 65536-byte output limit; advertised capabilities may be incomplete.`);
  }
  const advertised = (args: string, flag: string) => probes.some((entry) => entry.args.join(" ") === args &&
    entry.result.status === "available" && new RegExp(`(?:^|[\\s,[(])${flag}(?=$|[\\s,=\\]<>])`).test(entry.result.output));
  const capability = (status: HarnessCapabilityState, evidence: string[], note: string): HarnessCapability => ({ status, evidence, note });
  const structuredObserved = advertised(provider === "codex" ? "exec --help" : "--help", provider === "codex" ? "--json" : "--output-format");
  const resumeObserved = provider === "codex" ? advertised("exec resume --help", "resume") : advertised("--help", "--resume");
  return {
    provider, executable, version: versionProbe ? { raw, parsed, prerelease } : null, probeStatus,
    capabilities: {
      prompt_return: capability("observed", ["spm resume --backend prompt --json"], "Portable project context is available independently of a harness CLI."),
      native_compatibility: capability("unverified", [], "Version/help probes do not verify model execution, permissions, or effective instruction loading."),
      structured_output: capability(structuredObserved ? "observed" : "unverified", structuredObserved ? [provider === "codex" ? "exec --help advertises --json" : "--help advertises --output-format"] : [], "Advertised flags are observations, not execution compatibility guarantees."),
      session_resume: capability(resumeObserved ? "observed" : "unverified", resumeObserved ? [provider === "codex" ? "exec resume --help advertises resume" : "--help advertises --resume"] : [], "No session is selected or resumed by diagnosis."),
      root_instructions: capability("documented", ["documentation profile 2026-11-15"], "Root AGENTS remains the project source; inspected paths do not prove files were loaded."),
      session_hooks: capability("documented", ["documentation profile 2026-11-15"], "Repository hook formats are documented; diagnosis installs nothing and does not grant trust."),
    },
    instructionFiles: instructions.instructionFiles,
    warnings,
    suggestedCommands: [
      { command: "spm resume --backend prompt --json", reason: "Read portable context with no nested agent call." },
      { command: `spm agent snippet --harness ${provider}`, reason: "Get bounded adoption guidance without running probes or writing files." },
    ],
  };
}

export interface HarnessDiagnosticDependencies {
  resolveExecutable?: (provider: HarnessProvider, rootDir: string) => Promise<string | null>;
  probe?: typeof runHarnessProbe;
}

export async function buildHarnessDiagnostics(rootDir: string, provider: HarnessProvider, options: {
  probe?: boolean; dependencies?: HarnessDiagnosticDependencies;
} = {}): Promise<HarnessDiagnosticReport> {
  const instructions = await inspectHarnessInstructions(rootDir, provider);
  const requested = options.probe ?? true;
  const executable = requested ? await (options.dependencies?.resolveExecutable ?? resolveHarnessExecutable)(provider, rootDir) : null;
  const args: HarnessProbeArgs[] = provider === "codex" ? [["--version"], ["--help"], ["exec", "--help"], ["exec", "resume", "--help"]]
    : [["--version"], ["--help"]];
  const probes: Array<{ args: HarnessProbeArgs; result: HarnessProbeResult }> = [];
  if (requested && executable) for (const command of args) {
    const result = await (options.dependencies?.probe ?? runHarnessProbe)(executable, command, rootDir);
    probes.push({ args: command, result });
  }
  return projectHarnessDiagnostics(provider, executable, probes, instructions, requested);
}

export function renderHarnessDiagnostics(report: HarnessDiagnosticReport): string {
  return [`Harness: ${report.provider} | probe ${report.probeStatus} | version ${report.version?.parsed ?? "unverified"}`,
    `Executable: ${report.executable ?? "not resolved"}`,
    "Capability observations:", ...Object.entries(report.capabilities).map(([key, value]) => `- ${key}: ${value.status}. ${value.note}`),
    `Root instruction paths: ${report.instructionFiles.length ? report.instructionFiles.join(", ") : "none observed"}`,
    ...report.warnings.map((warning) => `Warning: ${warning}`),
    ...report.suggestedCommands.map((suggestion) => `- ${suggestion.command} — ${suggestion.reason}`)].join("\n");
}
