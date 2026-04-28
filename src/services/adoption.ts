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

export interface MemoryWorkflowGuidance {
  preferredWorkflows: string[];
  commands: AdoptionCommandSuggestion[];
}

export interface DoctorModeGuidance {
  preferredModes: string[];
  commands: AdoptionCommandSuggestion[];
}

export interface DirectAgentCommandGuidance {
  commands: string[];
  suggestions: AdoptionCommandSuggestion[];
}

export type CurrentStateGuidanceStatus = "available" | "missing" | "unreadable";

export interface WorkflowLoopGuidance {
  currentStateAvailable: boolean;
  currentStateStatus: CurrentStateGuidanceStatus;
  steps: string[];
  commands: AdoptionCommandSuggestion[];
}

export interface CapabilityRefreshGuidance {
  required: boolean;
  reason?: string;
  actions: string[];
  commands: AdoptionCommandSuggestion[];
  reviewChecks: string[];
}

export interface ExternalAgentsSnippetGuidance {
  note: string;
  snippetLines: string[];
}

export interface AdoptionGuidance {
  overview: string;
  spmOrientation: SpmOrientation;
  agentOrientation: string[];
  workflowLoop: WorkflowLoopGuidance;
  doctorModes: DoctorModeGuidance;
  memoryWorkflow: MemoryWorkflowGuidance;
  directAgentCommands: DirectAgentCommandGuidance;
  externalAgentsSnippet: ExternalAgentsSnippetGuidance;
  capabilityRefresh: CapabilityRefreshGuidance;
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

function currentStateStatusForGuidance(input: {
  adoption: AdoptionInspection;
  doctorFindings: DoctorFinding[];
  commandContext?: "init" | "doctor";
}): CurrentStateGuidanceStatus {
  if (input.commandContext === "init") {
    return "available";
  }

  if (input.doctorFindings.some((finding) => finding.code === "invalid-current-state")) {
    return "unreadable";
  }

  if (input.doctorFindings.some((finding) => finding.code === "missing-current-state")) {
    return "missing";
  }

  return input.adoption.state === "adopted" || input.adoption.state === "partially-adopted" ? "available" : "missing";
}

export function buildAdoptionGuidance(input: {
  adoption: AdoptionInspection;
  memoryDir: string;
  created?: string[];
  refreshed?: string[];
  skipped?: string[];
  doctorFindings?: DoctorFinding[];
  commandContext?: "init" | "doctor";
  seedScaffoldDetected?: boolean;
}): AdoptionGuidance {
  const created = input.created ?? [];
  const refreshed = input.refreshed ?? [];
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
  const currentStateStatus = currentStateStatusForGuidance({
    adoption: input.adoption,
    doctorFindings,
    commandContext: input.commandContext,
  });
  const currentStateAvailable = currentStateStatus === "available";
  const workflowLoop: WorkflowLoopGuidance = {
    currentStateAvailable,
    currentStateStatus,
    steps: workflowLoopLines(input.memoryDir, { currentStateStatus }),
    commands: workflowLoopCommandSuggestions(input.memoryDir, { currentStateStatus }),
  };
  const doctorModes: DoctorModeGuidance = {
    preferredModes: doctorModeLines(),
    commands: doctorModeCommandSuggestions(),
  };
  const memoryWorkflow: MemoryWorkflowGuidance = {
    preferredWorkflows: memoryWorkflowLines(),
    commands: memoryWorkflowCommandSuggestions(),
  };
  const directAgentCommands: DirectAgentCommandGuidance = {
    commands: directAgentCommandLines(),
    suggestions: directAgentCommandSuggestions(),
  };
  const externalAgentsSnippet: ExternalAgentsSnippetGuidance = {
    note: "Optional additive snippet for host-repo `AGENTS.md` files. Keep the repo's own product and coding rules primary; only add this if it fills a real SpM workflow gap.",
    snippetLines: externalAgentsSnippetLines(input.memoryDir, { currentStateStatus }),
  };
  const capabilityRefresh: CapabilityRefreshGuidance = {
    required: toolUpgradeAvailable,
    reason: toolUpgradeAvailable
      ? "The running CLI is newer than the repo's recorded tool version, so repo-local usage guidance may lag the currently installed SpM workflow."
      : undefined,
    actions: toolUpgradeAvailable ? capabilityRefreshLines() : [],
    commands: toolUpgradeAvailable ? capabilityRefreshCommandSuggestions() : [],
    reviewChecks: toolUpgradeAvailable ? capabilityRefreshReviewChecks() : [],
  };
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

  if (refreshed.length > 0) {
    whatChanged.push(`Refreshed ${refreshed.length} deterministic file${refreshed.length === 1 ? "" : "s"} so repo-local guidance and config match the current CLI behavior.`);
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
    remainingWork.push("Before continuing work, refresh the agent's SpM usage policy from the current doctor guidance so newer workflows are used intentionally instead of inherited from stale repo-local artifacts.");
    recommendedCommands.push(
      {
        command: "spm init",
        reason: "Refresh adoption artifacts, recorded tool version, and repo-local agent guidance with the newer installed CLI version.",
      },
      {
        command: "spm doctor",
        reason: "Verify the repo again after the refresh and confirm whether any migration follow-up or usage guidance changed under the newer CLI.",
      },
      {
        command: "spm memory scopes",
        reason: "Inspect the current session and org scope policy before assuming older note-management habits still match this repo's supported workflow.",
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
    workflowLoop,
    doctorModes,
    memoryWorkflow,
    directAgentCommands,
    externalAgentsSnippet,
    capabilityRefresh,
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
    "Reading Doctor Efficiently:",
    ...guidance.doctorModes.preferredModes.map((item) => `- ${item}`),
    "",
    "Doctor Mode Commands:",
    ...guidance.doctorModes.commands.map((item) => `- ${item.command} — ${item.reason}`),
    "",
    "Default workflow loop:",
    ...guidance.workflowLoop.steps.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Workflow loop commands:",
    ...guidance.workflowLoop.commands.map((item) => `- ${item.command} — ${item.reason}`),
    "",
    "Current memory workflow:",
    ...guidance.memoryWorkflow.preferredWorkflows.map((item) => `- ${item}`),
    "",
    "Direct agent commands:",
    ...guidance.directAgentCommands.commands.map((item) => `- ${item}`),
    "",
    "Direct agent command suggestions:",
    ...guidance.directAgentCommands.suggestions.map((item) => `- ${item.command} — ${item.reason}`),
    "",
    "Optional external AGENTS.md snippet:",
    `- ${guidance.externalAgentsSnippet.note}`,
    "```md",
    ...guidance.externalAgentsSnippet.snippetLines,
    "```",
    "",
    "Capability refresh:",
    ...(guidance.capabilityRefresh.required
      ? [
          `- ${guidance.capabilityRefresh.reason ?? "Refresh current SpM usage guidance before continuing work."}`,
          ...guidance.capabilityRefresh.commands.map((item) => `- ${item.command} — ${item.reason}`),
          ...guidance.capabilityRefresh.reviewChecks.map((item) => `- Review: ${item}`),
          ...guidance.capabilityRefresh.actions.map((item) => `- ${item}`),
        ]
      : ["- No version-driven capability refresh is currently required."]),
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
    "Refresh your SpM usage policy from the current `spm doctor --verbose` or `spm doctor --json` output before continuing work, because repo-local guidance may lag the installed CLI.",
    "Re-run `spm init` to refresh deterministic adoption artifacts, missing defaults, and the repo's recorded tool version.",
    "After the refresh, continue with the same SpM workflow loop described above instead of switching to a separate upgrade-only workflow.",
    "Within that same loop, prefer the current scoped-memory workflow (`spm memory note ...`, `spm memory scopes`, and `spm memory consolidate`) instead of raw scoped note-file edits.",
    "Run `spm doctor` again to confirm the repo under the newer guidance before continuing migration work.",
    "If legacy docs are still the source of truth, regenerate the import brief so the current agent sees the newer migration guidance.",
  ];
}

export function doctorModeLines(): string[] {
  return [
    "Use `spm doctor` first for a cheap status, findings, versions, config, and counts check.",
    "Use `spm doctor --verbose` only when you need the long adoption guide, next-command context, or the full direct agent brief in the terminal output.",
    "Use `spm doctor --json` when an agent needs structured findings and guidance instead of scraping human-readable text.",
  ];
}

function doctorModeCommandSuggestions(): AdoptionCommandSuggestion[] {
  return [
    {
      command: "spm doctor",
      reason: "Start with the concise health, version, config, and findings check before reading broader guidance.",
    },
    {
      command: "spm doctor --verbose",
      reason: "Expand into the long adoption guide and inline direct agent brief only when the concise report is not enough.",
    },
    {
      command: "spm doctor --json",
      reason: "Use the structured report when another agent or wrapper should consume findings and guidance without scraping prose.",
    },
  ];
}

function memoryWorkflowLines(): string[] {
  return [
    "Use `spm memory note create` for fast session capture instead of hand-editing `.specpm/memory/...` note files.",
    "Use `spm memory note update`, `archive`, `restore`, and `list` for deterministic scoped note lifecycle management.",
    "Use `spm memory scopes` before assuming that the `session` or `org` scope exists or is writable in this repo.",
    "Use `spm memory consolidate` to promote a session note into durable repo memory; do not treat session notes as canonical project truth.",
  ];
}

function memoryWorkflowCommandSuggestions(): AdoptionCommandSuggestion[] {
  return [
    {
      command: 'spm memory note create --scope session --title "..."',
      reason: "Capture temporary session context through the CLI instead of hand-editing scoped note files.",
    },
    {
      command: "spm memory note list --scope session",
      reason: "Inspect temporary session notes explicitly when resuming context-heavy work.",
    },
    {
      command: "spm memory scopes",
      reason: "Confirm which memory scopes exist in this repo and whether they are writable before assuming a note workflow.",
    },
    {
      command: "spm memory consolidate <NOTE-ID>",
      reason: "Promote a session note into durable repo memory instead of treating session notes as canonical truth.",
    },
  ];
}

export function agentSnippetCommandLines(): string[] {
  return [
    "If you only need the bounded external `AGENTS.md` guidance, run `spm agent snippet` for a narrow read-only surface.",
    "Use `spm agent snippet --json` when wrapper tooling needs the snippet without scraping larger adoption outputs.",
  ];
}

export function agentBriefCommandLines(): string[] {
  return [
    "If you need the current repo workflow without the full adoption guide, run `spm agent brief` for a shorter steady-state surface.",
    "Use `spm agent brief --json` when wrapper tooling needs that workflow surface without scraping human-readable output.",
  ];
}

export function directAgentCommandLines(): string[] {
  return [...agentBriefCommandLines(), ...agentSnippetCommandLines()];
}

function directAgentCommandSuggestions(): AdoptionCommandSuggestion[] {
  return [
    {
      command: "spm agent brief",
      reason: "Use the shorter steady-state workflow surface when you need to know how SpM should be used in this repo today.",
    },
    {
      command: "spm agent brief --json",
      reason: "Use the same steady-state workflow surface in typed form when a wrapper or downstream tool should avoid prose scraping.",
    },
    {
      command: "spm agent snippet",
      reason: "Retrieve only the bounded external AGENTS guidance when the caller does not need the broader adoption or repo-workflow brief.",
    },
    {
      command: "spm agent snippet --json",
      reason: "Return that bounded AGENTS guidance as typed data for wrappers or automation.",
    },
  ];
}

export function workflowLoopLines(memoryDir: string, options: { currentStateStatus: CurrentStateGuidanceStatus }): string[] {
  const currentStateLine =
    options.currentStateStatus === "available"
      ? `Read \`${buildRelativePath(memoryDir, "current.md")}\` for the repo's explicit checkpoint before broad implementation work.`
      : options.currentStateStatus === "missing"
        ? "If `current.md` is still missing, complete adoption with `spm init` or create the first checkpoint with `spm current set` before relying on resume-heavy workflow."
        : "If `current.md` is unreadable, repair its frontmatter and re-run `spm doctor` before relying on resume-heavy workflow.";

  return [
    "Start with `spm status` for a cheap state, version, and findings summary.",
    currentStateLine,
    "If context is broad, stale, or cross-cutting, use `spm memory pack` before diving into code.",
    "If you are resuming context-heavy work, inspect temporary scoped notes with `spm memory note list` instead of assuming they are already reflected in current state.",
    "Use `spm memory consolidate` to promote durable truth instead of treating session notes as canonical project memory.",
  ];
}

function workflowLoopCommandSuggestions(
  memoryDir: string,
  options: { currentStateStatus: CurrentStateGuidanceStatus },
): AdoptionCommandSuggestion[] {
  const currentStateFile = buildRelativePath(memoryDir, "current.md");
  const suggestions: AdoptionCommandSuggestion[] = [
    {
      command: "spm status",
      reason: "Start with the cheapest trustworthy state, version, and findings summary before diving into code or docs.",
    },
    {
      command: `read ${currentStateFile}`,
      reason: "Review the repo's explicit checkpoint before broad implementation work instead of inferring current focus from code alone.",
    },
    {
      command: "spm memory pack",
      reason: "Use the compact repo-aware context pack when the task spans multiple specs, docs, or stale branches of work.",
    },
    {
      command: "spm memory note list --scope session",
      reason: "Check temporary session capture explicitly when resuming context-heavy work instead of assuming it already reached current state.",
    },
    {
      command: "spm memory consolidate <NOTE-ID>",
      reason: "Promote durable truth intentionally instead of treating session notes as canonical project memory.",
    },
  ];

  if (options.currentStateStatus === "missing") {
    suggestions.splice(
      1,
      1,
      {
        command: "spm init",
        reason: "Finish deterministic adoption setup before leaning on a workflow loop that depends on managed current state.",
      },
      {
        command: 'spm current set --focus "..." --summary "..."',
        reason: `Create the first checkpoint in \`${buildRelativePath(memoryDir, "current.md")}\` so resume-heavy work has an explicit repo-local source of truth.`,
      },
    );
  }

  if (options.currentStateStatus === "unreadable") {
    suggestions.splice(1, 1, {
      command: `repair ${currentStateFile}`,
      reason: "Fix the unreadable checkpoint frontmatter and re-run doctor before relying on resume-heavy workflow.",
    });
  }

  return suggestions;
}

function externalAgentsSnippetLines(memoryDir: string, options: { currentStateStatus: CurrentStateGuidanceStatus }): string[] {
  const currentStateFile = buildRelativePath(memoryDir, "current.md");
  const currentStateLine =
    options.currentStateStatus === "available"
      ? `- Read \`${currentStateFile}\` before broad implementation work so you start from the repo's explicit checkpoint.`
      : options.currentStateStatus === "missing"
        ? `- If \`${currentStateFile}\` is missing, run \`spm init\` or create the first checkpoint with \`spm current set\` before relying on resume-heavy workflow.`
        : `- If \`${currentStateFile}\` is unreadable, repair its frontmatter and re-run \`spm doctor\` before relying on resume-heavy workflow.`;

  return [
    "## Optional SpM workflow",
    "- Before multi-step or resume-heavy work, run `spm status`.",
    currentStateLine,
    "- Use `spm memory pack` only when context is broad, stale, or cross-cutting.",
    "- Treat session notes as temporary until promoted with `spm memory consolidate`.",
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

function capabilityRefreshLines(): string[] {
  return [
    "The running CLI is newer than the repo's recorded `tool_version`, so repo-local AGENTS or adoption artifacts may lag the current SpM workflow.",
    "Refresh your SpM usage policy from the current `spm doctor --verbose` or `spm doctor --json` output before continuing work.",
    "After refresh, continue with the same SpM workflow loop described above instead of switching to an upgrade-only workflow.",
    "Within that same loop, prefer the current scoped-memory workflow (`spm memory note ...`, `spm memory scopes`, and `spm memory consolidate`) instead of raw scoped note-file edits.",
    "Re-run `spm init` if you want repo-local adoption artifacts and the recorded tool version refreshed under the newer CLI.",
    "Run `spm doctor` again after the refresh so the repo's guidance and health checks are confirmed under the newer version.",
  ];
}

function capabilityRefreshCommandSuggestions(): AdoptionCommandSuggestion[] {
  return [
    {
      command: "spm doctor --verbose",
      reason: "Refresh the repo's current SpM usage policy from the full human-readable adoption guidance before continuing work.",
    },
    {
      command: "spm doctor --json",
      reason: "Refresh the same usage policy in structured form when a wrapper or downstream tool should avoid prose scraping.",
    },
    {
      command: "spm init",
      reason: "Refresh deterministic adoption artifacts, missing defaults, and the repo's recorded tool version under the newer CLI.",
    },
    {
      command: "spm doctor",
      reason: "Re-check the repo under the refreshed guidance and confirm whether any migration follow-up remains.",
    },
    {
      command: "spm memory scopes",
      reason: "Verify that scoped-memory policy still matches the current CLI instead of assuming older note-management habits remain valid.",
    },
  ];
}

function capabilityRefreshReviewChecks(): string[] {
  return [
    "Confirm the repo's recorded tool version and adoption artifacts now match the newer installed CLI.",
    "Confirm doctor findings still make sense under the refreshed guidance instead of relying on stale repo-local instructions.",
    "Confirm the scoped-memory workflow and note-management policy still match what this repo supports after the upgrade.",
    "Confirm any migration or import guidance handed to another agent was regenerated under the newer CLI if the old guidance was still the source of truth.",
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
    ...input.guidance.doctorModes.preferredModes.map((line) => `- ${line}`),
    "",
    "## Doctor Mode Commands",
    "",
    ...input.guidance.doctorModes.commands.map((item) => `- \`${item.command}\` — ${item.reason}`),
    "",
    "## Default Workflow Loop",
    "",
    ...input.guidance.workflowLoop.steps.map((line, index) => `${index + 1}. ${line}`),
    "",
    "## Workflow Loop Commands",
    "",
    ...input.guidance.workflowLoop.commands.map((item) => `- \`${item.command}\` — ${item.reason}`),
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
    "## Current Memory Workflow",
    "",
    ...input.guidance.memoryWorkflow.preferredWorkflows.map((line) => `- ${line}`),
    "",
    "## Memory Workflow Commands",
    "",
    ...input.guidance.memoryWorkflow.commands.map((item) => `- \`${item.command}\` — ${item.reason}`),
    "",
    "## Direct Agent Commands",
    "",
    ...input.guidance.directAgentCommands.commands.map((line) => `- ${line}`),
    "",
    "## Direct Agent Command Suggestions",
    "",
    ...input.guidance.directAgentCommands.suggestions.map((item) => `- \`${item.command}\` — ${item.reason}`),
    "",
    "## Optional External AGENTS.md Snippet",
    "",
    `- ${input.guidance.externalAgentsSnippet.note}`,
    "",
    "```md",
    ...input.guidance.externalAgentsSnippet.snippetLines,
    "```",
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
    ...(input.guidance.capabilityRefresh.required
      ? [
          ...input.guidance.capabilityRefresh.commands.map((item) => `- \`${item.command}\` — ${item.reason}`),
          "",
          "Review these checks after the refresh:",
          ...input.guidance.capabilityRefresh.reviewChecks.map((item) => `- ${item}`),
          "",
          ...input.guidance.capabilityRefresh.actions.map((line, index) => `${index + 1}. ${line}`),
        ]
      : upgradeFlowLines().map((line, index) => `${index + 1}. ${line}`)),
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
    ...input.guidance.doctorModes.preferredModes.map((line) => `- ${line}`),
    "Doctor mode commands:",
    ...input.guidance.doctorModes.commands.map((line) => `- ${line.command} — ${line.reason}`),
    ...input.guidance.workflowLoop.steps.map((line, index) => `- Loop ${index + 1}: ${line}`),
    "Workflow loop commands:",
    ...input.guidance.workflowLoop.commands.map((item) => `- ${item.command} — ${item.reason}`),
    ...input.guidance.memoryWorkflow.preferredWorkflows.map((line) => `- ${line}`),
    "Scoped memory commands:",
    ...input.guidance.memoryWorkflow.commands.map((item) => `- ${item.command} — ${item.reason}`),
    "Direct agent commands:",
    ...input.guidance.directAgentCommands.commands.map((line) => `- ${line}`),
    "Direct agent command suggestions:",
    ...input.guidance.directAgentCommands.suggestions.map((item) => `- ${item.command} — ${item.reason}`),
    `- If you need to refresh host-repo \`AGENTS.md\`, reuse the bounded SpM snippet from the migration guide instead of inventing parallel wording.`,
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
    ...(input.guidance.capabilityRefresh.required
      ? [
          ...input.guidance.capabilityRefresh.commands.map((item) => `- ${item.command} — ${item.reason}`),
          ...input.guidance.capabilityRefresh.reviewChecks.map((item) => `- Review: ${item}`),
          ...input.guidance.capabilityRefresh.actions.map((line) => `- ${line}`),
        ]
      : upgradeFlowLines().map((line) => `- ${line}`)),
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
