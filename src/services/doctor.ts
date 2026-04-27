import { delimiter, join, relative } from "node:path";
import type {
  CurrentStateDocument,
  HandoffDocument,
  ProjectConfig,
  SpecDocument,
  TaskDocument,
} from "../domain.ts";
import {
  parseCurrentStateDocument,
  parseHandoffDocument,
  parseProjectConfig,
  parseSpecDocument,
  parseTaskDocument,
} from "../domain.ts";
import { parseTomlFrontmatter } from "../frontmatter.ts";
import { createDefaultConfig, readProjectConfig } from "../repository.ts";
import { resolveProjectPaths } from "../paths.ts";
import {
  agentSnippetCommandLines,
  buildAdoptionArtifactPaths,
  buildAdoptionGuidance,
  NEXUS_COEXISTENCE_HEADING,
  nexusCoexistenceLines,
  renderAdoptionGuidance,
  renderDirectAgentBrief,
  renderMigrationGuideMarkdown,
} from "./adoption.ts";
import { inspectAdoptionState, type AdoptionInspection } from "./layout.ts";
import { listMarkdownFiles, pathExists, readUtf8 } from "../storage.ts";
import { CLI_VERSION, compareCliVersions } from "./version.ts";
import { findAgentsFiles } from "./agents.ts";

export type DoctorSeverity = "blocking" | "warning" | "info";
export type DoctorOverallStatus = "healthy" | "needs-attention" | "blocked";

export interface DoctorFinding {
  severity: DoctorSeverity;
  code: string;
  message: string;
  path?: string;
  hint?: string;
}

export interface DoctorSummary {
  overall: DoctorOverallStatus;
  blockingCount: number;
  warningCount: number;
  infoCount: number;
}

export interface DoctorReport {
  summary: DoctorSummary;
  adoption: AdoptionInspection;
  versions: {
    cliVersion: string;
    projectToolVersion?: string;
    updateAvailable: boolean;
  };
  config: {
    exists: boolean;
    valid: boolean;
    memoryDir?: string;
  };
  counts: {
    specs: number;
    tasks: number;
    handoffs: number;
  };
  findings: DoctorFinding[];
  guidance: ReturnType<typeof buildAdoptionGuidance>;
  migrationGuideFile: string;
  directAgentBriefFile: string;
  directAgentBrief: string;
}

export interface DoctorRenderOptions {
  verbose?: boolean;
}

interface SafeParseResult<T> {
  documents: T[];
  findings: DoctorFinding[];
}

function pushFinding(
  findings: DoctorFinding[],
  severity: DoctorSeverity,
  code: string,
  message: string,
  path?: string,
  hint?: string,
): void {
  findings.push({ severity, code, message, path, hint });
}

async function safeParseCollection<T>(
  dirPath: string,
  parser: (filePath: string, attributes: unknown, body: string) => T,
  options: {
    missingDirSeverity: DoctorSeverity;
    missingDirCode: string;
    missingDirMessage: string;
    missingDirHint?: string;
  },
): Promise<SafeParseResult<T>> {
  const findings: DoctorFinding[] = [];

  if (!(await pathExists(dirPath))) {
    pushFinding(
      findings,
      options.missingDirSeverity,
      options.missingDirCode,
      options.missingDirMessage,
      dirPath,
      options.missingDirHint,
    );
    return { documents: [], findings };
  }

  const files = await listMarkdownFiles(dirPath);
  const documents: T[] = [];

  for (const filePath of files) {
    try {
      const raw = await readUtf8(filePath);
      const { attributes, body } = parseTomlFrontmatter(raw);
      documents.push(parser(filePath, attributes, body));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushFinding(findings, "blocking", "parse-error", message, filePath);
    }
  }

  return { documents, findings };
}

function buildSummary(findings: DoctorFinding[]): DoctorSummary {
  const blockingCount = findings.filter((finding) => finding.severity === "blocking").length;
  const warningCount = findings.filter((finding) => finding.severity === "warning").length;
  const infoCount = findings.filter((finding) => finding.severity === "info").length;

  return {
    overall: blockingCount > 0 ? "blocked" : warningCount > 0 ? "needs-attention" : "healthy",
    blockingCount,
    warningCount,
    infoCount,
  };
}

