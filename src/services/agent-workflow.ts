import type { AdoptionCommandSuggestion, CapabilityRefreshGuidance } from "./adoption.ts";
import type { DoctorReport } from "./doctor.ts";
import { renderHarnessDiagnostics, type HarnessDiagnosticReport } from "./harness-diagnostics.ts";

export interface AgentWorkflowBrief {
  harness?: HarnessDiagnosticReport;
  overview: string;
  repo: {
    adoptionState: DoctorReport["adoption"]["state"];
    memoryDir: string;
    currentStateFile: string;
    currentStateAvailable: boolean;
    currentStateStatus: "available" | "missing" | "unreadable";
    directAgentBriefFile: string;
    cliVersion: string;
    projectToolVersion?: string;
    updateAvailable: boolean;
  };
  startHere: string[];
  sourceMaterialHints: string[];
  tagGuidance: string[];
  partialAdoptionChecks: string[];
  workflowLoop: string[];
  workflowLoopCommands: AdoptionCommandSuggestion[];
  doctorModes: string[];
  doctorModeCommands: AdoptionCommandSuggestion[];
  scopedMemoryWorkflow: string[];
  scopedMemoryCommands: AdoptionCommandSuggestion[];
  directAgentCommands: string[];
  directAgentCommandSuggestions: AdoptionCommandSuggestion[];
  externalAgentsSnippet: {
    note: string;
    snippetLines: string[];
  };
  nexusCoexistence: string[];
  nexusSetup: string[];
  nexusSetupCommands: AdoptionCommandSuggestion[];
  nexusSetupReviewChecks: string[];
  capabilityRefresh: CapabilityRefreshGuidance;
}

export interface AgentSnippet {
  harness?: HarnessDiagnosticReport;
  note: string;
  snippetLines: string[];
}

function renderCommandSuggestion(suggestion: AdoptionCommandSuggestion): string {
  const approvalNote = suggestion.requiresHumanApproval ? " Ask the human before running this command." : "";
  return `- ${suggestion.command} — ${suggestion.reason}${approvalNote}`;
}

function currentStateFile(memoryDir: string): string {
  const normalized = memoryDir.replace(/\/+$/u, "");
  return normalized.length === 0 ? "current.md" : `${normalized}/current.md`;
}

export function buildAgentWorkflowBrief(report: DoctorReport): AgentWorkflowBrief {
  const memoryDir = report.config.memoryDir ?? report.adoption.layoutChoice.memoryDir ?? "docs/spm";
  const currentFile = currentStateFile(memoryDir);
  const { currentStateAvailable, currentStateStatus } = report.guidance.workflowLoop;

  return {
    ...(report.harness ? { harness: report.harness } : {}),
    overview: report.guidance.overview,
    repo: {
      adoptionState: report.adoption.state,
      memoryDir,
      currentStateFile: currentFile,
      currentStateAvailable,
      currentStateStatus,
      directAgentBriefFile: report.directAgentBriefFile,
      cliVersion: report.versions.cliVersion,
      projectToolVersion: report.versions.projectToolVersion,
      updateAvailable: report.versions.updateAvailable,
    },
    startHere: [
      "Run `spm status` for the cheapest trustworthy repo-memory summary.",
      currentStateStatus === "available"
        ? `Read \`${currentFile}\` before multi-step or resume-heavy work so you start from the explicit checkpoint instead of guessing from code alone.`
        : currentStateStatus === "missing"
          ? `If \`${currentFile}\` is still missing, run \`spm init\` or write the first checkpoint with \`spm current set\` before relying on resume-heavy work.`
          : `If \`${currentFile}\` is unreadable, repair its frontmatter and re-run \`spm doctor\` before relying on resume-heavy work.`,
    ],
    sourceMaterialHints: report.guidance.sourceMaterialHints,
    tagGuidance: report.guidance.tagGuidance,
    partialAdoptionChecks: report.guidance.partialAdoptionChecks,
    workflowLoop: report.guidance.workflowLoop.steps,
    workflowLoopCommands: report.guidance.workflowLoop.commands,
    doctorModes: report.guidance.doctorModes.preferredModes,
    doctorModeCommands: report.guidance.doctorModes.commands,
    scopedMemoryWorkflow: report.guidance.memoryWorkflow.preferredWorkflows,
    scopedMemoryCommands: report.guidance.memoryWorkflow.commands,
    directAgentCommands: report.guidance.directAgentCommands.commands,
    directAgentCommandSuggestions: report.guidance.directAgentCommands.suggestions,
    externalAgentsSnippet: report.guidance.externalAgentsSnippet,
    nexusCoexistence: report.guidance.nexusCoexistence.lines,
    nexusSetup: report.guidance.nexusSetup.steps,
    nexusSetupCommands: report.guidance.nexusSetup.commands,
    nexusSetupReviewChecks: report.guidance.nexusSetup.reviewChecks,
    capabilityRefresh: report.guidance.capabilityRefresh,
  };
}

