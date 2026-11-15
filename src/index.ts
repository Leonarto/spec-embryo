#!/usr/bin/env bun

import { cwd, exit } from "node:process";
import { helpText, parseArgs } from "./cli.ts";
import { runAgentCommand } from "./commands/agent.ts";
import { runAgentsCommand } from "./commands/agents.ts";
import { runCurrentCommand } from "./commands/current.ts";
import { runDoctorCommand } from "./commands/doctor.ts";
import { runHandoffCommand } from "./commands/handoff.ts";
import { runHooksCommandResult } from "./commands/hooks.ts";
import { runImportCommand } from "./commands/import.ts";
import { runInitCommand } from "./commands/init.ts";
import { runMemoryCommand } from "./commands/memory.ts";
import { runNexusCommand } from "./commands/nexus.ts";
import { runPortfolioCommand } from "./commands/portfolio.ts";
import { runProfileCommand } from "./commands/profile.ts";
import { runReleaseCommand } from "./commands/release.ts";
import { runReshapeCommand } from "./commands/reshape.ts";
import { ResumeCommandError, runResumeCommandResult } from "./commands/resume.ts";
import { runSpecCommand } from "./commands/spec.ts";
import { runStatusCommand } from "./commands/status.ts";
import { runTaskCommand } from "./commands/task.ts";
import { runTestsCommand } from "./commands/tests.ts";
import { runUiCommand } from "./commands/ui.ts";
import { readCliVersion } from "./services/version.ts";
import { HarnessSelectionError } from "./services/harness-diagnostics.ts";
import { withSchemaVersion } from "./services/contracts.ts";

let outputStarted = false;
async function writeOutput(text: string): Promise<void> {
  outputStarted = true;
  await new Promise<void>((resolve, reject) => {
    process.stdout.write(`${text}\n`, (error) => error ? reject(error) : resolve());
  });
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const rootDir = cwd();

  if (parsed.flags.has("version")) {
    console.log(await readCliVersion());
    return;
  }

  if (!parsed.command || parsed.command === "--help" || parsed.command === "help") {
    console.log(helpText());
    return;
  }

  let output: string;

  switch (parsed.command) {
    case "init":
      output = await runInitCommand(rootDir, parsed);
      break;
    case "import":
      output = await runImportCommand(rootDir, parsed);
      break;
    case "status":
      output = await runStatusCommand(rootDir, parsed);
      break;
    case "doctor":
      output = await runDoctorCommand(rootDir, parsed);
      break;
    case "ui":
      output = await runUiCommand(rootDir, parsed);
      break;
    case "reshape":
      output = await runReshapeCommand(rootDir, parsed);
      break;
    case "resume": {
      // Keep capturable signals from interrupting the final JSON write after the
      // runner has removed its forwarding handlers and closed the child.
      const printingGuard = () => {};
      process.on("SIGINT", printingGuard); process.on("SIGTERM", printingGuard);
      try {
        const result = await runResumeCommandResult(rootDir, parsed);
        process.exitCode = result.exitCode;
        if (result.text) await writeOutput(result.text);
      } finally {
        process.off("SIGINT", printingGuard); process.off("SIGTERM", printingGuard);
      }
      return;
    }
    case "handoff":
      output = await runHandoffCommand(rootDir, parsed);
      break;
    case "hooks": {
      const result = await runHooksCommandResult(rootDir, parsed);
      output = result.text; process.exitCode = result.exitCode;
      break;
    }
    case "current":
      output = await runCurrentCommand(rootDir, parsed);
      break;
    case "agents":
      output = await runAgentsCommand(rootDir, parsed);
      break;
    case "agent":
      output = await runAgentCommand(rootDir, parsed);
      break;
    case "memory":
      output = await runMemoryCommand(rootDir, parsed);
      break;
    case "nexus":
      output = await runNexusCommand(rootDir, parsed);
      break;
    case "portfolio":
      output = await runPortfolioCommand(rootDir, parsed);
      break;
    case "profile":
      output = await runProfileCommand(rootDir, parsed);
      break;
    case "release":
      output = await runReleaseCommand(rootDir, parsed);
      break;
    case "spec":
      output = await runSpecCommand(rootDir, parsed);
      break;
    case "task":
      output = await runTaskCommand(rootDir, parsed);
      break;
    case "tests":
      output = await runTestsCommand(rootDir, parsed);
      break;
    case "version":
      output = await readCliVersion();
      break;
    default:
      throw new Error(`Unknown command: ${parsed.command}`);
  }

  if (output.length > 0) {
    if (parsed.flags.has("harness") && (parsed.command === "doctor" || parsed.command === "agent" || parsed.command === "hooks")) await writeOutput(output);
    else console.log(output);
  }
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  const parsed = parseArgs(process.argv.slice(2));
  if (!outputStarted && (parsed.command === "doctor" || parsed.command === "agent") && parsed.flags.has("harness") && parsed.flags.has("json")) {
    process.exitCode = error instanceof HarnessSelectionError ? 2 : 1;
    try {
      await writeOutput(JSON.stringify(withSchemaVersion({ harness: null,
        error: { type: error instanceof HarnessSelectionError ? "usage" : "io", message } }), null, 2));
    } catch { process.exitCode = 1; }
    return;
  }
  console.error(`spec-embryo error: ${message}`);
  exit(error instanceof ResumeCommandError || error instanceof HarnessSelectionError ? error.exitCode : 1);
});