function validateSpecTaskLinks(specs: SpecDocument[], tasks: TaskDocument[]): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const specIds = new Set(specs.map((spec) => spec.id));
  const taskIds = new Set(tasks.map((task) => task.id));

  for (const spec of specs) {
    for (const taskId of spec.taskIds) {
      if (!taskIds.has(taskId)) {
        pushFinding(
          findings,
          "warning",
          "missing-task-link",
          `${spec.id} references missing task ${taskId}.`,
          spec.filePath,
          "Either create the missing task or remove the stale task_ids backlink.",
        );
      }
    }
  }

  for (const task of tasks) {
    for (const specId of task.specIds) {
      if (!specIds.has(specId)) {
        pushFinding(
          findings,
          "warning",
          "missing-spec-link",
          `${task.id} references missing spec ${specId}.`,
          task.filePath,
          "Either create the missing spec or remove the stale spec_ids reference.",
        );
      }
    }

    for (const dependencyId of task.dependsOn) {
      if (!taskIds.has(dependencyId)) {
        pushFinding(
          findings,
          "warning",
          "missing-task-dependency",
          `${task.id} depends on missing task ${dependencyId}.`,
          task.filePath,
          "Fix the depends_on list so ready/blocker derivation stays trustworthy.",
        );
      }
    }

    for (const blockedById of task.blockedBy) {
      if (!taskIds.has(blockedById)) {
        pushFinding(
          findings,
          "warning",
          "missing-task-blocker",
          `${task.id} is blocked by missing task ${blockedById}.`,
          task.filePath,
          "Fix the blocked_by list so manual blocker tracking stays trustworthy.",
        );
      }
    }
  }

  return findings;
}

function validateCurrentStateLinks(currentState: CurrentStateDocument | undefined, specs: SpecDocument[], tasks: TaskDocument[]): DoctorFinding[] {
  if (!currentState) {
    return [];
  }

  const findings: DoctorFinding[] = [];
  const specIds = new Set(specs.map((spec) => spec.id));
  const taskIds = new Set(tasks.map((task) => task.id));

  for (const specId of currentState.activeSpecIds) {
    if (!specIds.has(specId)) {
      pushFinding(
        findings,
        "warning",
        "missing-current-spec",
        `Current state references missing active spec ${specId}.`,
        currentState.filePath,
        "Update current.md so active_spec_ids only includes real specs.",
      );
    }
  }

  for (const taskId of [...currentState.activeTaskIds, ...currentState.blockedTaskIds]) {
    if (!taskIds.has(taskId)) {
      pushFinding(
        findings,
        "warning",
        "missing-current-task",
        `Current state references missing task ${taskId}.`,
        currentState.filePath,
        "Update current.md so active_task_ids and blocked_task_ids only include real tasks.",
      );
    }
  }

  return findings;
}

function detectSeedScaffold(currentState: CurrentStateDocument | undefined, specs: SpecDocument[], tasks: TaskDocument[]): boolean {
  const hasSeedTag = (tags: string[]) => tags.includes("seed");

  return Boolean(
    (currentState && hasSeedTag(currentState.tags)) ||
      specs.some((spec) => hasSeedTag(spec.tags)) ||
      tasks.some((task) => hasSeedTag(task.tags)),
  );
}

async function commandExists(command: string | undefined): Promise<boolean> {
  if (!command) {
    return false;
  }

  if (command.includes("/")) {
    return pathExists(command);
  }

  const rawPath = process.env.PATH;
  if (!rawPath) {
    return false;
  }

  const candidates = rawPath
    .split(delimiter)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .flatMap((segment) => {
      return process.platform === "win32"
        ? [join(segment, command), join(segment, `${command}.exe`), join(segment, `${command}.cmd`)]
        : [join(segment, command)];
    });

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return true;
    }
  }

  return false;
}

