import { join } from "node:path";
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
import { buildAdoptionGuidance } from "./adoption.ts";
import { inspectAdoptionState, type AdoptionInspection } from "./layout.ts";
import { listMarkdownFiles, pathExists, readUtf8 } from "../storage.ts";

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
  });

  return {
    summary: buildSummary(findings),
    adoption,
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
  };
}

export function renderDoctorReport(report: DoctorReport): string {
  const lines = [
    "Spec Embryo doctor",
    `Status: ${report.summary.overall}`,
    `Adoption state: ${report.adoption.state}`,
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

  lines.push(
    "",
    "Adoption summary:",
    `- ${report.guidance.overview}`,
    "",
    "What was found:",
    ...report.guidance.whatFound.map((item) => `- ${item}`),
    "",
    "What changed:",
    ...report.guidance.whatChanged.map((item) => `- ${item}`),
    "",
    "What still needs migration or follow-up:",
    ...report.guidance.remainingWork.map((item) => `- ${item}`),
    "",
    "Recommended next commands:",
    ...report.guidance.recommendedCommands.map((item) => `- ${item.command} — ${item.reason}`),
    "",
    "First-week sequence:",
    ...report.guidance.firstWeekSequence.map((item, index) => `${index + 1}. ${item}`),
  );

  return lines.join("\n");
}
