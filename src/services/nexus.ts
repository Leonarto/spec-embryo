import { join } from "node:path";
import type { NexusRootAgentsMode, ProjectConfig } from "../domain.ts";
import { NEXUS_ROOT_AGENTS_MODES } from "../domain.ts";
import {
  buildAdoptionArtifactPaths,
  buildAdoptionGuidance,
  NEXUS_COEXISTENCE_HEADING,
  nexusCoexistenceLines,
  renderDirectAgentBrief,
  renderMigrationGuideMarkdown,
} from "./adoption.ts";
import { inspectAdoptionState } from "./layout.ts";
import { readProjectConfig } from "../repository.ts";
import { pathExists, readUtf8, writeUtf8 } from "../storage.ts";

export type NexusSetupActionStatus = "planned" | "applied" | "already-ok";

export interface NexusSetupAction {
  code: string;
  status: NexusSetupActionStatus;
  path?: string;
  message: string;
}

export interface NexusSetupReport {
  applied: boolean;
  command: string;
  rootAgentsMode: NexusRootAgentsMode;
  actions: NexusSetupAction[];
  notes: string[];
  nextCommands: string[];
}

export interface NexusSetupOptions {
  apply?: boolean;
  command?: string;
  rootAgentsMode?: NexusRootAgentsMode;
}

const DEFAULT_NEXUS_COMMAND = "gitnexus";
const LEGACY_PLACEHOLDER_NEXUS_COMMAND = "nexus";

function relativeOrPath(rootDir: string, absolutePath: string): string {
  return absolutePath.startsWith(`${rootDir}/`) ? absolutePath.slice(rootDir.length + 1) : absolutePath;
}

function validateRootAgentsMode(value: string | undefined): NexusRootAgentsMode | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (NEXUS_ROOT_AGENTS_MODES.includes(value as NexusRootAgentsMode) && value !== "managed-by-nexus") {
    return value as NexusRootAgentsMode;
  }

  throw new Error("`nexus setup --root-agents-mode` must be `reference-only` or `scoped`.");
}

function selectedCommand(config: ProjectConfig, override: string | undefined): string {
  if (override && override.trim().length > 0) {
    return override.trim();
  }

  if (config.nexus.command && config.nexus.command !== LEGACY_PLACEHOLDER_NEXUS_COMMAND) {
    return config.nexus.command;
  }

  return DEFAULT_NEXUS_COMMAND;
}

function renderTomlStringArray(values: string[]): string {
  return `[${values.map((value) => JSON.stringify(value)).join(", ")}]`;
}

function renderNexusSection(command: string, rootAgentsMode: NexusRootAgentsMode, args: string[]): string {
  return [
    "[nexus]",
    "enabled = true",
    `command = ${JSON.stringify(command)}`,
    `args = ${renderTomlStringArray(args)}`,
    `root_agents_mode = ${JSON.stringify(rootAgentsMode)}`,
  ].join("\n");
}

function upsertNexusSection(rawConfig: string, command: string, rootAgentsMode: NexusRootAgentsMode, args: string[]): string {
  const section = renderNexusSection(command, rootAgentsMode, args);
  const nexusSectionPattern = /(^|\n)\[nexus\]\n[\s\S]*?(?=\n\[|\s*$)/u;

  if (nexusSectionPattern.test(rawConfig)) {
    return rawConfig.replace(nexusSectionPattern, (_match, prefix: string) => `${prefix}${section}`);
  }

  const backendMarker = "\n[backends.deterministic]";
  if (rawConfig.includes(backendMarker)) {
    return rawConfig.replace(backendMarker, `\n${section}\n${backendMarker}`);
  }

  return `${rawConfig.trimEnd()}\n\n${section}\n`;
}

function nexusContractSection(): string {
  return [`## ${NEXUS_COEXISTENCE_HEADING}`, "", ...nexusCoexistenceLines().map((line) => `- ${line}`)].join("\n");
}

function agentsContainsNexusContract(content: string): boolean {
  return hasCoreNexusContract(content) && hasNexusSetupInstruction(content);
}

function nexusSetupLine(): string {
  return "Run `spm nexus setup` to preview; ask before `spm nexus setup --apply`.";
}

function hasNexusSetupInstruction(content: string): boolean {
  return content.includes("spm nexus setup") && content.includes("spm nexus setup --apply");
}

function hasCoreNexusContract(content: string): boolean {
  return (
    content.includes(NEXUS_COEXISTENCE_HEADING) &&
    content.includes("Use `spm` as the source of truth") &&
    content.includes("Use Nexus for code impact, related-code, and blast-radius analysis only.") &&
    content.includes("Do not let Nexus replace or overwrite root `AGENTS.md`")
  );
}

function appendMissingNexusContractLines(rawAgents: string): string {
  const missingLines = hasCoreNexusContract(rawAgents)
    ? [nexusSetupLine()].filter(() => !hasNexusSetupInstruction(rawAgents))
    : nexusCoexistenceLines().filter((line) => !rawAgents.includes(line));
  if (missingLines.length === 0) {
    return rawAgents;
  }

  const heading = `## ${NEXUS_COEXISTENCE_HEADING}`;
  const headingIndex = rawAgents.indexOf(heading);
  if (headingIndex < 0) {
    return `${rawAgents.trimEnd()}\n\n${nexusContractSection()}\n`;
  }

  const nextHeadingIndex = rawAgents.indexOf("\n## ", headingIndex + heading.length);
  const insertIndex = nextHeadingIndex < 0 ? rawAgents.length : nextHeadingIndex;
  const before = rawAgents.slice(0, insertIndex).trimEnd();
  const after = rawAgents.slice(insertIndex);

  return `${before}\n${missingLines.map((line) => `- ${line}`).join("\n")}${after.length > 0 ? `\n${after}` : "\n"}`;
}

function upsertAgentsContract(rawAgents: string | undefined): string {
  const section = nexusContractSection();

  if (!rawAgents || rawAgents.trim().length === 0) {
    return `# AGENTS\n\n${section}\n`;
  }

  if (agentsContainsNexusContract(rawAgents)) {
    return rawAgents;
  }

  if (rawAgents.includes(`## ${NEXUS_COEXISTENCE_HEADING}`)) {
    return appendMissingNexusContractLines(rawAgents);
  }

  return `${rawAgents.trimEnd()}\n\n${section}\n`;
}

function normalizedIgnoreLines(rawGitignore: string | undefined): Set<string> {
  const lines = rawGitignore?.split(/\r?\n/u) ?? [];
  return new Set(
    lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => line.replace(/^\/+/u, "").replace(/\/+$/u, "")),
  );
}