export function buildAgentSnippet(report: DoctorReport): AgentSnippet {
  return {
    ...(report.harness ? { harness: report.harness } : {}),
    note: report.guidance.externalAgentsSnippet.note,
    snippetLines: report.guidance.externalAgentsSnippet.snippetLines,
  };
}

export function renderAgentWorkflowBrief(brief: AgentWorkflowBrief): string {
  const versionLine = brief.repo.projectToolVersion
    ? `Versions: cli ${brief.repo.cliVersion} | project ${brief.repo.projectToolVersion}${brief.repo.updateAvailable ? " | update available" : ""}`
    : `Versions: cli ${brief.repo.cliVersion}`;

  return [
    "Spec Embryo agent brief",
    `Adoption state: ${brief.repo.adoptionState}`,
    `Managed memory home: ${brief.repo.memoryDir}`,
    versionLine,
    "",
    "Overview:",
    `- ${brief.overview}`,
    "",
    "Start here:",
    ...brief.startHere.map((item) => `- ${item}`),
    "",
    "What to inspect first:",
    ...brief.sourceMaterialHints.map((item) => `- ${item}`),
    "",
    "Tag guidance:",
    ...brief.tagGuidance.map((item) => `- ${item}`),
    ...(brief.partialAdoptionChecks.length > 0
      ? ["", "Partial adoption checks:", ...brief.partialAdoptionChecks.map((item) => `- ${item}`)]
      : []),
    "",
    "Default workflow loop:",
    ...brief.workflowLoop.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Workflow loop commands:",
    ...brief.workflowLoopCommands.map(renderCommandSuggestion),
    "",
    "Scoped memory workflow:",
    ...brief.scopedMemoryWorkflow.map((item) => `- ${item}`),
    "",
    "Scoped memory commands:",
    ...brief.scopedMemoryCommands.map(renderCommandSuggestion),
    "",
    "Direct agent commands:",
    ...brief.directAgentCommands.map((item) => `- ${item}`),
    "",
    "Direct agent command suggestions:",
    ...brief.directAgentCommandSuggestions.map(renderCommandSuggestion),
    "",
    "Optional AGENTS.md snippet:",
    `- ${brief.externalAgentsSnippet.note}`,
    "```md",
    ...brief.externalAgentsSnippet.snippetLines,
    "```",
    "",
    "Nexus coexistence:",
    ...brief.nexusCoexistence.map((item) => `- ${item}`),
    "",
    "Nexus setup flow:",
    ...brief.nexusSetup.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Nexus setup commands:",
    ...brief.nexusSetupCommands.map(renderCommandSuggestion),
    "",
    "Nexus setup review checks:",
    ...brief.nexusSetupReviewChecks.map((item) => `- ${item}`),
    "",
    "Doctor modes:",
    ...brief.doctorModes.map((item) => `- ${item}`),
    "",
    "Doctor mode commands:",
    ...brief.doctorModeCommands.map((item) => `- ${item.command} — ${item.reason}`),
    "",
    "Capability refresh:",
    ...(brief.capabilityRefresh.required
      ? [
          `- ${brief.capabilityRefresh.reason ?? "Refresh current SpM usage guidance before continuing work."}`,
          ...brief.capabilityRefresh.commands.map(renderCommandSuggestion),
          ...brief.capabilityRefresh.reviewChecks.map((item) => `- Review: ${item}`),
          ...brief.capabilityRefresh.actions.map((item) => `- ${item}`),
        ]
      : ["- No version-driven capability refresh is currently required."]),
    "",
    "Repo-local guide files:",
    `- Current checkpoint: ${brief.repo.currentStateFile}${brief.repo.currentStateStatus === "available" ? "" : brief.repo.currentStateStatus === "missing" ? " (not present yet)" : " (currently unreadable)"}`,
    `- Direct agent brief: ${brief.repo.directAgentBriefFile}`,
    ...(brief.harness ? ["", renderHarnessDiagnostics(brief.harness)] : []),
  ].join("\n");
}

export function renderAgentSnippet(snippet: AgentSnippet): string {
  return [
    "Spec Embryo AGENTS.md snippet",
    "",
    `- ${snippet.note}`,
    "```md",
    ...snippet.snippetLines,
    "```",
    ...(snippet.harness ? ["", `Harness adoption: ${snippet.harness.provider} (no CLI probes)`,
      "Keep root AGENTS.md as the shared source. Review loading conditions before adding an import; this command creates no bridge.",
      `Existing root instruction paths: ${snippet.harness.instructionFiles.join(", ") || "none observed"}`,
      ...snippet.harness.warnings.map((warning) => `- ${warning}`)] : []),
  ].join("\n");
}
