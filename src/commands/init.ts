import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { ParsedArgs } from "../cli.ts";
import { flagValue, formatPath, hasFlag } from "../cli.ts";
import { initializeProject } from "../repository.ts";
import { normalizeManagedHomeInput, resolveLayoutChoice } from "../services/layout.ts";

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
  let memoryDir = flagValue(parsed, "home");
  if (memoryDir) {
    memoryDir = normalizeManagedHomeInput(memoryDir);
  } else {
    const choice = await resolveLayoutChoice(rootDir, {
      standalone: hasFlag(parsed, "standalone"),
    });

    if (choice.requiresChoice) {
      memoryDir = await promptForLayoutChoice(choice.candidates);
    } else {
      memoryDir = choice.memoryDir;
    }
  }

  const result = await initializeProject(rootDir, {
    force: hasFlag(parsed, "force"),
    memoryDir,
  });
  const createdLines = result.created.map((filePath) => `created ${formatPath(rootDir, filePath)}`);
  const skippedLines = result.skipped.map((filePath) => `kept ${formatPath(rootDir, filePath)}`);

  return [
    "Initialized Spec Embryo project memory.",
    `Memory home: ${result.memoryDir}`,
    "",
    "Init sequence:",
    ...result.sequence.map((step, index) => `${index + 1}. ${step}`),
    "",
    ...createdLines,
    ...(skippedLines.length > 0 ? ["", ...skippedLines] : []),
  ].join("\n");
}
