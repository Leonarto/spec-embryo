import type { DoctorFinding } from "./doctor.ts";
import type { AdoptionInspection } from "./layout.ts";

export interface AdoptionCommandSuggestion {
  command: string;
  reason: string;
}

export interface SpmOrientation {
  whatSpmIs: string;
  whyUseIt: string;
  whenToUse: string[];
  deterministicResponsibilities: string[];
}

export interface AdoptionGuidance {
  overview: string;
  spmOrientation: SpmOrientation;
  agentOrientation: string[];
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
  seedScaffoldDetected?: boolean;
}): AdoptionGuidance {
  const created = input.created ?? [];
  const skipped = input.skipped ?? [];
  const doctorFindings = input.doctorFindings ?? [];
  const warningOrBlockingFindings = doctorFindings.filter(
    (finding) => finding.severity === "warning" || finding.severity === "blocking",
  );
  const seedScaffoldDetected = input.seedScaffoldDetected ?? false;

  const whatFound = [...input.adoption.findings];
  const whatChanged: string[] = [];
  const remainingWork: string[] = [];
  const spmOrientation: SpmOrientation = {
    whatSpmIs:
      "spm is Spec Embryo's local-first CLI for project memory. It reads and writes the repo's managed specs, tasks, handoffs, and current state so humans and agents share the same file-backed source of truth.",
    whyUseIt:
      "Use spm to keep planning state deterministic, repo-native, and visible to both the human and the next agent instead of reconstructing that state from scattered docs or chat history.",
    whenToUse: [
      "Use spm when you need to inspect the current managed state of the repo, especially before inventing new workflow assumptions.",
      "Use spm when you need to create, update, or validate specs, tasks, current state, handoffs, or adoption structure through deterministic rules.",
      "Use spm when another command already answers the question more reliably than ad hoc file inspection or free-form LLM summarization.",
    ],
    deterministicResponsibilities: [
      "Repo adoption inspection, layout classification, and doctor findings.",
      "Reading and writing managed current state, specs, tasks, and handoffs.",
      "Validating frontmatter, links, statuses, and configured managed-memory paths.",
      "Computing deterministic status, blockers, dependency-derived next actions, and timeline/kanban projections.",
      "Rendering the built-in UI and surfacing the repo memory that UI reads from local files.",
    ],
  };
  const agentOrientation: string[] = [
    "Spec Embryo is local project memory and workflow support for this repository. It is not the adopted repo's product direction.",
    "If init created seed specs or tasks, treat them as temporary onboarding scaffolding and replace them with project-specific memory as soon as you understand the real project.",
    "Do not implement Spec Embryo features inside the adopted repo unless that repo is actually extending Spec Embryo itself.",
    "`spm ui` ships with the tool already; the adopted repo does not need to plan or build a separate Spec Embryo UI.",
  ];
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
      remainingWork.push("Replace the onboarding scaffold with the first real spec, task set, and current-state checkpoint for this repository.");
      recommendedCommands.push(
        {
          command: "spm spec create --title \"...\" --summary \"...\"",
          reason: "Define the first real planning anchor for the adopted repo's actual product, not for Spec Embryo itself.",
        },
        {
          command: "spm task create --title \"...\" --summary \"...\" --spec-ids SPEC-001",
          reason: "Create the first executable work items linked to the real project spec once the scaffold has been replaced.",
        },
      );
      break;
    case "legacy-docs": {
      const source = input.adoption.layoutChoice.adoptedHome ?? input.adoption.layoutChoice.candidates[0]?.relativePath ?? "docs";
      remainingWork.push("Legacy docs still need migration or import into Spec Embryo-managed specs and tasks so the managed memory reflects the real project.");
      recommendedCommands.push({
        command: `spm spec import-prompt --source ${source} --json`,
        reason: "Generate an agent-ready migration bundle from the most likely legacy documentation home before rewriting the seed scaffold.",
      });
      break;
    }
    case "partially-adopted":
      remainingWork.push("The repo still needs migration or cleanup before normal Spec Embryo flows are fully trustworthy for the real project.");
      recommendedCommands.push({
        command: "spm doctor --json",
        reason: "Inspect missing structure, parse errors, and broken links before continuing migration or replacing the onboarding scaffold.",
      });
      break;
    case "adopted":
      remainingWork.push("The managed layout is in place; the next work is about initializing meaningful project memory for the repo's real product, not structure.");
      break;
  }

  if (seedScaffoldDetected) {
    remainingWork.unshift(
      "The repo is still using onboarding scaffold docs. Treat them as temporary orientation, not as the adopted repo's literal roadmap or implementation backlog.",
    );
    recommendedCommands.unshift(
      {
        command: "spm current set --focus \"...\" --summary \"...\"",
        reason: "Rewrite current state around the adopted repo's real product direction so the next agent does not treat the onboarding scaffold as literal implementation work.",
      },
      {
        command: "spm spec import-prompt --source <existing-docs-or-spec-folder> --json",
        reason: "If real planning docs already exist, turn them into an agent-ready migration bundle before replacing the scaffold.",
      },
    );
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
    "Inventory the repository's actual product direction and existing planning docs before treating the scaffold as real roadmap work.",
    "Import or create the first real specs so the managed memory reflects product intent instead of only onboarding scaffolding.",
    "Create linked tasks and rewrite current state around real project work.",
    "Write an initial handoff once the adoption choices and first actions are explicit.",
  );

  return {
    overview:
      input.adoption.state === "adopted"
        ? seedScaffoldDetected
          ? "This repo already looks structurally adopted, but the managed memory is still onboarding scaffold that should be replaced with real project specs and tasks."
          : "This repo already looks structurally adopted; the next step is making the managed memory meaningful."
        : input.adoption.state === "legacy-docs"
          ? "This repo looks importable but still needs migration work to turn legacy docs into canonical Spec Embryo memory."
          : input.adoption.state === "partially-adopted"
            ? "This repo shows partial Spec Embryo signals and needs cleanup before the workflow becomes fully trustworthy."
            : "This repo is fresh to Spec Embryo and now needs its first real spec/task/current-state content.",
    spmOrientation,
    agentOrientation,
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
    "What spm is:",
    `- ${guidance.spmOrientation.whatSpmIs}`,
    `- ${guidance.spmOrientation.whyUseIt}`,
    "",
    "When to use spm:",
    ...guidance.spmOrientation.whenToUse.map((item) => `- ${item}`),
    "",
    "Let spm handle these deterministic responsibilities:",
    ...guidance.spmOrientation.deterministicResponsibilities.map((item) => `- ${item}`),
    "",
    "Agent orientation:",
    ...guidance.agentOrientation.map((item) => `- ${item}`),
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
