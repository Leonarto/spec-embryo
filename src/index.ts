#!/usr/bin/env bun

import { cwd, exit } from "node:process";
import { helpText, parseArgs } from "./cli.ts";
import { runAgentCommand } from "./commands/agent.ts";
import { runAgentsCommand } from "./commands/agents.ts";
import { runCurrentCommand } from "./commands/current.ts";
import { runDoctorCommand } from "./commands/doctor.ts";
import { runHandoffCommand } from "./commands/handoff.ts";
import { runHooksCommand } from "./commands/hooks.ts";
import { runImportCommand } from "./commands/import.ts";
import { runInitCommand } from "./commands/init.ts";
import { runMemoryCommand } from "./commands/memory.ts";
import { runNexusCommand } from "./commands/nexus.ts";
import { runPortfolioCommand } from "./commands/portfolio.ts";
import { runProfileCommand } from "./commands/profile.ts";
import { runReleaseCommand } from "./commands/release.ts";
import { runReshapeCommand } from "./commands/reshape.ts";
import { ResumeCommandError, runResumeCommand } from "./commands/resume.ts";
import { runSpecCommand } from "./commands/spec.ts";
import { runStatusCommand } from "./commands/status.ts";
import { runTaskCommand } from "./commands/task.ts";
import { runTestsCommand } from "./commands/tests.ts";
import { runUiCommand } from "./commands/ui.ts";
import { readCliVersion } from "./services/version.ts";

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
    case "resume":
      output = await runResumeCommand(rootDir, parsed);
      break;
    case "handoff":
      output = await runHandoffCommand(rootDir, parsed);
      break;
    case "hooks":
      output = await runHooksCommand(rootDir, parsed);
      break;
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
    console.log(output);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`spec-embryo error: ${message}`);
  exit(error instanceof ResumeCommandError ? error.exitCode : 1);
});
