import type { DoctorFinding } from "./doctor.ts";
import type { AdoptionInspection } from "./layout.ts";

export interface AdoptionCommandSuggestion {
  command: string;
  reason: string;
}

export interface AdoptionGuidance {
  overview: string;
  whatFound: string[];
  whatChanged: string[];
  remainingWork: string[];
  recommendedCommands: AdoptionCommandSuggestion[];
  firstWeekSequence: string[];
}

function uniqueCommands(suggestions: AdoptionCommandSuggestion[]): AdoptionCommandSuggestion[] {
  const seen = new Set<string>();
  const deduped: AdoptionCommandSuggestion[] = [];

  for (const suggestion of suggestions) {
    if (seen.has(suggestion.command)) {
      continue;
    }

    seen.add(suggestion.command);
    deduped.push(suggestion);
  }

  return deduped;
}

export function buildAdoptionGuidance(input: {
  adoption: AdoptionInspection;
  memoryDir: string;
  created?: string[];
  skipped?: string[];
  doctorFindings?: DoctorFinding[];
  commandContext?: "init" | "doctor";
}): AdoptionGuidance {
  const created = input.created ?? [];
  const skipped = input.skipped ?? [];
  const doctorFindings = input.doctorFindings ?? [];
  const warningOrBlockingFindings = doctorFindings.filter(
    (finding) => finding.severity === "warning" || finding.severity === "blocking",
  );

  const whatFound = [...input.adoption.findings];
  const whatChanged: string[] = [];
  const remainingWork: string[] = [];
  const recommendedCommands: AdoptionCommandSuggestion[] = [];
  const firstWeekSequence: string[] = [];

  if (created.length > 0) {
    whatChanged.push(`Created ${created.length} managed file${created.length === 1 ? "" : "s"} under \`${input.memoryDir}\` and \`.specpm/\`.`);
  } else {
    whatChanged.push("No new managed files were created in this run.");
  }

  if (skipped.length > 0) {
    whatChanged.push(`Preserved ${skipped.length} existing file${skipped.length === 1 ? "" : "s"} that were already present.`);
  }

  switch (input.adoption.state) {
    case "fresh":
      remainingWork.push("Create the first active spec and linked tasks so the repo stops being only scaffolded memory.");
      recommendedCommands.push(
        {
          command: "spm spec create --title \"...\" --summary \"...\"",
          reason: "Define the first real planning anchor for the adopted repo.",
        },
        {
          command: "spm task create --title \"...\" --summary \"...\" --spec-ids SPEC-001",
          reason: "Create the first executable work items linked to that spec.",
        },
      );
      break;
    case "legacy-docs": {
      const source = input.adoption.layoutChoice.adoptedHome ?? input.adoption.layoutChoice.candidates[0]?.relativePath ?? "docs";
      remainingWork.push("Legacy docs still need migration or import into Spec Embryo-managed specs and tasks.");
      recommendedCommands.push({
        command: `spm spec import-prompt --source ${source}`,
        reason: "Generate an agent-ready migration bundle from the most likely legacy documentation home.",
      });
      break;
    }
    case "partially-adopted":
      remainingWork.push("The repo still needs migration or cleanup before normal Spec Embryo flows are fully trustworthy.");
      recommendedCommands.push({
        command: "spm doctor",
        reason: "Inspect missing structure, parse errors, and broken links before continuing migration.",
      });
      break;
    case "adopted":
      remainingWork.push("The managed layout is in place; the next work is about initializing meaningful project memory, not structure.");
      break;
  }

  if (warningOrBlockingFindings.length > 0) {
    remainingWork.push(`Doctor reported ${warningOrBlockingFindings.length} issue${warningOrBlockingFindings.length === 1 ? "" : "s"} that still need migration or cleanup decisions.`);
  }

  if (warningOrBlockingFindings.length > 0 && input.commandContext !== "doctor") {
    recommendedCommands.push({
      command: "spm doctor --json",
      reason: "Get a structured report that an active agent can turn into explicit next actions without guessing.",
    });
  } else if (!input.commandContext || input.commandContext === "init") {
    recommendedCommands.push({
      command: "spm doctor",
      reason: "Verify the adopted layout before trusting normal resume and UI flows.",
    });
  }

  recommendedCommands.push({
    command: "spm current set --focus \"...\" --summary \"...\"",
    reason: "Create the first explicit checkpoint so another human or agent can answer where work should continue.",
  });
  recommendedCommands.push({
    command: "spm handoff --title \"Initial adoption checkpoint\"",
    reason: "Capture the migration state once the first meaningful setup pass is complete.",
  });

  firstWeekSequence.push(
    "Run doctor and review its findings before assuming the repo is ready for normal work.",
    "Import or create the first real specs so the managed memory reflects product intent instead of only scaffolding.",
    "Create linked tasks and mark the first active slice in current state.",
    "Write an initial handoff once the adoption choices and first actions are explicit.",
  );

  return {
    overview:
      input.adoption.state === "adopted"
        ? "This repo already looks structurally adopted; the next step is making the managed memory meaningful."
        : input.adoption.state === "legacy-docs"
          ? "This repo looks importable but still needs migration work to turn legacy docs into canonical Spec Embryo memory."
          : input.adoption.state === "partially-adopted"
            ? "This repo shows partial Spec Embryo signals and needs cleanup before the workflow becomes fully trustworthy."
            : "This repo is fresh to Spec Embryo and now needs its first real spec/task/current-state content.",
    whatFound,
    whatChanged,
    remainingWork,
    recommendedCommands: uniqueCommands(recommendedCommands),
    firstWeekSequence,
  };
}

export function renderAdoptionGuidance(guidance: AdoptionGuidance): string[] {
  return [
    "Adoption summary:",
    `- ${guidance.overview}`,
    "",
    "What was found:",
    ...guidance.whatFound.map((item) => `- ${item}`),
    "",
    "What changed:",
    ...guidance.whatChanged.map((item) => `- ${item}`),
    "",
    "What still needs migration or follow-up:",
    ...guidance.remainingWork.map((item) => `- ${item}`),
    "",
    "Recommended next commands:",
    ...guidance.recommendedCommands.map((item) => `- ${item.command} — ${item.reason}`),
    "",
    "First-week sequence:",
    ...guidance.firstWeekSequence.map((item, index) => `${index + 1}. ${item}`),
  ];
}