function upsertIgnoreRules(rawGitignore: string | undefined): string {
  const existing = normalizedIgnoreLines(rawGitignore);
  const additions = [".gitnexus", ".claude"].filter((line) => !existing.has(line));

  if (additions.length === 0) {
    return rawGitignore ?? "";
  }

  const base = rawGitignore && rawGitignore.trim().length > 0 ? rawGitignore.trimEnd() : "# local editor / agent state";
  return `${base}\n${additions.join("\n")}\n`;
}

function pushAction(actions: NexusSetupAction[], action: NexusSetupAction): void {
  actions.push(action);
}

export async function buildNexusSetupReport(rootDir: string, options: NexusSetupOptions = {}): Promise<NexusSetupReport> {
  const apply = options.apply === true;
  const configFile = join(rootDir, ".specpm", "config.toml");
  const configExists = await pathExists(configFile);
  const requestedRootAgentsMode = validateRootAgentsMode(options.rootAgentsMode);

  if (!configExists) {
    if (apply) {
      throw new Error("`spm nexus setup --apply` requires an adopted repo with `.specpm/config.toml`. Run `spm init` first.");
    }

    return {
      applied: false,
      command: options.command?.trim() || DEFAULT_NEXUS_COMMAND,
      rootAgentsMode: requestedRootAgentsMode ?? "reference-only",
      actions: [
        {
          code: "missing-config",
          status: "planned",
          path: ".specpm/config.toml",
          message: "Run `spm init` before applying Nexus setup because this repo has no Spec Embryo config yet.",
        },
      ],
      notes: ["Nexus is optional and external; `spm` will not install it."],
      nextCommands: ["spm init", "spm nexus setup --apply"],
    };
  }

  const config = await readProjectConfig(rootDir);
  const configuredRootAgentsMode = config.nexus.rootAgentsMode === "managed-by-nexus" ? "reference-only" : config.nexus.rootAgentsMode;
  const rootAgentsMode = requestedRootAgentsMode ?? configuredRootAgentsMode;
  const command = selectedCommand(config, options.command);
  const args = config.nexus.args;
  const actions: NexusSetupAction[] = [];

  const rawConfig = await readUtf8(configFile);
  const configAlreadyMatches =
    config.nexus.enabled &&
    config.nexus.command === command &&
    config.nexus.rootAgentsMode === rootAgentsMode &&
    config.nexus.args.length === args.length &&
    config.nexus.args.every((arg, index) => arg === args[index]);
  const nextConfig = configAlreadyMatches ? rawConfig : upsertNexusSection(rawConfig, command, rootAgentsMode, args);
  const configChanged = !configAlreadyMatches;
  pushAction(actions, {
    code: "config",
    status: configChanged ? (apply ? "applied" : "planned") : "already-ok",
    path: ".specpm/config.toml",
    message: configChanged
      ? `Enable Nexus with command \`${command}\` and root AGENTS mode \`${rootAgentsMode}\`.`
      : `Nexus config already enables command \`${command}\` with root AGENTS mode \`${rootAgentsMode}\`.`,
  });
  if (apply && configChanged) {
    await writeUtf8(configFile, nextConfig);
  }

  const agentsFile = rootAgentsMode === "scoped" ? join(rootDir, config.memoryDir, "AGENTS.md") : join(rootDir, "AGENTS.md");
  const agentsExists = await pathExists(agentsFile);
  const rawAgents = agentsExists ? await readUtf8(agentsFile) : undefined;
  const nextAgents = upsertAgentsContract(rawAgents);
  const agentsChanged = rawAgents !== nextAgents;
  pushAction(actions, {
    code: "agents",
    status: agentsChanged ? (apply ? "applied" : "planned") : "already-ok",
    path: relativeOrPath(rootDir, agentsFile),
    message: agentsChanged
      ? `Add the bounded Nexus coexistence contract to ${relativeOrPath(rootDir, agentsFile)}.`
      : `${relativeOrPath(rootDir, agentsFile)} already contains the bounded Nexus coexistence contract.`,
  });
  if (apply && agentsChanged) {
    await writeUtf8(agentsFile, nextAgents);
  }

  const gitignoreFile = join(rootDir, ".gitignore");
  const rawGitignore = (await pathExists(gitignoreFile)) ? await readUtf8(gitignoreFile) : undefined;
  const nextGitignore = upsertIgnoreRules(rawGitignore);
  const gitignoreChanged = rawGitignore !== nextGitignore;
  pushAction(actions, {
    code: "gitignore",
    status: gitignoreChanged ? (apply ? "applied" : "planned") : "already-ok",
    path: ".gitignore",
    message: gitignoreChanged
      ? "Ignore local `.gitnexus` and `.claude` artifacts."
      : "Local `.gitnexus` and `.claude` artifacts are already ignored.",
  });
  if (apply && gitignoreChanged) {
    await writeUtf8(gitignoreFile, nextGitignore);
  }

  const adoption = await inspectAdoptionState(rootDir, { config });
  const guidance = buildAdoptionGuidance({
    adoption,
    memoryDir: config.memoryDir,
    commandContext: "init",
  });
  const directAgentBrief = renderDirectAgentBrief({
    projectName: config.projectName,
    memoryDir: config.memoryDir,
    adoption,
    guidance,
  });
  const migrationGuide = renderMigrationGuideMarkdown({
    projectName: config.projectName,
    memoryDir: config.memoryDir,
    adoption,
    guidance,
  });

  const artifactPaths = buildAdoptionArtifactPaths(config.memoryDir);
  const migrationGuideFile = join(rootDir, artifactPaths.migrationGuideFile);
  const agentBriefFile = join(rootDir, artifactPaths.agentBriefFile);
  const existingMigrationGuide = (await pathExists(migrationGuideFile)) ? await readUtf8(migrationGuideFile) : undefined;
  const existingAgentBrief = (await pathExists(agentBriefFile)) ? await readUtf8(agentBriefFile) : undefined;
  const artifactsChanged = existingMigrationGuide !== migrationGuide || existingAgentBrief !== directAgentBrief;
  pushAction(actions, {
    code: "adoption-artifacts",
    status: artifactsChanged ? (apply ? "applied" : "planned") : "already-ok",
    path: artifactPaths.adoptionDir,
    message: artifactsChanged
      ? "Refresh migration guide and direct agent brief with the current Nexus setup guidance."
      : "Migration guide and direct agent brief already contain the current Nexus setup guidance.",
  });
  if (apply && artifactsChanged) {
    await writeUtf8(migrationGuideFile, migrationGuide);
    await writeUtf8(agentBriefFile, directAgentBrief);
  }

  return {
    applied: apply,
    command,
    rootAgentsMode,
    actions,
    notes: [
      "Nexus is optional and external; `spm` will not install or upgrade it.",
      "Use `spm` for specs, tasks, current state, handoffs, adoption structure, and deterministic workflow.",
      "Use Nexus for code impact, related-code, and blast-radius analysis only.",
    ],
    nextCommands: [
      "spm doctor",
      `${command} analyze --skip-agents-md --force ${rootDir}`,
    ],
  };
}

