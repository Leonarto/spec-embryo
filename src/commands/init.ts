import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { ParsedArgs } from "../cli.ts";
import { flagValue, formatPath, hasFlag } from "../cli.ts";
import { parseTomlFrontmatter } from "../frontmatter.ts";
import { resolveProjectPaths } from "../paths.ts";
import { initializeProject, readProjectConfig, writeAdoptionArtifacts } from "../repository.ts";
import { listMarkdownFiles, pathExists, readUtf8 } from "../storage.ts";
import {
  buildAdoptionGuidance,
  renderAdoptionGuidance,
  renderDirectAgentBrief,
  renderMigrationGuideMarkdown,
} from "../services/adoption.ts";
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

function hasSeedTag(attributes: unknown): boolean {
  if (!attributes || typeof attributes !== "object" || !("tags" in attributes)) {
    return false;
  }

  const tags = (attributes as { tags?: unknown }).tags;
  return Array.isArray(tags) && tags.some((tag) => tag === "seed");
}

async function detectSeedScaffoldBestEffort(
  rootDir: string,
  memoryDir: string,
): Promise<boolean> {
  const paths = resolveProjectPaths(rootDir, await readProjectConfig(rootDir));
  const files: string[] = [];

  if (paths.memoryDir.endsWith(memoryDir) && (await pathExists(paths.stateFile))) {
    files.push(paths.stateFile);
  }

  for (const dirPath of [paths.specsDir, paths.tasksDir]) {
    if (!(await pathExists(dirPath))) {
      continue;
    }

    files.push(...(await listMarkdownFiles(dirPath)));
  }

  for (const filePath of files) {
    try {
      const raw = await readUtf8(filePath);
      const { attributes } = parseTomlFrontmatter(raw);
      if (hasSeedTag(attributes)) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

export async function runInitCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const explicitHome = flagValue(parsed, "home");
  const configFile = join(rootDir, ".specpm", "config.toml");
  const existingConfig = (await pathExists(configFile)) ? await readProjectConfig(rootDir) : undefined;
  const preInitInspection = await inspectAdoptionState(rootDir, {
    explicitHome,
    standalone: hasFlag(parsed, "standalone"),
    config: existingConfig,
  });

  let memoryDir = explicitHome ? normalizeManagedHomeInput(explicitHome) : preInitInspection.layoutChoice.memoryDir;
  if (preInitInspection.layoutChoice.requiresChoice) {
    memoryDir = await promptForLayoutChoice(preInitInspection.layoutChoice.candidates);
  }

  const result = await initializeProject(rootDir, {
    force: hasFlag(parsed, "force"),
    memoryDir,
    profile: flagValue(parsed, "profile"),
  });
  const projectConfig = await readProjectConfig(rootDir);
  const seedScaffoldDetected = await detectSeedScaffoldBestEffort(rootDir, result.memoryDir);
  const inspection = await inspectAdoptionState(rootDir, {
    config: projectConfig,
  });
  const guidance = buildAdoptionGuidance({
    adoption: inspection,
    memoryDir: result.memoryDir,
    created: result.created.map((filePath) => formatPath(rootDir, filePath)),
    refreshed: result.refreshed.map((filePath) => formatPath(rootDir, filePath)),
    skipped: result.skipped.map((filePath) => formatPath(rootDir, filePath)),
    commandContext: "init",
    seedScaffoldDetected,
  });
  const directAgentBrief = renderDirectAgentBrief({
    projectName: projectConfig.projectName,
    memoryDir: result.memoryDir,
    adoption: inspection,
    guidance,
  });
  const adoptionArtifacts = await writeAdoptionArtifacts(
    rootDir,
    result.memoryDir,
    {
      migrationGuide: renderMigrationGuideMarkdown({
        projectName: projectConfig.projectName,
        memoryDir: result.memoryDir,
        adoption: inspection,
        guidance,
      }),
      agentBrief: directAgentBrief,
    },
    {
      force: hasFlag(parsed, "force"),
    },
  );
  const createdLines = [...result.created, ...adoptionArtifacts.created].map((filePath) => `created ${formatPath(rootDir, filePath)}`);
  const refreshedLines = [...result.refreshed, ...adoptionArtifacts.refreshed].map((filePath) => `refreshed ${formatPath(rootDir, filePath)}`);
  const skippedLines = [...result.skipped, ...adoptionArtifacts.skipped].map((filePath) => `kept ${formatPath(rootDir, filePath)}`);

  if (parsed.flags.has("json")) {
    return JSON.stringify(
      {
        memory_dir: result.memoryDir,
        profile: result.profile,
        adopted_home: inspection.layoutChoice.adoptedHome,
        adoption_state: inspection.state,
        inspection,
        pre_init_inspection: preInitInspection,
        sequence: result.sequence,
        created: [...result.created, ...adoptionArtifacts.created].map((filePath) => formatPath(rootDir, filePath)),
        refreshed: [...result.refreshed, ...adoptionArtifacts.refreshed].map((filePath) => formatPath(rootDir, filePath)),
        skipped: [...result.skipped, ...adoptionArtifacts.skipped].map((filePath) => formatPath(rootDir, filePath)),
        migration_guide_file: formatPath(rootDir, adoptionArtifacts.migrationGuideFile),
        direct_agent_brief_file: formatPath(rootDir, adoptionArtifacts.agentBriefFile),
        direct_agent_brief: directAgentBrief,
        guidance,
      },
      null,
      2,
    );
  }

  return [
    "Initialized Spec Embryo project memory.",
    `Adoption state: ${inspection.state}`,
    `Memory home: ${result.memoryDir}`,
    ...(result.profile ? [`Project profile: ${result.profile}`] : []),
    "",
    "Init sequence:",
    ...result.sequence.map((step, index) => `${index + 1}. ${step}`),
    "",
    ...renderAdoptionGuidance(guidance),
    "",
    "Migration guide file:",
    `- ${formatPath(rootDir, adoptionArtifacts.migrationGuideFile)}`,
    "",
    "Direct agent brief file:",
    `- ${formatPath(rootDir, adoptionArtifacts.agentBriefFile)}`,
    "",
    "Direct agent brief (copy this to the current coding agent):",
    ...directAgentBrief.trimEnd().split("\n"),
    "",
    ...createdLines,
    ...(refreshedLines.length > 0 ? ["", ...refreshedLines] : []),
    ...(skippedLines.length > 0 ? ["", ...skippedLines] : []),
  ].join("\n");
}
