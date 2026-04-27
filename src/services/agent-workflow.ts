import type { CapabilityRefreshGuidance } from "./adoption.ts";
import { doctorModeLines } from "./adoption.ts";
import type { DoctorReport } from "./doctor.ts";

export interface AgentWorkflowBrief {
  overview: string;
  repo: {
    adoptionState: DoctorReport["adoption"]["state"];
    memoryDir: string;
    currentStateFile: string;
    currentStateAvailable: boolean;
    directAgentBriefFile: string;
    cliVersion: string;
    projectToolVersion?: string;
    updateAvailable: boolean;
  };
  startHere: string[];
  workflowLoop: string[];
  scopedMemoryWorkflow: string[];
  doctorModes: string[];
  capabilityRefresh: CapabilityRefreshGuidance;
}

function currentStateFile(memoryDir: string): string {
  const normalized = memoryDir.replace(/\/+$/u, "");
  return normalized.length === 0 ? "current.md" : `${normalized}/current.md`;
}

export function buildAgentWorkflowBrief(report: DoctorReport): AgentWorkflowBrief {
  const memoryDir = report.config.memoryDir ?? report.adoption.layoutChoice.memoryDir ?? "docs/spm";
  const currentFile = currentStateFile(memoryDir);
  const currentStateAvailable = report.guidance.workflowLoop.currentStateAvailable;

  return {
    overview: report.guidance.overview,
    repo: {
      adoptionState: report.adoption.state,
      memoryDir,
      currentStateFile: currentFile,
      currentStateAvailable,
      directAgentBriefFile: report.directAgentBriefFile,
      cliVersion: report.versions.cliVersion,
      projectToolVersion: report.versions.projectToolVersion,
      updateAvailable: report.versions.updateAvailable,
    },
    startHere: [
      "Run `spm status` for the cheapest trustworthy repo-memory summary.",
      currentStateAvailable
        ? `Read \`${currentFile}\` before multi-step or resume-heavy work so you start from the explicit checkpoint instead of guessing from code alone.`
        : `If \`${currentFile}\` is still missing, run \`spm init\` or write the first checkpoint with \`spm current set\` before relying on resume-heavy work.`,
    ],
    workflowLoop: report.guidance.workflowLoop.steps,
    scopedMemoryWorkflow: report.guidance.memoryWorkflow.preferredWorkflows,
    doctorModes: doctorModeLines(),
    capabilityRefresh: report.guidance.capabilityRefresh,
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
    "Default workflow loop:",
    ...brief.workflowLoop.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Scoped memory workflow:",
    ...brief.scopedMemoryWorkflow.map((item) => `- ${item}`),
    "",
    "Doctor modes:",
    ...brief.doctorModes.map((item) => `- ${item}`),
    "",
    "Capability refresh:",
    ...(brief.capabilityRefresh.required
      ? [
          `- ${brief.capabilityRefresh.reason ?? "Refresh current SpM usage guidance before continuing work."}`,
          ...brief.capabilityRefresh.actions.map((item) => `- ${item}`),
        ]
      : ["- No version-driven capability refresh is currently required."]),
    "",
    "Repo-local guide files:",
    `- Current checkpoint: ${brief.repo.currentStateFile}${brief.repo.currentStateAvailable ? "" : " (not present yet)"}`,
    `- Direct agent brief: ${brief.repo.directAgentBriefFile}`,
  ].join("\n");
}