function agentsFileContainsNexusContract(content: string): boolean {
  return (
    content.includes(NEXUS_COEXISTENCE_HEADING) &&
    content.includes("Use `spm` as the source of truth") &&
    content.includes("Use Nexus for code impact, related-code, and blast-radius analysis only.") &&
    content.includes("Do not let Nexus replace or overwrite root `AGENTS.md`")
  );
}

async function validateRootNexusGuidance(rootDir: string, findings: DoctorFinding[]): Promise<void> {
  const rootAgentsFile = join(rootDir, "AGENTS.md");
  if (!(await pathExists(rootAgentsFile))) {
    pushFinding(
      findings,
      "warning",
      "nexus-missing-root-agents-guidance",
      "Nexus is enabled but the repo has no root AGENTS.md that defines how Nexus should coexist with `spm`.",
      rootAgentsFile,
      `Add a \`${NEXUS_COEXISTENCE_HEADING}\` section that says ${nexusCoexistenceLines()[1]?.toLowerCase() ?? "spm remains the source of truth"}`,
    );
    return;
  }

  const rootAgents = await readUtf8(rootAgentsFile);
  if (!agentsFileContainsNexusContract(rootAgents)) {
    pushFinding(
      findings,
      "warning",
      "nexus-missing-coexistence-contract",
      "Nexus is enabled but root AGENTS guidance does not yet describe the bounded coexistence contract with `spm`.",
      rootAgentsFile,
      `Add a \`${NEXUS_COEXISTENCE_HEADING}\` section that keeps \`spm\` as the planning source of truth and limits Nexus to code-impact analysis.`,
    );
  }
}

async function validateScopedNexusGuidance(rootDir: string, findings: DoctorFinding[]): Promise<void> {
  const scopedAgentsFiles = (await findAgentsFiles(rootDir)).filter((file) => relative(rootDir, file) !== "AGENTS.md");

  for (const agentsFile of scopedAgentsFiles) {
    const content = await readUtf8(agentsFile);
    if (agentsFileContainsNexusContract(content)) {
      return;
    }
  }

  pushFinding(
    findings,
    "warning",
    "nexus-missing-scoped-agents-guidance",
    "Nexus is enabled in scoped AGENTS mode, but no nested AGENTS.md contains the bounded coexistence contract with `spm`.",
    rootDir,
    `Add a \`${NEXUS_COEXISTENCE_HEADING}\` section to the nearest scoped AGENTS.md that keeps \`spm\` as the planning source of truth and limits Nexus to code-impact analysis.`,
  );
}

async function validateNexusIntegration(rootDir: string, config: ProjectConfig, findings: DoctorFinding[]): Promise<void> {
  if (!config.nexus.enabled) {
    return;
  }

  if (config.nexus.rootAgentsMode === "managed-by-nexus") {
    pushFinding(
      findings,
      "blocking",
      "nexus-unsafe-root-agents-mode",
      "Nexus is configured to manage root AGENTS guidance, which would let it displace Spec Embryo's planning authority.",
      join(rootDir, ".specpm", "config.toml"),
      "Set `nexus.root_agents_mode` to `reference-only` or `scoped` so root AGENTS ownership stays with `spm`.",
    );
  }

  if (!(await commandExists(config.nexus.command))) {
    pushFinding(
      findings,
      "warning",
      "nexus-command-missing",
      `Nexus is enabled but the configured command could not be found: ${config.nexus.command ?? "(missing command)"}.`,
      join(rootDir, ".specpm", "config.toml"),
      "Install Nexus separately using the upstream instructions, verify the configured command locally, then re-run `spm doctor`.",
    );
  }

  if (config.nexus.rootAgentsMode === "scoped") {
    await validateScopedNexusGuidance(rootDir, findings);
  } else {
    await validateRootNexusGuidance(rootDir, findings);
  }
}

