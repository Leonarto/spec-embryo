import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { ParsedArgs } from "../cli.ts";
import { flagValue, formatPath, hasFlag } from "../cli.ts";
import { initializeProject, readProjectConfig } from "../repository.ts";
import { pathExists } from "../storage.ts";
import { inspectAdoptionState, normalizeManagedHomeInput } from "../services/layout.ts";

async function promptForLayoutChoice(candidates: Array<{ relativePath: string; reason: string }>): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("Multiple docs/specs homes found. Re-run with --home <folder> or --standalone.");
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const options = candidates.map((candidate) => `${candidate.relativePath}/spm`);
    const promptLines = [
      "Multiple documentation/spec surfaces were found.",
      ...options.map((option, index) => `${index + 1}. ${option}`),
      `${options.length + 1}. spm`,
    ];
    stdout.write(`${promptLines.join("\n")}\n`);
    const answer = await rl.question("Choose the memory home number: ");
    const numeric = Number.parseInt(answer.trim(), 10);

    if (numeric >= 1 && numeric <= options.length) {
      return options[numeric - 1]!;
    }

    if (numeric === options.length + 1) {
      return "spm";
    }

    throw new Error("Invalid init selection.");
  } finally {
    rl.close();
  }
}

export async function runInitCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const explicitHome = flagValue(parsed, "home");
  const configFile = join(rootDir, ".specpm", "config.toml");
  const existingConfig = (await pathExists(configFile)) ? await readProjectConfig(rootDir) : undefined;
  const inspection = await inspectAdoptionState(rootDir, {
    explicitHome,
    standalone: hasFlag(parsed, "standalone"),
    config: existingConfig,
  });

  let memoryDir = explicitHome ? normalizeManagedHomeInput(explicitHome) : inspection.layoutChoice.memoryDir;
  if (inspection.layoutChoice.requiresChoice) {
    memoryDir = await promptForLayoutChoice(inspection.layoutChoice.candidates);
  }

  const result = await initializeProject(rootDir, {
    force: hasFlag(parsed, "force"),
    memoryDir,
  });
  const createdLines = result.created.map((filePath) => `created ${formatPath(rootDir, filePath)}`);
  const skippedLines = result.skipped.map((filePath) => `kept ${formatPath(rootDir, filePath)}`);

  return [
    "Initialized Spec Embryo project memory.",
    `Adoption state: ${inspection.state}`,
    `Memory home: ${result.memoryDir}`,
    "",
    "Repo inspection:",
    ...inspection.findings.map((finding) => `- ${finding}`),
    "",
    "Init sequence:",
    ...result.sequence.map((step, index) => `${index + 1}. ${step}`),
    "",
    ...createdLines,
    ...(skippedLines.length > 0 ? ["", ...skippedLines] : []),
  ].join("\n");
}
