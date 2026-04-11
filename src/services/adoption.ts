import type { DoctorFinding } from "./doctor.ts";
import type { AdoptionInspection } from "./layout.ts";
import { SPEC_STATUSES, TASK_STATUSES } from "../domain.ts";

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

export interface AdoptionArtifactPaths {
  adoptionDir: string;
  migrationGuideFile: string;
  agentBriefFile: string;
}

export const NEXUS_COEXISTENCE_HEADING = "Nexus Coexistence";

export function nexusCoexistenceLines(): string[] {
  return [
    "Nexus is optional and external to Spec Embryo; install and upgrade it separately using the upstream project instructions.",
    "Use `spm` as the source of truth for specs, tasks, current state, handoffs, adoption structure, and deterministic workflow.",
    "Use Nexus for code impact, related-code, and blast-radius analysis only.",
    "Do not let Nexus replace or overwrite root `AGENTS.md`; keep any Nexus-specific guidance additive or scoped below the root.",
    "Use `spm nexus setup` to preview bounded Nexus changes, then ask the human before running `spm nexus setup --apply`.",
    "After enabling Nexus in `.specpm/config.toml`, re-run `spm doctor` so the bounded coexistence checks can confirm the setup.",
  ];
}

function buildRelativePath(baseDir: string, leaf: string): string {
  const normalizedBase = baseDir.replace(/\/+$/u, "");
  return normalizedBase.length === 0 ? leaf : `${normalizedBase}/${leaf}`;
}