export function renderNexusSetupReport(report: NexusSetupReport): string {
  const pendingActions = report.actions.filter((action) => action.status !== "already-ok");
  const lines = [
    report.applied ? "Applied Nexus setup" : "Nexus setup plan",
    `Command: ${report.command}`,
    `Root AGENTS mode: ${report.rootAgentsMode}`,
    "",
    report.applied ? "Applied changes:" : "Planned changes:",
  ];

  if (pendingActions.length === 0) {
    lines.push(report.applied ? "- No changes applied." : "- No changes needed.");
  }

  for (const action of pendingActions) {
    lines.push(`- ${action.message}${action.path ? ` (${action.path})` : ""}`);
  }

  const alreadyOk = report.actions.filter((action) => action.status === "already-ok");
  if (alreadyOk.length > 0) {
    lines.push("", "Already ok:");
    for (const action of alreadyOk) {
      lines.push(`- ${action.message}${action.path ? ` (${action.path})` : ""}`);
    }
  }

  lines.push("", "Notes:", ...report.notes.map((note) => `- ${note}`));
  lines.push("", "Next commands:", ...report.nextCommands.map((command) => `- ${command}`));

  if (!report.applied && pendingActions.length > 0) {
    lines.push("", "Run `spm nexus setup --apply` to apply this plan.");
  }

  return lines.join("\n");
}