async function validateAdoptionArtifacts(
  rootDir: string,
  options: {
    artifactPaths: ReturnType<typeof buildAdoptionArtifactPaths>;
    expectedMigrationGuide: string;
    expectedAgentBrief: string;
    shouldValidate: boolean;
    findings: DoctorFinding[];
  },
): Promise<void> {
  if (!options.shouldValidate) {
    return;
  }

  const checks = [
    {
      filePath: join(rootDir, options.artifactPaths.migrationGuideFile),
      codeBase: "adoption-migration-guide",
      label: "migration guide",
      expected: options.expectedMigrationGuide,
    },
    {
      filePath: join(rootDir, options.artifactPaths.agentBriefFile),
      codeBase: "adoption-agent-brief",
      label: "direct agent brief",
      expected: options.expectedAgentBrief,
    },
  ];

  for (const check of checks) {
    if (!(await pathExists(check.filePath))) {
      pushFinding(
        options.findings,
        "warning",
        `missing-${check.codeBase}`,
        `The generated adoption ${check.label} is missing.`,
        check.filePath,
        "Run `spm init` to regenerate the deterministic adoption artifacts before another agent relies on stale or missing repo-local guidance.",
      );
      continue;
    }

    const existing = await readUtf8(check.filePath);
    if (existing !== check.expected) {
      pushFinding(
        options.findings,
        "warning",
        `stale-${check.codeBase}`,
        `The generated adoption ${check.label} no longer matches the current CLI guidance renderer.`,
        check.filePath,
        "Run `spm init` to refresh the generated adoption artifacts so repo-local guidance matches the currently installed CLI.",
      );
    }
  }
}