export function buildAdoptionArtifactPaths(memoryDir: string): AdoptionArtifactPaths {
  const adoptionDir = buildRelativePath(memoryDir, "adoption");

  return {
    adoptionDir,
    migrationGuideFile: buildRelativePath(adoptionDir, "migration-guide.md"),
    agentBriefFile: buildRelativePath(adoptionDir, "direct-agent-brief.md"),
  };
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
  const toolUpgradeAvailable = doctorFindings.some((finding) => finding.code === "tool-upgrade-available");
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

  if (toolUpgradeAvailable) {
    remainingWork.push("The running Spec Embryo CLI is newer than the repo's recorded tool version, so this repo may benefit from refreshed adoption guidance or defaults.");
    recommendedCommands.push(
      {
        command: "spm init",
        reason: "Refresh adoption artifacts and any missing deterministic defaults with the newer installed CLI version.",
      },
      {
        command: "spm doctor",
        reason: "Verify the repo again after the refresh and confirm whether any migration follow-up changed under the newer guidance.",
      },
    );
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

function sourceMaterialLines(adoption: AdoptionInspection): string[] {
  const paths = new Set<string>();

  if (adoption.layoutChoice.adoptedHome) {
    paths.add(adoption.layoutChoice.adoptedHome);
  }

  for (const candidate of adoption.layoutChoice.candidates) {
    paths.add(candidate.relativePath);
  }

  if (paths.size === 0) {
    return ["No obvious legacy docs/spec folders were detected yet; inspect the repo manually before inventing new product memory."];
  }

  return Array.from(paths).map((path) => `Inspect \`${path}\` as likely source material for the real project direction and migration work.`);
}

function partialAdoptionChecklines(adoption: AdoptionInspection): string[] {
  const lines = [
    "Check whether existing specs and tasks still need conversion into the managed SpM shape.",
    "Check whether task statuses and dependencies describe the real work accurately enough for the UI and resume flows.",
    "Check whether AGENTS guidance explains SpM usage, budgets, and local workflow expectations without bloating the repo instructions.",
    "Check whether the repo needs local skills or skill updates so future agents know how to work with SpM here.",
    "Check whether the managed memory is complete enough that `spm ui` renders meaningful progress, focus, and dependency views.",
  ];

  return adoption.state === "partially-adopted" ? lines : [];
}

function upgradeFlowLines(): string[] {
  return [
    "If `spm doctor` says the running CLI is newer than the repo's recorded `tool_version`, update the installed package first if needed.",
    "Re-run `spm init` to refresh deterministic adoption artifacts, missing defaults, and the repo's recorded tool version.",
    "Run `spm doctor` again to confirm the repo under the newer guidance before continuing migration work.",
    "If legacy docs are still the source of truth, regenerate the import brief so the current agent sees the newer migration guidance.",
  ];
}

function doctorModeLines(): string[] {
  return [
    "Use `spm doctor` first for a cheap status, findings, versions, config, and counts check.",
    "Use `spm doctor --verbose` only when you need the long adoption guide, next-command context, or the full direct agent brief in the terminal output.",
    "Use `spm doctor --json` when an agent needs structured findings and guidance instead of scraping human-readable text.",
  ];
}

function tagGuidanceLines(): string[] {
  return [
    "Treat tags as retrieval handles for `spm memory query` and `spm memory brief`, not as decorative metadata.",
    "Preserve meaningful legacy topical labels as tags when they help another human or agent find related work later.",
    "Prefer short, stable tags like `combat`, `adoption`, or `ui` over sentence-like labels.",
    "Remember that memory tag filters normalize spaces, underscores, and hyphens to one canonical tag value.",
    "Do not expect partial substring matches from tag filters; use the actual tag you want to retrieve.",
    "Avoid unnecessary synonym drift when a repo already has a clear topical label; reuse the existing tag instead of inventing a near-duplicate.",
    "Do not use tags as a replacement for canonical statuses, links, or dependencies.",
  ];
}

function nexusInstallSteps(): string[] {
  return [
    "Install Nexus separately from Spec Embryo by following the upstream Nexus instructions for your environment.",
    "Run `spm nexus setup` to show the repo-local config, AGENTS, ignore-rule, and adoption-artifact changes before writing anything.",
    "Ask the human whether to enable bounded Nexus coexistence for this repo.",
    "If approved, run `spm nexus setup --apply` instead of editing `.specpm/config.toml` and `AGENTS.md` by hand.",
    "Run `spm doctor` after apply, then run the recommended GitNexus indexing command if the external tool is installed.",
  ];
}

export function renderMigrationGuideMarkdown(input: {
  projectName: string;
  memoryDir: string;
  adoption: AdoptionInspection;
  guidance: AdoptionGuidance;
}): string {
  const artifactPaths = buildAdoptionArtifactPaths(input.memoryDir);
  const sourceLines = sourceMaterialLines(input.adoption);
  const partialChecks = partialAdoptionChecklines(input.adoption);
  const lines = [
    "# Spec Embryo Migration Guide",
    "",
    `This guide explains how to adopt Spec Embryo into **${input.projectName}** without confusing the adoption scaffold for the repository's real product roadmap.`,
    "",
    "## What SpM Is",
    "",
    `- ${input.guidance.spmOrientation.whatSpmIs}`,
    `- ${input.guidance.spmOrientation.whyUseIt}`,
    "",
    "## Current Adoption State",
    "",
    `- Adoption state: \`${input.adoption.state}\``,
    `- Managed memory home: \`${input.memoryDir}\``,
    `- Direct agent brief file: \`${artifactPaths.agentBriefFile}\``,
    "",
    "## Scaffold Versus Real Project Work",
    "",
    "- Any seed spec/task scaffold is temporary migration backlog, not the repository's literal product roadmap.",
    "- The real product direction still lives in this repository's own specs, docs, architecture notes, and active codebase.",
    "- Use the scaffold to migrate or rewrite real project memory into the managed SpM layout instead of replacing the scaffold too early or implementing Spec Embryo itself inside the adopted repo.",
    "",
    "## Source Material To Inspect First",
    "",
    ...sourceLines.map((line) => `- ${line}`),
    "",
    "## What SpM Already Handles Deterministically",
    "",
    ...input.guidance.spmOrientation.deterministicResponsibilities.map((item) => `- ${item}`),
    "",
    "## Reading Doctor Efficiently",
    "",
    ...doctorModeLines().map((line) => `- ${line}`),
    "",
    "## Canonical Statuses",
    "",
    `- Spec statuses: \`${SPEC_STATUSES.join("`, `")}\``,
    `- Task statuses: \`${TASK_STATUSES.join("`, `")}\``,
    "- Do not replace these with synonyms like `planned` or `completed` inside managed SpM docs.",
    "",
    "## Tag Guidance For Retrieval",
    "",
    ...tagGuidanceLines().map((line) => `- ${line}`),
    "",
    `## ${NEXUS_COEXISTENCE_HEADING}`,
    "",
    ...nexusCoexistenceLines().map((line) => `- ${line}`),
    "",
    "## Nexus Setup Flow",
    "",
    ...nexusInstallSteps().map((line, index) => `${index + 1}. ${line}`),
  ];

  if (partialChecks.length > 0) {
    lines.push(
      "",
      "## Partial Adoption Checks",
      "",
      ...partialChecks.map((line) => `- ${line}`),
    );
  }

  lines.push(
    "",
    "## User-Mediated Agent Handoff",
    "",
    "1. Run the relevant `spm` command such as `spm init`, `spm doctor`, or `spm spec import-prompt`.",
    "2. Review this migration guide so the adoption choices are explicit.",
    "3. Copy the direct agent brief from the command output or from the generated brief file.",
    "4. Paste that brief directly to the active coding agent so it works from the reviewed adoption contract instead of guessing from scaffold docs alone.",
    "5. Ask the agent to update managed specs, tasks, current state, AGENTS files, and skills as adoption progresses.",
    "",
    "## Recommended Next Commands",
    "",
    ...input.guidance.recommendedCommands.map((item) => `- \`${item.command}\` — ${item.reason}`),
    "",
    "## Adopting Newer SpM Guidance",
    "",
    ...upgradeFlowLines().map((line, index) => `${index + 1}. ${line}`),
    "",
    "## First-Week Sequence",
    "",
    ...input.guidance.firstWeekSequence.map((item, index) => `${index + 1}. ${item}`),
  );

  return `${lines.join("\n")}\n`;
}

export function renderDirectAgentBrief(input: {
  projectName: string;
  memoryDir: string;
  adoption: AdoptionInspection;
  guidance: AdoptionGuidance;
}): string {
  const sourceLines = sourceMaterialLines(input.adoption);
  const partialChecks = partialAdoptionChecklines(input.adoption);
  const lines = [
    "You are helping adopt Spec Embryo into this repository.",
    "",
    "Important context:",
    `- ${input.guidance.spmOrientation.whatSpmIs}`,
    `- ${input.guidance.spmOrientation.whyUseIt}`,
    "- This repository's product direction is not Spec Embryo unless the repo actually is Spec Embryo itself.",
    "- Treat any SpM seed scaffold as migration backlog for organizing the repo, not as literal product implementation work.",
    `- The managed memory home for this repo is \`${input.memoryDir}\`.`,
    "",
    "What to inspect first:",
    ...sourceLines.map((line) => `- ${line}`),
    "",
    "How to work:",
    "- Use `spm` before ad hoc interpretation when it already exposes the needed state, structure, or migration guidance.",
    ...doctorModeLines().map((line) => `- ${line}`),
    "- Use the scaffold to migrate existing documentation into managed specs, tasks, current state, and AGENTS guidance.",
    "- Keep statuses, dependencies, and current focus trustworthy so `spm ui` reflects real progress and blockers.",
    "- Update AGENTS files and local skills when adoption changes how future agents should work in this repo.",
    `- Use only canonical spec statuses: ${SPEC_STATUSES.join(", ")}.`,
    `- Use only canonical task statuses: ${TASK_STATUSES.join(", ")}.`,
    ...tagGuidanceLines().map((line) => `- ${line}`),
    ...nexusCoexistenceLines().map((line) => `- ${line}`),
  ];

  if (partialChecks.length > 0) {
    lines.push("", "Before declaring adoption complete, check:", ...partialChecks.map((line) => `- ${line}`));
  }

  lines.push(
    "",
    "Deterministic commands to prefer:",
    ...input.guidance.recommendedCommands.map((item) => `- ${item.command}`),
    "",
    "If doctor reports that the running CLI is newer than the repo's recorded tool version:",
    ...upgradeFlowLines().map((line) => `- ${line}`),
    "",
    "Do not assume:",
    "- Do not replace or delete legacy project docs before preserving their intent in managed memory.",
    "- Do not treat the seed scaffold as the repo's long-term roadmap once real project memory exists.",
    "- Do not assume adoption is complete just because `.specpm/` or `docs/spm/` already exists.",
    "",
    "Ask the human when:",
    "- more than one source docs/spec area could be the real migration source",
    "- migration would rewrite or discard meaningful existing project planning",
    "- the repo needs a structural choice that could affect how the team works going forward",
  );

  return `${lines.join("\n")}\n`;
}