export async function buildDoctorReport(rootDir: string): Promise<DoctorReport> {
  const configFile = join(rootDir, ".specpm", "config.toml");
  const configExists = await pathExists(configFile);
  const findings: DoctorFinding[] = [];
  let config: ProjectConfig | undefined;

  if (configExists) {
    try {
      config = await readProjectConfig(rootDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushFinding(
        findings,
        "blocking",
        "invalid-config",
        `Config could not be parsed: ${message}`,
        configFile,
        "Repair .specpm/config.toml before running normal Spec Embryo workflows.",
      );
    }
  } else {
    pushFinding(
      findings,
      "warning",
      "missing-config",
      "No .specpm/config.toml exists yet.",
      configFile,
      "Run `spm init` to adopt this repo into the canonical Spec Embryo layout.",
    );
  }

  if (config && compareCliVersions(CLI_VERSION, config.toolVersion) > 0) {
    pushFinding(
      findings,
      "info",
      "tool-upgrade-available",
      `This repo was last initialized or reshaped with Spec Embryo ${config.toolVersion}, but the running CLI is ${CLI_VERSION}.`,
      configFile,
      "Refresh your SpM usage policy from `spm doctor --verbose` or `spm doctor --json`, then re-run `spm init` if you want this repo to adopt the newer guidance, agent brief, and defaults.",
    );
  }

  if (config) {
    await validateNexusIntegration(rootDir, config, findings);
  }

  const adoption = await inspectAdoptionState(rootDir, { config });
  for (const finding of adoption.findings) {
    pushFinding(findings, "info", "adoption-inspection", finding);
  }

  const effectiveConfig = config ?? createDefaultConfig(rootDir);
  const paths = resolveProjectPaths(rootDir, effectiveConfig);
  let currentState: CurrentStateDocument | undefined;

  if (!config && adoption.state === "partially-adopted") {
    pushFinding(
      findings,
      "warning",
      "partial-adoption",
      "The repo shows Spec Embryo signals without a valid config, so the managed layout is not fully trustworthy yet.",
      undefined,
      "Run `spm init` to complete adoption, then confirm whether a migration toward the canonical layout is wanted.",
    );
  }

  if (!(await pathExists(paths.stateFile))) {
    if (config) {
      pushFinding(
        findings,
        "blocking",
        "missing-current-state",
        "The configured current state file is missing.",
        paths.stateFile,
        "Run `spm init --force` only if you intentionally want to reseed missing files, or recreate current.md manually.",
      );
    } else if (adoption.state === "partially-adopted") {
      pushFinding(
        findings,
        "warning",
        "missing-current-state",
        "A partially adopted repo is missing its current state file.",
        paths.stateFile,
        "Complete adoption with `spm init` so current.md exists before relying on resume or status flows.",
      );
    }
  } else {
    try {
      const raw = await readUtf8(paths.stateFile);
      const { attributes, body } = parseTomlFrontmatter(raw);
      currentState = parseCurrentStateDocument(paths.stateFile, attributes, body);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushFinding(
        findings,
        config ? "blocking" : "warning",
        "invalid-current-state",
        `Current state could not be parsed: ${message}`,
        paths.stateFile,
        "Repair the current state frontmatter so status and resume flows can load it safely.",
      );
    }
  }

  const specsResult = await safeParseCollection(paths.specsDir, parseSpecDocument, {
    missingDirSeverity: config ? "blocking" : "warning",
    missingDirCode: "missing-specs-dir",
    missingDirMessage: "The configured specs directory is missing.",
    missingDirHint: "Create the managed specs directory or complete adoption with `spm init`.",
  });

  const tasksResult = await safeParseCollection(paths.tasksDir, parseTaskDocument, {
    missingDirSeverity: config ? "blocking" : "warning",
    missingDirCode: "missing-tasks-dir",
    missingDirMessage: "The configured tasks directory is missing.",
    missingDirHint: "Create the managed tasks directory or complete adoption with `spm init`.",
  });

  const handoffsResult = await safeParseCollection(paths.handoffsDir, parseHandoffDocument, {
    missingDirSeverity: config ? "warning" : "info",
    missingDirCode: "missing-handoffs-dir",
    missingDirMessage: "The configured handoffs directory is missing.",
    missingDirHint: "Create the managed handoffs directory if you want durable interruption checkpoints.",
  });

  findings.push(...specsResult.findings, ...tasksResult.findings, ...handoffsResult.findings);

  if (config && !(await pathExists(paths.skillsDir))) {
    pushFinding(
      findings,
      "warning",
      "missing-skills-dir",
      "The configured skills directory is missing.",
      paths.skillsDir,
      "Create the managed skills directory if repo-local agent guidance should live there.",
    );
  }

  findings.push(...validateSpecTaskLinks(specsResult.documents, tasksResult.documents));
  findings.push(...validateCurrentStateLinks(currentState, specsResult.documents, tasksResult.documents));
  const seedScaffoldDetected = detectSeedScaffold(currentState, specsResult.documents, tasksResult.documents);

  if (seedScaffoldDetected) {
    pushFinding(
      findings,
      "warning",
      "seed-scaffold-present",
      "The managed memory still contains onboarding scaffold docs meant to orient adoption, not the adopted repo's literal product roadmap.",
      config ? paths.specsDir : undefined,
      "Replace or archive the scaffold once the repo's real specs, tasks, and current state are explicit.",
    );
  }

  if (config && specsResult.documents.length === 0) {
    pushFinding(
      findings,
      "warning",
      "empty-specs",
      "No spec documents were found in the configured specs directory.",
      paths.specsDir,
      "Create or import at least one spec so linked work has a durable planning anchor.",
    );
  }

  if (config && tasksResult.documents.length === 0) {
    pushFinding(
      findings,
      "warning",
      "empty-tasks",
      "No task documents were found in the configured tasks directory.",
      paths.tasksDir,
      "Create linked tasks or import legacy execution notes so the workflow becomes actionable.",
    );
  }

  const guidance = buildAdoptionGuidance({
    adoption,
    memoryDir: config?.memoryDir ?? adoption.layoutChoice.memoryDir ?? "docs/spm",
    doctorFindings: findings,
    commandContext: "doctor",
    seedScaffoldDetected,
  });
  const artifactGuidance = buildAdoptionGuidance({
    adoption,
    memoryDir: config?.memoryDir ?? adoption.layoutChoice.memoryDir ?? "docs/spm",
    commandContext: "init",
    seedScaffoldDetected,
  });
  const memoryDir = config?.memoryDir ?? adoption.layoutChoice.memoryDir ?? "docs/spm";
  const artifactPaths = buildAdoptionArtifactPaths(memoryDir);
  const migrationGuide = renderMigrationGuideMarkdown({
    projectName: effectiveConfig.projectName,
    memoryDir,
    adoption,
    guidance: artifactGuidance,
  });
  const directAgentBrief = renderDirectAgentBrief({
    projectName: effectiveConfig.projectName,
    memoryDir,
    adoption,
    guidance,
  });
  await validateAdoptionArtifacts(rootDir, {
    artifactPaths,
    expectedMigrationGuide: migrationGuide,
    expectedAgentBrief: renderDirectAgentBrief({
      projectName: effectiveConfig.projectName,
      memoryDir,
      adoption,
      guidance: artifactGuidance,
    }),
    shouldValidate: Boolean(config),
    findings,
  });

  return {
    summary: buildSummary(findings),
    adoption,
    versions: {
      cliVersion: CLI_VERSION,
      projectToolVersion: config?.toolVersion,
      updateAvailable: Boolean(config && compareCliVersions(CLI_VERSION, config.toolVersion) > 0),
    },
    config: {
      exists: configExists,
      valid: Boolean(config),
      memoryDir: config?.memoryDir,
    },
    counts: {
      specs: specsResult.documents.length,
      tasks: tasksResult.documents.length,
      handoffs: handoffsResult.documents.length,
    },
    findings,
    guidance,
    migrationGuideFile: artifactPaths.migrationGuideFile,
    directAgentBriefFile: artifactPaths.agentBriefFile,
    directAgentBrief,
  };
}

export function renderDoctorReport(report: DoctorReport, options: DoctorRenderOptions = {}): string {
  const verbose = options.verbose ?? false;
  const lines = [
    "Spec Embryo doctor",
    `Status: ${report.summary.overall}`,
    `Adoption state: ${report.adoption.state}`,
    `Versions: cli ${report.versions.cliVersion}${report.versions.projectToolVersion ? ` | project ${report.versions.projectToolVersion}` : ""}${report.versions.updateAvailable ? " | update available" : ""}`,
    `Config: ${report.config.valid ? `valid (${report.config.memoryDir})` : report.config.exists ? "invalid" : "missing"}`,
    `Counts: specs ${report.counts.specs} | tasks ${report.counts.tasks} | handoffs ${report.counts.handoffs}`,
    "",
    `Findings: blocking ${report.summary.blockingCount} | warnings ${report.summary.warningCount} | info ${report.summary.infoCount}`,
  ];

  for (const severity of ["blocking", "warning", "info"] as const) {
    const matches = report.findings.filter((finding) => finding.severity === severity);
    if (matches.length === 0) {
      continue;
    }

    lines.push("", `${severity[0]!.toUpperCase()}${severity.slice(1)} findings:`);
    for (const finding of matches) {
      const pathLabel = finding.path ? ` [${finding.path}]` : "";
      lines.push(`- (${finding.code}) ${finding.message}${pathLabel}`);
      if (finding.hint) {
        lines.push(`  hint: ${finding.hint}`);
      }
    }
  }

  if (!verbose) {
    lines.push(
      "",
      "Run `spm doctor --verbose` for the full adoption guide and direct agent brief.",
      "Use `spm doctor --json` when an agent only needs structured findings and metadata.",
      ...agentSnippetCommandLines(),
    );
    if (report.versions.updateAvailable) {
      lines.push(
        "The running CLI is newer than this repo's recorded tool version; use those richer doctor modes to refresh capability guidance before continuing work.",
      );
    }
    return lines.join("\n");
  }

  lines.push(
    "",
    ...renderAdoptionGuidance(report.guidance),
    "",
    "Migration guide file:",
    `- ${report.migrationGuideFile}`,
    "",
    "Direct agent brief file:",
    `- ${report.directAgentBriefFile}`,
    "",
    "Direct agent brief (copy this to the current coding agent):",
    ...report.directAgentBrief.trimEnd().split("\n"),
  );

  return lines.join("\n");
}
